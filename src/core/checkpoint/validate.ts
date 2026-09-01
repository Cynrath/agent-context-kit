import { execFileSync } from "node:child_process";
import { changedFiles, GitUnavailableError } from "../git/git.js";
import { currentGitHead } from "./extract.js";
import { CHECKPOINT_PROBLEM_CODES, type Checkpoint, type CheckpointProblem } from "./types.js";

export interface StalenessContext {
  gitHead: string | null;
  changedFiles: string[] | null;
}

/** Collect current git reality; git-unavailable fields are null (never fabricated). */
export function collectStalenessContext(rootPath: string): StalenessContext {
  try {
    return { gitHead: currentGitHead(rootPath), changedFiles: changedFiles(rootPath) };
  } catch (error) {
    if (error instanceof GitUnavailableError) {
      return { gitHead: null, changedFiles: null };
    }
    throw error;
  }
}

function isAncestor(rootPath: string, head: string): boolean {
  try {
    execFileSync("git", ["-C", rootPath, "merge-base", "--is-ancestor", head, "HEAD"], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    return true;
  } catch {
    return false;
  }
}

/** Exact-or-prefix presence (git porcelain collapses untracked dirs). */
function wasRecorded(set: Set<string>, target: string): boolean {
  if (set.has(target)) return true;
  for (const entry of set) {
    if (entry.endsWith("/")) {
      const prefix = entry.slice(0, -1);
      if (target.startsWith(`${prefix}/`)) return true;
    }
  }
  return false;
}

/**
 * Staleness detection (ADR-0027 §4): a checkpoint is stale when its recorded
 * git head is no longer reachable from the current HEAD, or its recorded
 * next-action path no longer appears in the recorded/current changed sets.
 * Deterministic; git-unavailable is an explicit advisory, never a fabricated
 * fresh state (THREAT_MODEL T20).
 */
export function validateCheckpointStaleness(
  checkpoint: Checkpoint,
  rootPath: string,
  current: StalenessContext,
): CheckpointProblem[] {
  const problems: CheckpointProblem[] = [];
  if (current.gitHead === null || current.changedFiles === null) {
    problems.push({
      code: CHECKPOINT_PROBLEM_CODES.gitUnavailable,
      message: `git unavailable — staleness could not be verified for ${checkpoint.taskId}/${checkpoint.id}`,
    });
    return problems;
  }
  if (checkpoint.gitUnavailable || checkpoint.gitHead.length === 0) {
    problems.push({
      code: CHECKPOINT_PROBLEM_CODES.gitUnavailable,
      message: `checkpoint ${checkpoint.taskId}/${checkpoint.id} was recorded without git state — staleness unverifiable`,
    });
    return problems;
  }
  if (checkpoint.gitHead !== current.gitHead && !isAncestor(rootPath, checkpoint.gitHead)) {
    problems.push({
      code: CHECKPOINT_PROBLEM_CODES.stale,
      message: `checkpoint ${checkpoint.taskId}/${checkpoint.id} recorded git head '${checkpoint.gitHead}' which is not reachable from current HEAD '${current.gitHead}'`,
    });
  }
  const recorded = new Set(checkpoint.changedAreas);
  const currentSet = new Set(current.changedFiles);
  // The next-action path is often a FUTURE target (not yet in the changed set),
  // so it can never be stale merely by being absent. Staleness applies only
  // when the path was recorded as changed at checkpoint time and has since
  // vanished from the current working state. Untracked-dir collapsing means
  // recorded/current entries may be directory prefixes — prefix matching
  // counts as presence (deterministic, no git re-invocation).
  if (
    checkpoint.nextAction.path !== undefined &&
    wasRecorded(recorded, checkpoint.nextAction.path)
  ) {
    if (!wasRecorded(currentSet, checkpoint.nextAction.path)) {
      problems.push({
        code: CHECKPOINT_PROBLEM_CODES.stale,
        message: `checkpoint ${checkpoint.taskId}/${checkpoint.id} next-action path '${checkpoint.nextAction.path}' was in the recorded changed set but is no longer part of the current working state`,
      });
    }
  }
  return problems;
}
