import path from "node:path";
import process from "node:process";
import type { Command } from "commander";
import {
  assembleDriftInput,
  type DriftFinding,
  detectWorkflowDrift,
} from "../../core/drift/index.js";
import { resolveRepositoryRoot } from "../../core/filesystem/root.js";
import { TaskStore } from "../../core/tasks/index.js";
import { WorkflowStore } from "../../core/workflow/index.js";
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
 * `ackit drift check <TASK-ID> [--ci]` — deterministic workflow drift report.
 * Blocking findings fail with exit 1 under --ci (gate) and are always visible.
 * Inputs come from the single canonical assembler (TASK-0070) shared with MCP.
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
  const assembled = await assembleDriftInput(rootResolution.root.canonicalPath, taskId);
  if (!assembled.ok) {
    emitDiagnostic(
      { code: "drift-error", message: assembled.message },
      { quiet: base.quiet, debug: base.debug ?? false },
    );
    return EXIT_CODES.usage;
  }

  const findings: DriftFinding[] = detectWorkflowDrift(assembled.input);

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
