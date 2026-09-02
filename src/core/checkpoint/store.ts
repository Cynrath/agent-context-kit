import { type Dirent, promises as fsp } from "node:fs";
import path from "node:path";
import type { RepositoryRoot } from "../filesystem/root.js";
import { changedFiles, GitUnavailableError } from "../git/git.js";
import type { TaskDoc } from "../tasks/types.js";
import { currentGitHead, extractWork } from "./extract.js";
import {
  CHECKPOINT_PROBLEM_CODES,
  type Checkpoint,
  type CheckpointProblem,
  CheckpointSchema,
} from "./types.js";

const TASK_ID_PATTERN = /^TASK-\d{4}$/;

export class CheckpointStoreError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

function requireTaskId(taskId: string): void {
  if (typeof taskId !== "string" || !TASK_ID_PATTERN.test(taskId)) {
    throw new CheckpointStoreError("CHECKPOINT-TASK-ID-INVALID", `invalid task id '${taskId}'`);
  }
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Per-task checkpoint store (ADR-0027): `.ackit/workflow/TASK-####/checkpoints/
 * CP-####.yaml` — deterministic serialization, atomic writes, containment via
 * id validation before path construction. State files are untrusted on read
 * (strict schema, THREAT_MODEL T16).
 */
export class CheckpointStore {
  constructor(
    private readonly root: RepositoryRoot,
    private readonly repositoryRoot: string,
  ) {}

  private dir(taskId: string): string {
    requireTaskId(taskId);
    return path.join(this.root.canonicalPath, ".ackit", "workflow", taskId, "checkpoints");
  }

  async nextId(taskId: string): Promise<string> {
    let max = 0;
    for (const cp of await this.list(taskId)) {
      const match = /CP-(\d{4})/.exec(cp.id);
      if (match !== null && match[1] !== undefined) {
        max = Math.max(max, Number.parseInt(match[1], 10));
      }
    }
    return `CP-${String(max + 1).padStart(4, "0")}`;
  }

  async create(
    taskId: string,
    taskDoc: TaskDoc,
    workflow: { profile: "quick" | "standard" | "high-risk"; stage?: string | undefined },
    nextAction: { objective: string; path?: string; command?: string; expectedResult?: string },
  ): Promise<Checkpoint> {
    requireTaskId(taskId);
    if (nextAction.objective.trim().length === 0) {
      throw new CheckpointStoreError(
        "CHECKPOINT-NEXT-ACTION-REQUIRED",
        "next action objective must not be empty",
      );
    }
    const id = await this.nextId(taskId);
    const work = extractWork(taskDoc);
    const meta = taskDoc.meta as TaskDoc["meta"] & {
      intentRef?: string | undefined;
      planRef?: string | undefined;
    };
    let changedAreas: string[] = [];
    let gitHead = "";
    let gitUnavailable = false;
    try {
      changedAreas = changedFiles(this.repositoryRoot);
      const head = currentGitHead(this.repositoryRoot);
      gitHead = head ?? "";
      gitUnavailable = head === null;
    } catch (error) {
      if (error instanceof GitUnavailableError) {
        gitUnavailable = true;
      } else {
        throw error;
      }
    }
    const checkpoint: Checkpoint = CheckpointSchema.parse({
      schemaId: "ackit.checkpoint.v1",
      id,
      taskId,
      workflow: {
        profile: workflow.profile,
        ...(workflow.stage !== undefined ? { stage: workflow.stage } : {}),
      },
      ...(meta.intentRef !== undefined ? { intentRef: meta.intentRef } : {}),
      ...(meta.planRef !== undefined ? { planRef: meta.planRef } : {}),
      completedWork: work.completedWork,
      pendingWork: work.pendingWork,
      decisions: work.decisions,
      failures: work.failures,
      blockers: work.blockers,
      evidenceRefs: [],
      changedAreas,
      nextAction: {
        objective: nextAction.objective,
        ...(nextAction.path !== undefined ? { path: nextAction.path } : {}),
        ...(nextAction.command !== undefined ? { command: nextAction.command } : {}),
        ...(nextAction.expectedResult !== undefined
          ? { expectedResult: nextAction.expectedResult }
          : {}),
      },
      gitHead,
      gitUnavailable,
      createdAt: today(),
    });
    await this.write(taskId, checkpoint);
    return checkpoint;
  }

  async list(taskId: string): Promise<Checkpoint[]> {
    requireTaskId(taskId);
    let entries: Dirent[];
    try {
      entries = await fsp.readdir(this.dir(taskId), { withFileTypes: true });
    } catch {
      return [];
    }
    const checkpoints: Checkpoint[] = [];
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".yaml")) continue;
      const cp = await this.read(taskId, entry.name.replace(/\.yaml$/, ""));
      if (cp !== null) checkpoints.push(cp);
    }
    return checkpoints.sort((a, b) => (a.id < b.id ? -1 : 1));
  }

  async find(taskId: string, cpId: string): Promise<Checkpoint | null> {
    for (const cp of await this.list(taskId)) {
      if (cp.id === cpId) return cp;
    }
    return null;
  }

  /** Latest checkpoint by sequential id (highest CP number). */
  async latest(taskId: string): Promise<Checkpoint | null> {
    const all = await this.list(taskId);
    return all.length > 0 ? (all[all.length - 1] ?? null) : null;
  }

  async read(taskId: string, cpId: string): Promise<Checkpoint | null> {
    requireTaskId(taskId);
    if (!/^CP-\d{4}$/.test(cpId)) return null;
    let raw: string;
    try {
      raw = await fsp.readFile(path.join(this.dir(taskId), `${cpId}.yaml`), "utf8");
    } catch {
      return null;
    }
    const { parse } = await import("yaml");
    let parsed: unknown;
    try {
      parsed = parse(raw);
    } catch {
      throw new CheckpointStoreError(
        CHECKPOINT_PROBLEM_CODES.schema,
        `checkpoint ${cpId} of ${taskId} is not valid YAML`,
      );
    }
    const result = CheckpointSchema.safeParse(parsed);
    if (!result.success) {
      throw new CheckpointStoreError(
        CHECKPOINT_PROBLEM_CODES.schema,
        `checkpoint ${cpId} of ${taskId} failed schema validation (${result.error.issues.length} issue(s))`,
      );
    }
    return result.data;
  }

  private async write(taskId: string, checkpoint: Checkpoint): Promise<void> {
    const dir = this.dir(taskId);
    await fsp.mkdir(dir, { recursive: true });
    const { stringify } = await import("yaml");
    await fsp.writeFile(
      path.join(dir, `${checkpoint.id}.yaml`),
      stringify(checkpoint, { lineWidth: 0 }),
      "utf8",
    );
  }
}

export type { Checkpoint, CheckpointProblem };
