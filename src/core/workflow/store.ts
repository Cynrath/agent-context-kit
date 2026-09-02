import { type Dirent, promises as fsp } from "node:fs";
import path from "node:path";
import type { RepositoryRoot } from "../filesystem/root.js";
import { getProfile } from "./profiles.js";
import {
  type StageHistoryEntry,
  type VerificationAttempt,
  WORKFLOW_PROFILES,
  WORKFLOW_SCHEMA_ID,
  type WorkflowProblem,
  type WorkflowProfileId,
  type WorkflowStage,
  WorkflowStateSchema,
} from "./types.js";

/** Root of all per-task workflow state (gitignored local state, ADR-0027). */
export const WORKFLOW_STATE_DIR = "workflow";

const TASK_ID_PATTERN = /^TASK-\d{4}$/;

/** Stable advisory code for out-of-order/invalid transitions (ADR-0025 §3). */
export const WORKFLOW_STAGE_INVALID = "WORKFLOW_STAGE_INVALID";

export class WorkflowStoreError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function requireTaskId(taskId: string): void {
  if (typeof taskId !== "string" || !TASK_ID_PATTERN.test(taskId)) {
    throw new WorkflowStoreError("WORKFLOW-TASK-ID-INVALID", `invalid task id '${taskId}'`);
  }
}

/**
 * Per-task workflow state store (ADR-0025/0027): deterministic YAML under
 * `.ackit/workflow/TASK-####/state.yaml`. Mirrors TaskStore patterns — strict
 * validation, contained writes, stable key order. State files are untrusted
 * input on read (THREAT_MODEL T16).
 */
export class WorkflowStore {
  constructor(private readonly root: RepositoryRoot) {}

  private dir(taskId: string): string {
    requireTaskId(taskId);
    return path.join(this.root.canonicalPath, ".ackit", WORKFLOW_STATE_DIR, taskId);
  }

  private file(taskId: string): string {
    return path.join(this.dir(taskId), "state.yaml");
  }

  /** True when the task has workflow state (the "workflow-enabled" switch). */
  async exists(taskId: string): Promise<boolean> {
    try {
      await fsp.access(this.file(taskId));
      return true;
    } catch {
      return false;
    }
  }

  async load(taskId: string): Promise<WorkflowStateLoaded | null> {
    requireTaskId(taskId);
    let raw: string;
    try {
      raw = await fsp.readFile(this.file(taskId), "utf8");
    } catch {
      return null;
    }
    const { parse } = await import("yaml");
    let parsed: unknown;
    try {
      parsed = parse(raw);
    } catch (error) {
      throw new WorkflowStoreError(
        "WORKFLOW-STATE-UNPARSABLE",
        `workflow state for ${taskId} is not valid YAML (${(error as Error).message})`,
      );
    }
    const result = WorkflowStateSchema.safeParse(parsed);
    if (!result.success) {
      throw new WorkflowStoreError(
        "WORKFLOW-STATE-INVALID",
        `workflow state for ${taskId} failed schema validation (${result.error.issues.length} issue(s))`,
      );
    }
    return result.data;
  }

  /** Explicit profile selection (machine-readable, ADR-0025 §1). */
  async setProfile(
    taskId: string,
    profile: WorkflowProfileId,
    options: { entry?: WorkflowStage | undefined } = {},
  ): Promise<WorkflowStateLoaded> {
    if (!(WORKFLOW_PROFILES as readonly string[]).includes(profile)) {
      throw new WorkflowStoreError(
        "WORKFLOW-PROFILE-UNKNOWN",
        `unknown workflow profile '${profile}'`,
      );
    }
    const definition = getProfile(profile);
    const entry = options.entry ?? definition.entryStage;
    if (!definition.stages.includes(entry)) {
      throw new WorkflowStoreError(
        WORKFLOW_STAGE_INVALID,
        `stage '${entry}' is not part of profile '${profile}'`,
      );
    }
    const now = today();
    const existing = await this.load(taskId);
    const history: StageHistoryEntry[] =
      existing !== null && existing.profile === profile
        ? existing.stageHistory
        : [{ stage: entry, enteredAt: now }];
    const state: WorkflowStateLoaded = {
      schemaId: WORKFLOW_SCHEMA_ID,
      taskId,
      profile,
      stage: existing !== null && existing.profile === profile ? existing.stage : entry,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      stageHistory: history.slice(-64),
      verificationAttempts: existing?.verificationAttempts ?? [],
    };
    await this.write(taskId, state);
    return state;
  }

