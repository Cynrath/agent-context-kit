import path from "node:path";
import process from "node:process";
import type { Command } from "commander";
import { loadAckitConfig } from "../../core/config/index.js";
import { resolveRepositoryRoot } from "../../core/filesystem/root.js";
import { TaskStore } from "../../core/tasks/index.js";
import {
  type ArtifactKind,
  BUILTIN_PROFILES,
  defaultProfileFromConfig,
  effectiveRequiredArtifacts,
  resolveProfileRequirements,
  type WorkflowProfileId,
  WorkflowStore,
  WorkflowStoreError,
  workflowOverridesFromConfig,
} from "../../core/workflow/index.js";
import { emitDiagnostic } from "../../shared/diagnostics.js";
import { EXIT_CODES, type ExitCodeValue } from "../../shared/exit-codes.js";
import type { CliInvocation, GlobalOptions } from "../context.js";

interface WorkflowCommandBase {
  root?: string | undefined;
  config?: string | undefined;
  json: boolean;
  quiet: boolean;
  debug?: boolean | undefined;
}

async function resolveStores(base: WorkflowCommandBase) {
  const rootRequested = path.resolve(base.root ?? process.cwd());
  const configResult = await loadAckitConfig(rootRequested, { configPath: base.config });
  if (!configResult.ok) {
    for (const error of configResult.errors) {
      emitDiagnostic(
        { code: "config-error", message: error.message },
        { quiet: base.quiet, debug: base.debug ?? false },
      );
    }
    return null;
  }
  const rootResolution = await resolveRepositoryRoot(rootRequested);
  if (!rootResolution.ok) {
    emitDiagnostic(
      { code: "environment-error", message: rootResolution.diagnostic.message },
      { quiet: base.quiet, debug: base.debug ?? false },
    );
    return null;
  }
  return {
    config: configResult.config,
    root: rootResolution.root,
    rootPath: rootResolution.root.canonicalPath,
    workflow: new WorkflowStore(rootResolution.root),
    tasks: new TaskStore(rootResolution.root.canonicalPath),
  };
}

/**
 * Containment-checked file existence (TASK-0068, THREAT_MODEL T19): resolves
 * `ref` against the canonical root and returns false for absolute paths,
 * root escapes, and absent files. Follows the existing root policy (same
 * `resolve → contained → access` pattern as `TaskStore.refExists` — symlink
 * escape follows that policy; no implicit file creation).
 */
async function refExistsOnDisk(rootPath: string, ref: string): Promise<boolean> {
  if (typeof ref !== "string" || ref.length === 0) return false;
  // Absolute paths are never repository artifacts — deny deterministically.
  if (ref.startsWith("/") || /^[A-Za-z]:[\\/]/.test(ref) || ref.startsWith("\\\\")) return false;
  const absolute = path.resolve(rootPath, ...ref.split("/"));
  const contained = absolute === rootPath || absolute.startsWith(`${rootPath}${path.sep}`);
  if (!contained) return false;
  try {
    const { promises: fsp } = await import("node:fs");
    await fsp.access(absolute);
    return true;
  } catch {
    return false;
  }
}

/** Deterministic artifact existence for the required-artifact gate. */
async function artifactsExist(
  tasks: TaskStore,
  taskId: string,
  rootPath: string,
): Promise<Set<ArtifactKind>> {
  const found = await tasks.find(taskId);
  const existing = new Set<ArtifactKind>();
  if (found !== null) existing.add("task");
  // TASK-0068: declaration is not proof — each declared reference must resolve
  // to an actual repository artifact on disk (containment-checked). A
  // declared-but-absent plan/spec, an absolute path, or a root escape yields
  // absence, and the advance gate denies with a deterministic
  // `missing-required-artifact` diagnostic (no implicit file creation).
  const metaExtra = (found?.doc.meta ?? {}) as unknown as {
    intentRef?: unknown;
    specRefs?: unknown;
    planRef?: unknown;
  };
  const intentRef = typeof metaExtra.intentRef === "string" ? metaExtra.intentRef : undefined;
  if (intentRef !== undefined && intentRef.length > 0) {
    try {
      const { IntentStore } = await import("../../core/intent/index.js");
      const intent = await new IntentStore(rootPath).find(intentRef);
      if (intent !== null) existing.add("intent");
    } catch {
      // intent store unavailable → treated as missing artifact
    }
  }
  if (Array.isArray(metaExtra.specRefs) && metaExtra.specRefs.length > 0) {
    let allPresent = true;
    for (const ref of metaExtra.specRefs) {
      if (typeof ref !== "string" || !(await refExistsOnDisk(rootPath, ref))) {
        allPresent = false;
        break;
      }
    }
    if (allPresent) existing.add("spec");
  }
  if (typeof metaExtra.planRef === "string" && metaExtra.planRef.length > 0) {
    if (await refExistsOnDisk(rootPath, metaExtra.planRef)) existing.add("plan");
  }
  // Evidence registry presence (ackit.evidence.v2, ADR-0026): stages that
  // require evidence gate on registry existence via the canonical loader.
  try {
    const { loadEvidenceRegistry } = await import("../../core/evidence/index.js");
    const registry = await loadEvidenceRegistry(rootPath, taskId);
    if (registry !== null) existing.add("evidence");
  } catch {
    // registry absent — treated as missing artifact
  }
  // Verdict presence (ackit.verdict.v1, ADR-0026): high-risk advancement past
  // independent-review requires a registered verdict.
  try {
    const { VerdictStore } = await import("../../core/verification/index.js");
    const verdicts = await new VerdictStore(rootPath).list(taskId);
    if (verdicts.length > 0) existing.add("verdict");
  } catch {
    // no verdicts — treated as missing artifact
  }
  return existing;
}

