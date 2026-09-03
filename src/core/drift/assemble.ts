import { execFileSync } from "node:child_process";
import { promises as fsp } from "node:fs";
import path from "node:path";
import {
  CheckpointStore,
  collectStalenessContext,
  validateCheckpointStaleness,
} from "../checkpoint/index.js";
import { loadAckitConfig } from "../config/index.js";
import { EvidenceStore } from "../evidence/index.js";
import { resolveRepositoryRoot } from "../filesystem/root.js";
import { changedFiles } from "../git/git.js";
import { TaskStore } from "../tasks/store.js";
import {
  requiredArtifacts as requiredArtifactsFor,
  resolveProfileRequirements,
  workflowOverridesFromConfig,
} from "../workflow/index.js";
import type { DriftInput } from "./check.js";

/**
 * Canonical drift input assembler (TASK-0070): the ONE place where repository
 * state becomes a `DriftInput`. The CLI (`ackit drift check`) and the MCP
 * `ackit_drift_check` tool both read through here — same repository state +
 * same supported input ⇒ same semantic findings (codes/severities/order from
 * the single `detectWorkflowDrift` core). No duplicate business logic.
 *
 * Assembly semantics (frozen CLI behavior, now shared):
 * - `existingArtifacts`: task always; intent/spec/plan from task declarations;
 *   evidence via registry loader; verdict via latest-verdict summary.
 * - `referencePathsExist`: declared spec/decision/plan refs resolved on disk
 *   (absent → drift flags `PLAN_REFERENCE_MISSING` warning).
 * - `checkpoint` + `checkpointProblems`: latest checkpoint with full staleness
 *   validation (MCP previously passed `[]` — now included).
 * - `changedFiles`: expanded working set (untracked-dir collapsed porcelain
 *   entries expanded via `git ls-files` — MCP previously used the raw set).
 * - `requiresVerdict`: effective workflow-config requirement (TASK-0067
 *   additive-only); absent config preserves the built-in default.
 *
 * Read-only: never writes. Exit/`--ci` semantics stay CLI-only (MCP returns
 * the findings JSON; no exit codes over the tool boundary) — the one
 * deliberate, documented difference.
 */
export async function assembleDriftInput(
  repositoryRoot: string,
  taskId: string,
): Promise<{ ok: true; input: DriftInput } | { ok: false; code: string; message: string }> {
  const rootResolution = await resolveRepositoryRoot(repositoryRoot);
  if (!rootResolution.ok) {
    return { ok: false, code: "environment-error", message: rootResolution.diagnostic.message };
  }
  const root = rootResolution.root;
  const rootPath = root.canonicalPath;
  const tasks = new TaskStore(rootPath);
  const found = await tasks.find(taskId);
  if (found === null)
    return { ok: false, code: "drift-error", message: `unknown task '${taskId}'` };

  const { WorkflowStore } = await import("../workflow/index.js");
  const wfState = await new WorkflowStore(root).load(taskId);

  const existingArtifacts: string[] = ["task"];
  const metaExtra = found.doc.meta as {
    intentRef?: string | undefined;
    specRefs?: string[] | undefined;
    decisionRefs?: string[] | undefined;
    planRef?: string | undefined;
  };
  if (metaExtra.intentRef !== undefined) existingArtifacts.push("intent");
  if (metaExtra.specRefs !== undefined && metaExtra.specRefs.length > 0)
    existingArtifacts.push("spec");
  if (metaExtra.planRef !== undefined && metaExtra.planRef.length > 0)
    existingArtifacts.push("plan");

  let evidence = null;
  try {
    evidence = await new EvidenceStore(root).load(taskId);
    if (evidence !== null) existingArtifacts.push("evidence");
  } catch {
    evidence = null;
  }

  let latestVerdict: { verdict: string } | null = null;
  try {
    const { VerdictStore } = await import("../verification/index.js");
    latestVerdict = await new VerdictStore(rootPath).latestVerdictSummary(taskId);
    if (latestVerdict !== null) existingArtifacts.push("verdict");
  } catch {
    latestVerdict = null;
  }

  const checkpoints = new CheckpointStore(root, rootPath);
  const checkpoint = await checkpoints.latest(taskId);
  const checkpointProblems =
    checkpoint !== null
      ? validateCheckpointStaleness(checkpoint, rootPath, collectStalenessContext(rootPath))
      : [];

  let gitChanged: string[] = [];
  try {
    gitChanged = expandChangedFiles(rootPath);
  } catch {
    gitChanged = [];
  }

  const dependencies: { id: string; completed: boolean }[] = [];
  for (const dep of found.doc.meta.dependencies) {
    const depFound = await tasks.find(dep);
    dependencies.push({ id: dep, completed: depFound?.doc.meta.status === "completed" });
  }

  const referencePathsExist: string[] = [];
  for (const ref of [
    ...(metaExtra.specRefs ?? []),
    ...(metaExtra.decisionRefs ?? []),
    ...(metaExtra.planRef !== undefined ? [metaExtra.planRef] : []),
  ]) {
    try {
      await fsp.access(path.resolve(rootPath, ...ref.split("/")));
      referencePathsExist.push(ref);
    } catch {
      // absent → not listed (drift flags PLAN_REFERENCE_MISSING warning)
    }
  }

  const required =
    wfState !== null ? requiredArtifactsFor(wfState.profile, wfState.stage).artifacts : [];

  let effectiveRequiresVerdict: boolean | undefined;
  try {
    const configResult = await loadAckitConfig(rootPath, {});
    if (configResult.ok && wfState !== null) {
      effectiveRequiresVerdict = resolveProfileRequirements(
        wfState.profile,
        workflowOverridesFromConfig(configResult.config),
      ).requiresVerdict;
    }
  } catch {
    effectiveRequiresVerdict = undefined;
  }

  return {
    ok: true,
    input: {
      taskId,
      taskDoc: found.doc,
      workflow: wfState !== null ? { profile: wfState.profile, stage: wfState.stage } : null,
      requiredArtifacts: required,
      existingArtifacts,
      referencePathsExist,
      evidence,
      latestVerdict,
      checkpoint,
      checkpointProblems,
      changedFiles: gitChanged,
      dependencies,
      ...(effectiveRequiresVerdict !== undefined
        ? { requiresVerdict: effectiveRequiresVerdict }
        : {}),
    },
  };
}

/**
 * Deterministic expanded working set for drift: tracked modifications +
 * staged files + every untracked file (not collapsed directories). Same
 * read-only git runner posture as core/git.
 */
export function expandChangedFiles(rootPath: string): string[] {
  const base = changedFiles(rootPath);
  const set = new Set<string>();
  for (const file of base) {
    if (file.endsWith("/")) {
      const out = execFileSync(
        "git",
        ["-C", rootPath, "ls-files", "--others", "--exclude-standard", "--", file],
        { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
      );
      for (const line of out.split("\n")) {
        if (line.trim().length > 0) set.add(line.trim().split("\\").join("/"));
      }
    } else {
      set.add(file);
    }
  }
  return [...set].sort();
}
