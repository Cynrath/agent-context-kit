import { type Dirent, promises as fsp } from "node:fs";
import path from "node:path";
import type { EvidenceRegistry } from "../evidence/types.js";
import {
  type BindingComponentName,
  type ComputedStateBinding,
  compareStoredBinding,
  computeStateBinding,
  StateBindingError,
} from "./binding.js";
import {
  type BoundVerdict,
  isBoundVerdict,
  VERDICT_PROBLEM_CODES,
  VERDICT_SCHEMA_ID_V2,
  type Verdict,
  type VerdictProblem,
  type VerdictRecord,
  VerdictSchema,
  VerdictV2Schema,
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
 * Append-only verdict store (ADR-0026 §4, ADR-0030): `.ackit/workflow/
 * TASK-####/verdicts/VR-####.yaml`. Latest registered verdict governs;
 * history is preserved. Registration validates structure AND references
 * (task existence handled by the CLI caller; criterion existence against
 * the evidence registry). Stored verdicts are v2 (state-bound); legacy v1
 * files stay readable as history via `list`/`read` but never satisfy a
 * state-bound completion requirement.
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

  async list(taskId: string): Promise<VerdictRecord[]> {
    requireTaskId(taskId);
    let entries: Dirent[];
    try {
      entries = await fsp.readdir(this.dir(taskId), { withFileTypes: true });
    } catch {
      return [];
    }
    const verdicts: VerdictRecord[] = [];
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".yaml")) continue;
      const v = await this.read(taskId, entry.name.replace(/\.yaml$/, ""));
      if (v !== null) verdicts.push(v);
    }
    return verdicts.sort((a, b) => (a.id < b.id ? -1 : 1));
  }

  async latest(taskId: string): Promise<VerdictRecord | null> {
    const all = await this.list(taskId);
    return all.length > 0 ? (all[all.length - 1] ?? null) : null;
  }

  async read(taskId: string, verdictId: string): Promise<VerdictRecord | null> {
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
    // Dispatch on schema id: bound v2 records validate against the v2
    // schema; everything else follows the legacy v1 path (unknown schema
    // ids fail v1 validation with VERDICT-INVALID, as before).
    const schemaId = (parsed as { schemaId?: unknown } | null)?.schemaId;
    if (schemaId === VERDICT_SCHEMA_ID_V2) {
      const bound = VerdictV2Schema.safeParse(parsed);
      if (!bound.success) {
        throw new VerdictStoreError(
          VERDICT_PROBLEM_CODES.schema,
          `verdict ${verdictId} failed schema validation (${bound.error.issues.length} issue(s))`,
        );
      }
      return bound.data;
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
   * findings on PASS-family verdicts, bind the CURRENT state (computed by
   * the caller — never trusted from input), then persist append-only as a
   * v2 record with the next sequential VR id. The INPUT verdict carries no
   * id and no binding (agents author binding-free v1 verdicts); the store
   * allocates both deterministically.
   */
  async register(
    taskId: string,
    input: unknown,
    options: {
      taskExists?: (taskId: string) => Promise<boolean> | undefined;
      evidenceRegistry?: EvidenceRegistry | null | undefined;
      /** CURRENT state binding (required: new registrations are bound). */
      binding?: ComputedStateBinding | undefined;
    } = {},
  ): Promise<BoundVerdict> {
    requireTaskId(taskId);
    // Structural validation with the id injected as the next sequential id.
    // The input schema is strict v1: a self-declared `binding` (or any other
    // unknown key) fails here with VERDICT-INVALID — self-declared hashes
    // are never trusted.
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
    // Binding precondition (ADR-0030 §13): new registrations are bound to
    // CURRENT state computed by the caller — never trusted from input (the
    // strict input schema above already refused self-declared bindings).
    if (options.binding === undefined) {
      throw new VerdictStoreError(
        VERDICT_PROBLEM_CODES.bindingMissing,
        `verdict registration requires the current state binding — recompute it and retry (stale or self-declared bindings are refused)`,
      );
    }
    if (options.binding.taskId !== taskId) {
      throw new VerdictStoreError(
        VERDICT_PROBLEM_CODES.bundleMismatch,
        `state binding targets '${options.binding.taskId}', not '${taskId}' (cross-task bindings are refused)`,
      );
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
    const bound: BoundVerdict = VerdictV2Schema.parse({
      ...verdict,
      schemaId: VERDICT_SCHEMA_ID_V2,
      binding: {
        version: options.binding.version,
        stateDigest: options.binding.stateDigest,
        bundleDigest: options.binding.bundleDigest,
        components: options.binding.components,
        gitUnavailable: options.binding.gitUnavailable,
      },
    });
    const { stringify } = await import("yaml");
    await fsp.writeFile(
      path.join(dir, `${bound.id}.yaml`),
      stringify(bound, { lineWidth: 0 }),
      "utf8",
    );
    return bound;
  }

  /**
   * Latest-verdict trust summary for gates (drift/completion/CLI).
   * Registration validation alone is insufficient (state may change after a
   * valid verdict is recorded), so consumers recompute the CURRENT binding
   * here and learn whether the latest verdict is still fresh. Read-only and
   * deterministic. A stale PASS-family verdict must not satisfy completion.
   */
  async latestVerdictSummary(taskId: string): Promise<VerdictFreshness | null> {
    const latest = await this.latest(taskId);
    if (latest === null) return null;
    if (!isBoundVerdict(latest)) {
      // Legacy unbound v1: readable history, never silently fresh-bound.
      return {
        verdict: latest.verdict,
        bound: false,
        fresh: false,
        problemCode: VERDICT_PROBLEM_CODES.bindingMissing,
        changed: [],
        gitUnavailable: false,
      };
    }
    let current: ComputedStateBinding;
    try {
      current = await computeStateBinding(this.repositoryRoot, taskId);
    } catch (error) {
      const code =
        error instanceof StateBindingError ? error.code : VERDICT_PROBLEM_CODES.bindingMissing;
      return {
        verdict: latest.verdict,
        bound: true,
        fresh: false,
        problemCode: code,
        changed: [],
        gitUnavailable: latest.binding.gitUnavailable,
      };
    }
    const { fresh, changed } = compareStoredBinding(latest.binding, current);
    return {
      verdict: latest.verdict,
      bound: true,
      fresh,
      problemCode: fresh ? null : VERDICT_PROBLEM_CODES.stateStale,
      changed,
      gitUnavailable: latest.binding.gitUnavailable,
    };
  }
}

/** Trust state of the latest verdict (completion-gate input, ADR-0030). */
export interface VerdictFreshness {
  verdict: string;
  /** False for legacy unbound v1 records. */
  bound: boolean;
  /** False when the bound state no longer matches current state. */
  fresh: boolean;
  /** Stable diagnostic code, or null when fresh. */
  problemCode: string | null;
  /** Bound component classes that changed (empty when fresh/unbound). */
  changed: BindingComponentName[];
  /** Registration-time degraded-git marker from the stored binding. */
  gitUnavailable: boolean;
}

export type { BoundVerdict, Verdict, VerdictProblem, VerdictRecord };