async function resolveActiveTask(tasks: TaskStore, explicit?: string): Promise<string | null> {
  if (explicit !== undefined) return explicit;
  const active = (await tasks.list(false)).filter((doc) => doc.meta.status === "active");
  if (active.length === 1) return active[0]?.meta.id ?? null;
  return null;
}

export async function runWorkflowCommand(
  base: WorkflowCommandBase,
  subcommand: "show" | "set" | "advance" | "verify",
  args: {
    taskId?: string | undefined;
    profile?: string | undefined;
    to?: string | undefined;
    outcome?: string | undefined;
  },
): Promise<ExitCodeValue> {
  const stores = await resolveStores(base);
  if (stores === null) return EXIT_CODES.usage;
  const { config, workflow, tasks, rootPath, root } = stores;
  // TASK-0067: single resolved workflow/config view for all gates on this
  // invocation — absent config yields empty overrides (legacy behavior).
  const workflowOverrides = workflowOverridesFromConfig(config);
  const configuredDefault = defaultProfileFromConfig(config);
  try {
    switch (subcommand) {
      case "show": {
        const taskId = await resolveActiveTask(tasks, args.taskId);
        if (taskId === null) {
          emitDiagnostic(
            { code: "workflow-error", message: "task id required (or exactly one active task)" },
            { quiet: base.quiet, debug: base.debug ?? false },
          );
          return EXIT_CODES.usage;
        }
        const state = await workflow.load(taskId);
        if (state === null) {
          if (!base.quiet) {
            process.stdout.write(
              `${taskId}: no workflow state (legacy task; run 'ackit workflow set ${taskId} --profile <quick|standard|high-risk>')\n`,
            );
          }
          return EXIT_CODES.ok;
        }
        const existing = await artifactsExist(tasks, taskId, rootPath);
        const required = effectiveRequiredArtifacts(state.profile, state.stage, workflowOverrides);
        const effective = resolveProfileRequirements(state.profile, workflowOverrides);
        const missing = required.artifacts.filter((kind) => !existing.has(kind));
        if (base.json) {
          process.stdout.write(
            `${JSON.stringify(
              {
                schemaVersion: "ackit.workflow-report.v1",
                tool: "ackit",
                command: "workflow show",
                task: taskId,
                profile: state.profile,
                stage: state.stage,
                requiredArtifacts: required.artifacts,
                missingArtifacts: missing,
                verificationAttempts: state.verificationAttempts.length,
                latestAttempt:
                  state.verificationAttempts[state.verificationAttempts.length - 1]?.outcome ??
                  null,
                effectiveRequiresEvidence: effective.requiresEvidence,
                effectiveRequiresVerdict: effective.requiresVerdict,
                configuredDefaultProfile: configuredDefault ?? null,
              },
              null,
              2,
            )}\n`,
          );
        } else if (!base.quiet) {
          const latest =
            state.verificationAttempts[state.verificationAttempts.length - 1]?.outcome ?? "none";
          process.stdout.write(
            [
              `${taskId}: profile ${state.profile}, stage ${state.stage}`,
              `required artifacts: ${required.artifacts.length === 0 ? "(none)" : required.artifacts.join(", ")}`,
              `missing artifacts: ${missing.length === 0 ? "(none)" : missing.join(", ")}`,
              `verification attempts: ${state.verificationAttempts.length} (latest: ${latest})`,
              `effective requirements: evidence ${effective.requiresEvidence ? "required" : "not required"}, verdict ${effective.requiresVerdict ? "required" : "not required"}`,
            ].join("\n"),
          );
          process.stdout.write("\n");
        }
        return EXIT_CODES.ok;
      }
      case "set": {
        const taskId = args.taskId;
        // TASK-0067: --profile optional — falls back to configured
        // `workflow.defaultProfile`. Absent both preserves the v0.3.0 usage
        // error (legacy repos unchanged).
        const resolvedProfile = args.profile ?? configuredDefault;
        if (taskId === undefined || resolvedProfile === undefined) {
          emitDiagnostic(
            {
              code: "usage-error",
              message:
                "workflow set requires <taskId> and --profile (or a configured workflow.defaultProfile)",
            },
            { quiet: base.quiet, debug: base.debug ?? false },
          );
          return EXIT_CODES.usage;
        }
        if (!(resolvedProfile in BUILTIN_PROFILES)) {
          emitDiagnostic(
            { code: "workflow-error", message: `unknown workflow profile '${resolvedProfile}'` },
            { quiet: base.quiet, debug: base.debug ?? false },
          );
          return EXIT_CODES.usage;
        }
        const found = await tasks.find(taskId);
        if (found === null) {
          emitDiagnostic(
            { code: "workflow-error", message: `unknown task '${taskId}'` },
            { quiet: base.quiet, debug: base.debug ?? false },
          );
          return EXIT_CODES.usage;
        }
        const state = await workflow.setProfile(taskId, resolvedProfile as WorkflowProfileId);
        if (base.json) {
          process.stdout.write(
            `${JSON.stringify({ task: taskId, profile: state.profile, stage: state.stage }, null, 2)}\n`,
          );
        } else if (!base.quiet) {
          process.stdout.write(
            `${taskId}: workflow set to ${state.profile} (stage ${state.stage})\n`,
          );
        }
        return EXIT_CODES.ok;
      }
      case "advance": {
        const taskId = args.taskId;
        if (taskId === undefined) {
          emitDiagnostic(
            { code: "usage-error", message: "workflow advance requires <taskId>" },
            { quiet: base.quiet, debug: base.debug ?? false },
          );
          return EXIT_CODES.usage;
        }
        const state = await workflow.load(taskId);
        if (state === null) {
          emitDiagnostic(
            { code: "workflow-error", message: `task '${taskId}' has no workflow state` },
            { quiet: base.quiet, debug: base.debug ?? false },
          );
          return EXIT_CODES.usage;
        }
        const stages = BUILTIN_PROFILES[state.profile].stages;
        const nextIndex = stages.indexOf(state.stage) + 1;
        const to =
          args.to !== undefined
            ? (args.to as (typeof stages)[number])
            : nextIndex < stages.length
              ? stages[nextIndex]
              : undefined;
        if (to === undefined) {
          emitDiagnostic(
            {
              code: "workflow-error",
              message: `profile '${state.profile}' has no stage after '${state.stage}'`,
            },
            { quiet: base.quiet, debug: base.debug ?? false },
          );
          return EXIT_CODES.usage;
        }
        const existing = await artifactsExist(tasks, taskId, rootPath);
        const required = effectiveRequiredArtifacts(state.profile, to, workflowOverrides);
        const missing = required.artifacts.filter((kind) => !existing.has(kind));
        if (missing.length > 0) {
          emitDiagnostic(
            {
              code: "missing-required-artifact",
              message: `stage '${to}' of profile '${state.profile}' is missing required artifact(s): ${missing.join(", ")}`,
            },
            { quiet: base.quiet, debug: base.debug ?? false },
          );
          return EXIT_CODES.thresholdExceeded;
        }
        const updated = await workflow.advanceTo(taskId, to);
        try {
          const { JournalStore } = await import("../../core/journal/index.js");
          await new JournalStore(root).append(
            "workflow-stage",
            { taskId, profile: updated.profile, stage: updated.stage },
            { taskId },
          );
        } catch {
          // journal best-effort
        }
        if (base.json) {
          process.stdout.write(
            `${JSON.stringify({ task: taskId, profile: updated.profile, stage: updated.stage }, null, 2)}\n`,
          );
        } else if (!base.quiet) {
          process.stdout.write(`${taskId}: advanced to ${updated.stage}\n`);
        }
        return EXIT_CODES.ok;
      }
      case "verify": {
        const taskId = args.taskId;
        const outcome = args.outcome;
        if (taskId === undefined || (outcome !== "pass" && outcome !== "fail")) {
          emitDiagnostic(
            {
              code: "usage-error",
              message: "workflow verify requires <taskId> and --outcome pass|fail",
            },
            { quiet: base.quiet, debug: base.debug ?? false },
          );
          return EXIT_CODES.usage;
        }
        const updated = await workflow.recordVerificationAttempt(taskId, outcome);
        try {
          const { JournalStore } = await import("../../core/journal/index.js");
          await new JournalStore(root).append(
            "verification-attempt",
            { taskId, outcome },
            { taskId },
          );
        } catch {
          // journal best-effort
        }
        if (base.json) {
          process.stdout.write(
            `${JSON.stringify(
              {
                task: taskId,
                outcome,
                stage: updated.stage,
                attempts: updated.verificationAttempts.length,
              },
              null,
              2,
            )}\n`,
          );
        } else if (!base.quiet) {
          process.stdout.write(
            `${taskId}: verification attempt recorded (${outcome}); stage ${updated.stage}\n`,
          );
        }
        return EXIT_CODES.ok;
      }
      default:
        return EXIT_CODES.internal;
    }
  } catch (error) {
    const code = error instanceof WorkflowStoreError ? error.code : "workflow-error";
    emitDiagnostic(
      { code: code.toLowerCase(), message: (error as Error).message },
      { quiet: base.quiet, debug: base.debug ?? false },
    );
    return EXIT_CODES.usage;
  }
}

