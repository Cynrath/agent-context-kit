import path from "node:path";
import process from "node:process";
import { TaskStore } from "../../core/tasks/index.js";
import { emitDiagnostic } from "../../shared/diagnostics.js";
import { EXIT_CODES, type ExitCodeValue } from "../../shared/exit-codes.js";
import { TASK_REPORT_SCHEMA_VERSION } from "../context.js";

interface TaskCommandBase {
  root?: string | undefined;
  json: boolean;
  quiet: boolean;
  debug?: boolean | undefined;
  force?: boolean | undefined;
}

export async function runTaskCommand(
  base: TaskCommandBase,
  subcommand: "create" | "list" | "doctor" | "show" | "start" | "complete" | "archive",
  args: { title: string; dependencies?: string[] } | { all?: boolean } | { id: string },
): Promise<ExitCodeValue> {
  const root = path.resolve(base.root ?? process.cwd());
  const store = new TaskStore(root);
  try {
    switch (subcommand) {
      case "create": {
        const { title, dependencies = [] } = args as { title: string; dependencies?: string[] };
        const doc = await store.create(title, dependencies);
        if (base.json) {
          emitTaskJson("create", { created: doc.meta.id, file: doc.relativePath });
        } else if (!base.quiet) {
          process.stdout.write(
            `created ${doc.meta.id} — ${doc.meta.title} (${doc.relativePath})\n`,
          );
        }
        return EXIT_CODES.ok;
      }
      case "list": {
        const { all = false } = args as { all?: boolean };
        const docs = await store.list(all);
        const rows = docs.map((doc) => ({
          id: doc.meta.id,
          status: doc.meta.status,
          title: doc.meta.title,
          file: doc.relativePath,
        }));
        if (base.json) {
          emitTaskJson("list", { count: rows.length, tasks: rows });
        } else if (!base.quiet) {
          for (const row of rows) process.stdout.write(`${row.id} [${row.status}] ${row.title}\n`);
          if (rows.length === 0) process.stdout.write("no tasks found\n");
        }
        return EXIT_CODES.ok;
      }
      case "show": {
        const { id } = args as { id: string };
        if (!id) {
          emitDiagnostic(
            { code: "task-error", message: "task id required for show" },
            { quiet: base.quiet, debug: base.debug ?? false },
          );
          return EXIT_CODES.usage;
        }
        const found = await store.find(id);
        if (found === null) {
          emitDiagnostic(
            { code: "task-error", message: `unknown task '${id}'` },
            { quiet: base.quiet, debug: base.debug ?? false },
          );
          return EXIT_CODES.usage;
        }
        if (base.json) {
          emitTaskJson("show", { task: found.doc });
        } else if (!base.quiet) {
          process.stdout.write(
            `${found.doc.meta.id} [${found.doc.meta.status}] ${found.doc.meta.title}\n${found.doc.body}\n`,
          );
        }
        return EXIT_CODES.ok;
      }
      case "doctor": {
        const report = await store.doctor();
        if (base.json) {
          emitTaskJson("doctor", report);
        } else if (!base.quiet) {
          if (report.ok) process.stdout.write("task set integrity OK\n");
          else
            for (const problem of report.problems)
              emitDiagnostic(
                { code: "task-doctor", message: problem },
                { quiet: false, debug: false },
              );
        }
        return report.ok ? EXIT_CODES.ok : EXIT_CODES.thresholdExceeded;
      }
      case "start":
      case "complete":
      case "archive": {
        const { id } = args as { id: string };
        let warnings: string[] = [];
        if (subcommand === "complete") {
          const result = await store.complete(id, { force: base.force });
          warnings = result.warnings;
          if (!base.quiet && warnings.length > 0) {
            emitDiagnostic({
              code: "force-override",
              message: `WARNING BANNER: completion forced past the gate (${warnings.join("; ")})`,
            });
          }
        } else if (subcommand === "start") {
          await store.start(id);
        } else {
          const archivedPath = await store.archive(id);
          void archivedPath;
        }
        if (base.json) {
          emitTaskJson(subcommand, { id, ok: true, warnings });
        } else if (!base.quiet) {
          process.stdout.write(
            `${id}: ${subcommand === "archive" ? "archived" : `${subcommand}ed`}\n`,
          );
        }
        return EXIT_CODES.ok;
      }
      default:
        return EXIT_CODES.internal;
    }
  } catch (error) {
    emitDiagnostic(
      { code: "task-error", message: (error as Error).message },
      { quiet: base.quiet, debug: base.debug ?? false },
    );
    return EXIT_CODES.usage;
  }
}

function emitTaskJson(command: string, payload: Record<string, unknown>): void {
  process.stdout.write(
    `${JSON.stringify({ schemaVersion: TASK_REPORT_SCHEMA_VERSION, tool: "ackit", command: `task ${command}`, ...payload }, null, 2)}\n`,
  );
}
