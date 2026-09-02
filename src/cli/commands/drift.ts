import { execFileSync } from "node:child_process";
import { promises as fsp } from "node:fs";
import path from "node:path";
import process from "node:process";
import type { Command } from "commander";
import {
  CheckpointStore,
  collectStalenessContext,
  validateCheckpointStaleness,
} from "../../core/checkpoint/index.js";
import { type DriftFinding, detectWorkflowDrift } from "../../core/drift/index.js";
import { EvidenceStore } from "../../core/evidence/index.js";
import { resolveRepositoryRoot } from "../../core/filesystem/root.js";
import { changedFiles } from "../../core/git/git.js";
import { TaskStore } from "../../core/tasks/index.js";
import {
  requiredArtifacts as requiredArtifactsFor,
  WorkflowStore,
} from "../../core/workflow/index.js";
import { emitDiagnostic } from "../../shared/diagnostics.js";
import { EXIT_CODES, type ExitCodeValue } from "../../shared/exit-codes.js";
import type { CliInvocation, GlobalOptions } from "../context.js";

interface DriftCommandBase {
  root?: string | undefined;
  json: boolean;
  quiet: boolean;
  debug?: boolean | undefined;
  ci?: boolean | undefined;
}

function emitJson(payload: Record<string, unknown>): void {
  process.stdout.write(
    `${JSON.stringify(
      {
        schemaVersion: "ackit.drift-report.v1",
        tool: "ackit",
        command: "drift check",
        ...payload,
      },
      null,
      2,
    )}\n`,
  );
}

/**
 * Deterministic expanded working set for drift: tracked modifications +
 * staged files + every untracked file (not collapsed directories). Uses the
 * same read-only git runner posture as core/git; git-unavailable throws to the
 * caller which records an empty set with an explicit diagnostic.
 */
function expandChangedFiles(rootPath: string): string[] {
  const base = changedFiles(rootPath);
  const set = new Set<string>();
  for (const file of base) {
    if (file.endsWith("/")) {
      // Untracked directory collapsed by porcelain: expand via ls-files.
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

/**
 * `ackit drift check <TASK-ID> [--ci]` — deterministic workflow drift report.
 * Blocking findings fail with exit 1 under --ci (gate) and are always visible.
 */
export async function runDriftCheckCommand(
  base: DriftCommandBase,
  taskId: string,
): Promise<ExitCodeValue> {
  const rootRequested = path.resolve(base.root ?? process.cwd());
  const rootResolution = await resolveRepositoryRoot(rootRequested);
  if (!rootResolution.ok) {
    emitDiagnostic(
      { code: "environment-error", message: rootResolution.diagnostic.message },
      { quiet: base.quiet, debug: base.debug ?? false },
    );
    return EXIT_CODES.environment;
  }
  const root = rootResolution.root;
  const rootPath = root.canonicalPath;
  const tasks = new TaskStore(rootPath);
  const found = await tasks.find(taskId);
  if (found === null) {
    emitDiagnostic(
      { code: "drift-error", message: `unknown task '${taskId}'` },
      { quiet: base.quiet, debug: base.debug ?? false },
    );
    return EXIT_CODES.usage;
  }

  const workflowStore = new WorkflowStore(root);
  const wfState = await workflowStore.load(taskId);

  // Assemble deterministic inputs (absence = null/[]; never fabricated).
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
    const { VerdictStore } = await import("../../core/verification/index.js");
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
    // Expand the working set so directory-collapsed porcelain entries
    // (`docs/`, `src/`) become concrete files — deterministic and precise.
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
      // absent → not listed (drift will flag it)
    }
  }

  const required =
    wfState !== null ? requiredArtifactsFor(wfState.profile, wfState.stage).artifacts : [];

  const findings: DriftFinding[] = detectWorkflowDrift({
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
  });

  const blocking = findings.filter((f) => f.severity === "blocking");
  if (base.json) {
    emitJson({ task: taskId, findings, blocking: blocking.length });
  } else if (!base.quiet) {
    if (findings.length === 0) {
      process.stdout.write(`${taskId}: no drift findings\n`);
    } else {
      for (const finding of findings) {
        process.stdout.write(
          `${finding.severity === "blocking" ? "BLOCKING" : "warning"} ${finding.code} ${finding.taskId}: ${finding.detail}\n`,
        );
      }
    }
  }
  return base.ci === true && blocking.length > 0 ? EXIT_CODES.thresholdExceeded : EXIT_CODES.ok;
}

export function registerDriftCommands(program: Command, invocation: CliInvocation): void {
  const driftCommand = program
    .command("drift")
    .description("deterministic workflow drift detection");
  driftCommand
    .command("check")
    .description("check one task for workflow drift findings")
    .argument("<taskId>")
    .option("--ci", "exit 1 when blocking findings exist (gate mode)", false)
    .action(async (taskId: string, opts: { ci?: boolean }) => {
      const parentOptions = (program.opts() ?? {}) as Partial<GlobalOptions>;
      invocation.exitCode = await runDriftCheckCommand(
        {
          root: parentOptions.root,
          json: parentOptions.json ?? false,
          quiet: parentOptions.quiet ?? false,
          ci: opts.ci ?? false,
        },
        taskId,
      );
    });
  // preCommit lifecycle gate entry (ADR-0028 §3): invoked by the managed
  // pre-commit block. Resolves the single active WORKFLOW task and gates on
  // blocking drift; a clean no-op (exit 0) when no workflow task is active —
  // legacy repositories keep the pre-expansion commit experience.
  driftCommand
    .command("check-active")
    .description("gate the active workflow task on blocking drift (managed pre-commit entry)")
    .option("--ci", "exit 1 when blocking findings exist (gate mode)", false)
    .action(async (opts: { ci?: boolean }) => {
      const parentOptions = (program.opts() ?? {}) as Partial<GlobalOptions>;
      const base = {
        root: parentOptions.root,
        json: parentOptions.json ?? false,
        quiet: parentOptions.quiet ?? false,
        ci: opts.ci ?? false,
      };
      const rootRequested = path.resolve(base.root ?? process.cwd());
      const rootResolution = await resolveRepositoryRoot(rootRequested);
      if (!rootResolution.ok) {
        emitDiagnostic(
          { code: "environment-error", message: rootResolution.diagnostic.message },
          { quiet: base.quiet, debug: false },
        );
        invocation.exitCode = EXIT_CODES.environment;
        return;
      }
      const tasks = new TaskStore(rootResolution.root.canonicalPath);
      const workflowStore = new WorkflowStore(rootResolution.root);
      let target: string | null = null;
      for (const doc of await tasks.list(false)) {
        if (doc.meta.status !== "active") continue;
        if (await workflowStore.exists(doc.meta.id)) {
          target = doc.meta.id;
          break;
        }
      }
      if (target === null) {
        invocation.exitCode = EXIT_CODES.ok; // no workflow task → no-op
        return;
      }
      invocation.exitCode = await runDriftCheckCommand(base, target);
    });
}