export function registerWorkflowCommands(program: Command, invocation: CliInvocation): void {
  const workflowCommand = program
    .command("workflow")
    .description("workflow profile and stage management (quick|standard|high-risk)");
  workflowCommand
    .command("show")
    .description("show workflow state for a task (or the single active task)")
    .argument("[taskId]")
    .action(async (taskId: string | undefined) => {
      const parentOptions = (program.opts() ?? {}) as Partial<GlobalOptions>;
      invocation.exitCode = await runWorkflowCommand(
        {
          root: parentOptions.root,
          config: parentOptions.config,
          json: parentOptions.json ?? false,
          quiet: parentOptions.quiet ?? false,
        },
        "show",
        { taskId },
      );
    });
  workflowCommand
    .command("set")
    .description(
      "explicitly select a workflow profile for a task (defaults to workflow.defaultProfile when configured)",
    )
    .argument("<taskId>")
    .option("--profile <id>", "quick | standard | high-risk")
    .action(async (taskId: string, opts: { profile?: string }) => {
      const parentOptions = (program.opts() ?? {}) as Partial<GlobalOptions>;
      invocation.exitCode = await runWorkflowCommand(
        {
          root: parentOptions.root,
          config: parentOptions.config,
          json: parentOptions.json ?? false,
          quiet: parentOptions.quiet ?? false,
        },
        "set",
        { taskId, profile: opts.profile },
      );
    });
  workflowCommand
    .command("advance")
    .description("advance a workflow-enabled task to the next stage (forward-only)")
    .argument("<taskId>")
    .option("--to <stage>", "explicit target stage (adjacent forward only)")
    .action(async (taskId: string, opts: { to?: string }) => {
      const parentOptions = (program.opts() ?? {}) as Partial<GlobalOptions>;
      invocation.exitCode = await runWorkflowCommand(
        {
          root: parentOptions.root,
          config: parentOptions.config,
          json: parentOptions.json ?? false,
          quiet: parentOptions.quiet ?? false,
        },
        "advance",
        { taskId, to: opts.to },
      );
    });
  workflowCommand
    .command("verify")
    .description("record a verification attempt outcome (pass|fail) for the verify/fix loop")
    .argument("<taskId>")
    .requiredOption("--outcome <result>", "pass | fail")
    .action(async (taskId: string, opts: { outcome: string }) => {
      const parentOptions = (program.opts() ?? {}) as Partial<GlobalOptions>;
      invocation.exitCode = await runWorkflowCommand(
        {
          root: parentOptions.root,
          config: parentOptions.config,
          json: parentOptions.json ?? false,
          quiet: parentOptions.quiet ?? false,
        },
        "verify",
        { taskId, outcome: opts.outcome },
      );
    });
}
