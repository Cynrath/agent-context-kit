import path from "node:path";
import process from "node:process";
import type { Command } from "commander";
import { resolveRepositoryRoot } from "../../core/filesystem/root.js";
import { JournalStore } from "../../core/journal/index.js";
import { emitDiagnostic } from "../../shared/diagnostics.js";
import { EXIT_CODES, type ExitCodeValue } from "../../shared/exit-codes.js";
import type { CliInvocation, GlobalOptions } from "../context.js";

interface JournalCommandBase {
  root?: string | undefined;
  json: boolean;
  quiet: boolean;
  debug?: boolean | undefined;
}

function emitJson(command: string, payload: Record<string, unknown>): void {
  process.stdout.write(
    `${JSON.stringify(
      {
        schemaVersion: "ackit.journal-report.v1",
        tool: "ackit",
        command: `journal ${command}`,
        ...payload,
      },
      null,
      2,
    )}\n`,
  );
}

export async function runJournalCommand(
  base: JournalCommandBase,
  subcommand: "show" | "validate",
  args: { limit?: number | undefined; taskId?: string | undefined },
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
  const journal = new JournalStore(rootResolution.root);
  if (subcommand === "show") {
    let events = await journal.read({ limit: args.limit });
    if (args.taskId !== undefined) {
      const filterTaskId = args.taskId;
      events = events.filter(
        (event) =>
          event.taskId === filterTaskId ||
          (typeof event.detail === "object" &&
            event.detail !== null &&
            (event.detail as { taskId?: unknown }).taskId === filterTaskId),
      );
    }
    if (base.json) {
      emitJson("show", { count: events.length, events: [...events].reverse() });
    } else if (!base.quiet) {
      for (const event of [...events].reverse()) {
        const detail =
          typeof event.detail === "object" && event.detail !== null
            ? JSON.stringify(event.detail)
            : String(event.detail);
        process.stdout.write(
          `${event.seq} ${event.occurredAt} ${event.kind}${event.taskId !== undefined ? ` ${event.taskId}` : ""} ${detail}\n`,
        );
      }
      if (events.length === 0) process.stdout.write("(no journal events)\n");
    }
    return EXIT_CODES.ok;
  }
  const report = await journal.validate();
  if (base.json) {
    emitJson("validate", { ok: report.ok, problems: report.problems });
  } else if (!base.quiet) {
    if (report.ok) {
      process.stdout.write("journal OK\n");
    } else {
      for (const problem of report.problems) {
        emitDiagnostic(
          { code: "journal-invalid", message: problem },
          { quiet: false, debug: false },
        );
      }
    }
  }
  return report.ok ? EXIT_CODES.ok : EXIT_CODES.thresholdExceeded;
}

export function registerJournalCommands(program: Command, invocation: CliInvocation): void {
  const journalCommand = program
    .command("journal")
    .description("local sanitized execution journal (ackit.execution-journal.v1)");
  journalCommand
    .command("show")
    .description("show journal events (newest first, --limit to bound)")
    .option("--limit <n>", "maximum number of events", Number.parseInt)
    .option("--task <id>", "filter to one task id")
    .action(async (opts: { limit?: number; task?: string }) => {
      const parentOptions = (program.opts() ?? {}) as Partial<GlobalOptions>;
      invocation.exitCode = await runJournalCommand(
        {
          root: parentOptions.root,
          json: parentOptions.json ?? false,
          quiet: parentOptions.quiet ?? false,
        },
        "show",
        { limit: opts.limit, taskId: opts.task },
      );
    });
  journalCommand
    .command("validate")
    .description("audit the journal: every stored event valid and redacted")
    .action(async () => {
      const parentOptions = (program.opts() ?? {}) as Partial<GlobalOptions>;
      invocation.exitCode = await runJournalCommand(
        {
          root: parentOptions.root,
          json: parentOptions.json ?? false,
          quiet: parentOptions.quiet ?? false,
        },
        "validate",
        {},
      );
    });
}
