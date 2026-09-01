import { type Dirent, promises as fsp } from "node:fs";
import path from "node:path";
import type { EvidenceRegistry } from "../evidence/types.js";
import {
  VERDICT_PROBLEM_CODES,
  type Verdict,
  type VerdictProblem,
  VerdictSchema,
} from "./verdict.js";

const TASK_ID_PATTERN = /^TASK-\d{4}$/;

export class VerdictStoreError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

function requireTaskId(taskId: string): void {
  if (typeof taskId !== "string" || !TASK_ID_PATTERN.test(taskId)) {
    throw new VerdictStoreError("VERDICT-TASK-ID-INVALID", `invalid task id '${taskId}'`);
  }
}

/**
 * Append-only verdict store (ADR-0026 §4): `.ackit/workflow/TASK-####/verdicts/
 * VR-####.yaml`. Latest registered verdict governs; history is preserved.
 * Registration validates structure AND references (task existence handled by
 * the CLI caller; criterion existence against the evidence registry).
 */
export class VerdictStore {
  constructor(
    private readonly repositoryRoot: string,
    private readonly taskExists?: (taskId: string) => Promise<boolean>,
  ) {}

  private dir(taskId: string): string {
    requireTaskId(taskId);
    return path.join(this.repositoryRoot, ".ackit", "workflow", taskId, "verdicts");
  }

  async list(taskId: string): Promise<Verdict[]> {
    requireTaskId(taskId);
    let entries: Dirent[];
    try {
      entries = await fsp.readdir(this.dir(taskId), { withFileTypes: true });
    } catch {
      return [];
    }
    const verdicts: Verdict[] = [];
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".yaml")) continue;
      const v = await this.read(taskId, entry.name.replace(/\.yaml$/, ""));
      if (v !== null) verdicts.push(v);
    }
    return verdicts.sort((a, b) => (a.id < b.id ? -1 : 1));
  }

  async latest(taskId: string): Promise<Verdict | null> {
    const all = await this.list(taskId);
    return all.length > 0 ? (all[all.length - 1] ?? null) : null;
  }

  async read(taskId: string, verdictId: string): Promise<Verdict | null> {
    requireTaskId(taskId);
    if (!/^VR-\d{4}$/.test(verdictId)) return null;
    let raw: string;
    try {
      raw = await fsp.readFile(path.join(this.dir(taskId), `${verdictId}.yaml`), "utf8");
    } catch {
      return null;
    }
    const { parse } = await import("yaml");
    let parsed: unknown;
    try {
      parsed = parse(raw);
    } catch {
      throw new VerdictStoreError(
        VERDICT_PROBLEM_CODES.schema,
        `verdict ${verdictId} is not valid YAML`,
      );
    }
    const result = VerdictSchema.safeParse(parsed);
    if (!result.success) {
      throw new VerdictStoreError(
        VERDICT_PROBLEM_CODES.schema,
        `verdict ${verdictId} failed schema validation (${result.error.issues.length} issue(s))`,
      );
    }
    return result.data;
  }

  /**
   * Register a verdict: validate structure + references, reject blocking
   * findings on PASS-family verdicts, then persist append-only with the next
   * sequential VR id. The INPUT verdict carries no id (agents author
   * verdicts); the store allocates it deterministically.
   */
  async register(
    taskId: string,
    input: unknown,
    options: {
      taskExists?: (taskId: string) => Promise<boolean> | undefined;
      evidenceRegistry?: EvidenceRegistry | null | undefined;
    } = {},
  ): Promise<Verdict> {
    requireTaskId(taskId);
    // Structural validation with the id injected as the next sequential id.
    const nextId = `VR-${String((await this.list(taskId)).length + 1).padStart(4, "0")}`;
    const candidate = { ...(input as Record<string, unknown>), id: nextId, taskId };
    const result = VerdictSchema.safeParse(candidate);
    if (!result.success) {
      throw new VerdictStoreError(
        VERDICT_PROBLEM_CODES.schema,
        `verdict failed schema validation (${result.error.issues.length} issue(s))`,
      );
    }
    const verdict = result.data;
    // Reference validation: task must exist.
    const exists = options.taskExists ?? this.taskExists;
    if (exists !== undefined) {
      const ok = await exists(taskId);
      if (!ok) {
        throw new VerdictStoreError(
          VERDICT_PROBLEM_CODES.taskUnknown,
          `task '${taskId}' does not exist — cross-repository verdicts are refused`,
        );
      }
    }
    // Reference validation: criterion ids must exist in the evidence registry
    // when a registry exists (forged criteria rejected).
    if (options.evidenceRegistry !== null && options.evidenceRegistry !== undefined) {
      const known = new Set(options.evidenceRegistry.criteria.map((c) => c.id));
      const referenced = new Set<string>();
      for (const finding of verdict.findings) {
        if (finding.criterion !== undefined) referenced.add(finding.criterion);
      }
      for (const id of verdict.checkedCriteria) referenced.add(id);
      for (const id of referenced) {
        if (!known.has(id)) {
          throw new VerdictStoreError(
            VERDICT_PROBLEM_CODES.criterionUnknown,
            `criterion '${id}' does not exist in the evidence registry of '${taskId}' (forged criteria are rejected)`,
          );
        }
      }
    }
    // Consistency: PASS-family verdicts cannot carry blocking findings.
    const hasBlocking = verdict.findings.some((f) => f.severity === "blocking");
    if (hasBlocking && (verdict.verdict === "PASS" || verdict.verdict === "PASS_WITH_WARNINGS")) {
      throw new VerdictStoreError(
        VERDICT_PROBLEM_CODES.blockingOnPass,
        `verdict '${verdict.verdict}' cannot carry blocking findings — emit REWORK_REQUIRED instead`,
      );
    }
    const dir = this.dir(taskId);
    await fsp.mkdir(dir, { recursive: true });
    const { stringify } = await import("yaml");
    await fsp.writeFile(
      path.join(dir, `${verdict.id}.yaml`),
      stringify(verdict, { lineWidth: 0 }),
      "utf8",
    );
    return verdict;
  }

  /** Latest verdict summary for gates (drift/completion). */
  async latestVerdictSummary(taskId: string): Promise<{ verdict: string } | null> {
    const latest = await this.latest(taskId);
    return latest === null ? null : { verdict: latest.verdict };
  }
}

export type { Verdict, VerdictProblem };