  /**
   * Record a verification attempt (verify/fix loop, ADR-0025 §3): `fail`
   * rewinds the stage to `implement` deterministically; `pass` records the
   * outcome without moving the stage (advancement stays explicit).
   */
  async recordVerificationAttempt(
    taskId: string,
    outcome: "pass" | "fail",
  ): Promise<WorkflowStateLoaded> {
    const state = await this.requireState(taskId);
    const definition = getProfile(state.profile);
    const attempts: VerificationAttempt[] = [
      ...state.verificationAttempts,
      {
        recordedAt: today(),
        outcome,
      },
    ].slice(-64);
    const stage: WorkflowStage = outcome === "fail" ? "implement" : state.stage;
    const rewindHistory: StageHistoryEntry[] =
      outcome === "fail" && state.stage !== "implement"
        ? [...state.stageHistory, { stage: "implement" as const, enteredAt: today() }].slice(-64)
        : state.stageHistory;
    if (outcome === "fail" && !definition.stages.includes("implement")) {
      throw new WorkflowStoreError(
        WORKFLOW_STAGE_INVALID,
        `profile '${state.profile}' has no implement stage to rewind to`,
      );
    }
    const updated: WorkflowStateLoaded = {
      ...state,
      stage,
      stageHistory: rewindHistory,
      verificationAttempts: attempts,
      updatedAt: today(),
    };
    await this.write(taskId, updated);
    return updated;
  }

  /** Append a stage transition (validated forward-only by the caller). */
  async advanceTo(taskId: string, to: WorkflowStage): Promise<WorkflowStateLoaded> {
    const state = await this.requireState(taskId);
    const definition = getProfile(state.profile);
    if (!definition.stages.includes(to)) {
      throw new WorkflowStoreError(
        WORKFLOW_STAGE_INVALID,
        `stage '${to}' is not part of profile '${state.profile}'`,
      );
    }
    const fromIndex = definition.stages.indexOf(state.stage);
    const toIndex = definition.stages.indexOf(to);
    if (toIndex !== fromIndex + 1) {
      throw new WorkflowStoreError(
        WORKFLOW_STAGE_INVALID,
        `cannot advance '${state.profile}' from '${state.stage}' to '${to}' (forward-only, adjacent stages)`,
      );
    }
    const updated: WorkflowStateLoaded = {
      ...state,
      stage: to,
      stageHistory: [...state.stageHistory, { stage: to, enteredAt: today() }].slice(-64),
      updatedAt: today(),
    };
    await this.write(taskId, updated);
    return updated;
  }

  /** All tasks with workflow state (deterministic id order). */
  async listTaskIds(): Promise<string[]> {
    const base = path.join(this.root.canonicalPath, ".ackit", WORKFLOW_STATE_DIR);
    let entries: Dirent[];
    try {
      entries = await fsp.readdir(base, { withFileTypes: true });
    } catch {
      return [];
    }
    const ids: string[] = [];
    for (const entry of entries) {
      if (entry.isDirectory() && TASK_ID_PATTERN.test(entry.name)) ids.push(entry.name);
    }
    return ids.sort();
  }

  private async requireState(taskId: string): Promise<WorkflowStateLoaded> {
    const state = await this.load(taskId);
    if (state === null) {
      throw new WorkflowStoreError(
        "WORKFLOW-STATE-MISSING",
        `task '${taskId}' has no workflow state; run 'ackit workflow set' first`,
      );
    }
    return state;
  }

  private async write(taskId: string, state: WorkflowStateLoaded): Promise<void> {
    const dir = this.dir(taskId);
    await fsp.mkdir(dir, { recursive: true });
    const { stringify } = await import("yaml");
    const yaml = stringify(state, { lineWidth: 0 });
    await fsp.writeFile(this.file(taskId), `${yaml}`, "utf8");
  }
}

export type WorkflowStateLoaded = {
  schemaId: typeof WORKFLOW_SCHEMA_ID;
  taskId: string;
  profile: WorkflowProfileId;
  stage: WorkflowStage;
  createdAt: string;
  updatedAt: string;
  stageHistory: StageHistoryEntry[];
  verificationAttempts: VerificationAttempt[];
};

export type { WorkflowProblem };
