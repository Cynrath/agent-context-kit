import path from "node:path";
import process from "node:process";
import type { Command } from "commander";
import {
  buildStatusReport,
  renderStatusReport,
  StatusError,
} from "../../core/status/projection.js";
import { emitDiagnostic } from "../../shared/diagnostics.js";
import { EXIT_CODES, type ExitCodeValue } from "../../shared/exit-codes.js";
import type { CliInvocation, GlobalOptions } from "../context.js";

interface StatusCommandBase {
  root?: string | undefined;
  json: boolean;
  quiet: boolean;
  debug?: boolean | undefined;
}

/**
 * `ackit status [taskId]` — the canonical read-only status projection
 * (TASK-0081, ADR-0032): what task, what stage, what blocks completion,
 * what is stale, what next. Composes the owning engines' read paths and
 * the completion gate's own blocker list; never mutates (no journal, no
 * writes, no clock reads). Defaults to the single active task.
 */
export async function runStatusCommand(
  base: StatusCommandBase,
  taskId?: string | undefined,
): Promise<ExitCodeValue> {
  const rootRequested = path.resolve(base.root ?? process.cwd());
  let report: Awaited<ReturnType<typeof buildStatusReport>>;
  try {
    report = await buildStatusReport(rootRequested, taskId);
  } catch (error) {
    const code =
      error instanceof StatusError ? error.code.toLowerCase().replace(/_/g, "-") : "status-error";
    emitDiagnostic(
      { code, message: (error as Error).message },
      { quiet: base.quiet, debug: base.debug ?? false },
    );
    return EXIT_CODES.usage;
  }
  if (base.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else if (!base.quiet) {
    process.stdout.write(renderStatusReport(report));
  }
  return EXIT_CODES.ok;
}

export function registerStatusCommand(program: Command, invocation: CliInvocation): void {
  program
    .command("status")
    .description(
      "canonical read-only task status: stage, blockers, staleness, next actions (defaults to the active task)",
    )
    .argument("[taskId]", "task id (default: the single active task)")
    .action(async (taskId: string | undefined) => {
      const parentOptions = (program.opts() ?? {}) as Partial<GlobalOptions>;
      invocation.exitCode = await runStatusCommand(
        {
          root: parentOptions.root,
          json: parentOptions.json ?? false,
          quiet: parentOptions.quiet ?? false,
          debug: parentOptions.debug,
        },
        taskId,
      );
    });
}
