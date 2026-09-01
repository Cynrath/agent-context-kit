import path from "node:path";
import process from "node:process";
import type { Command } from "commander";
import { TaskStore } from "../../core/tasks/index.js";
import { emitDiagnostic } from "../../shared/diagnostics.js";
import { EXIT_CODES, type ExitCodeValue } from "../../shared/exit-codes.js";
import type { CliInvocation, GlobalOptions } from "../context.js";
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
  args:
    | {
        title: string;
        dependencies?: string[];
        intentRef?: string | undefined;
        specRefs?: string[] | undefined;
        decisionRefs?: string[] | undefined;
        planRef?: string | undefined;
      }
    | { all?: boolean }
    | { id: string },
): Promise<ExitCodeValue> {
  const root = path.resolve(base.root ?? process.cwd());
  const store = new TaskStore(root);
  try {
    switch (subcommand) {
      case "create": {
        const { title, dependencies = [] } = args as { title: string; dependencies?: string[] };
        const extras = args as {
          intentRef?: string | undefined;
          specRefs?: string[] | undefined;
          decisionRefs?: string[] | undefined;
          planRef?: string | undefined;
        };
        const doc = await store.create(title, dependencies, {
          intentRef: extras.intentRef,
          specRefs: extras.specRefs,
          decisionRefs: extras.decisionRefs,
          planRef: extras.planRef,
        });
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
          // Policy v2 (ADR-0028 §1): --force is an ACKit-owned tier2 boundary
          // (controlled state change past the gate). A resolved tier2 deny
          // refuses the override outright (exit 4, POLICY-TIER-DENIED); ask in
          // a non-tty context is treated as deny (no silent bypass).
          if (base.force === true) {
            const tierCheck = await checkForceCompletionTier(base);
            if (tierCheck !== null) return tierCheck;
          }
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
          const pastTense =
            subcommand === "archive"
              ? "archived"
              : subcommand === "complete"
                ? "completed"
                : "started";
          process.stdout.write(`${id}: ${pastTense}\n`);
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

/**
 * Policy v2 tier enforcement for `task complete --force` (ADR-0028 §1):
 * resolves the autonomy table from policy documents + config (deny wins) and
 * refuses the override under tier2 deny. `ask` in a non-tty context is treated
 * as deny — no silent bypass. Returns an exit code to emit, or null to
 * continue with the force attempt.
 */
async function checkForceCompletionTier(base: {
  root?: string | undefined;
  config?: string | undefined;
  quiet: boolean;
  debug?: boolean | undefined;
}): Promise<ExitCodeValue | null> {
  try {
    const rootPath = path.resolve(base.root ?? process.cwd());
    const { loadAckitConfig } = await import("../../core/config/index.js");
    const { resolveAutonomy, evaluateBoundary, resolvePolicy } = await import(
      "../../core/policy/index.js"
    );
    const configResult = await loadAckitConfig(rootPath, { configPath: base.config });
    const layers: unknown[] = [];
    if (configResult.ok) {
      const resolvedPolicy = await resolvePolicy(
        { canonicalPath: rootPath },
        { entryFiles: configResult.config.policy.extends },
      );
      for (const document of resolvedPolicy.documents) {
        const doc = document as { autonomy?: unknown };
        layers.push(doc.autonomy);
      }
      layers.push(configResult.config.autonomy);
    }
    const { autonomy } = resolveAutonomy(layers);
    const evaluation = evaluateBoundary("forceCompletion", autonomy);
    if (evaluation.decision === "deny") {
      emitDiagnostic(
        {
          code: "POLICY-TIER-DENIED",
          message: `--force refused: ${evaluation.reason} (POLICY-TIER-DENIED)`,
        },
        { quiet: base.quiet, debug: base.debug ?? false },
      );
      return EXIT_CODES.securityBoundary;
    }
    if (evaluation.decision === "ask" && process.stdout.isTTY !== true) {
      emitDiagnostic(
        {
          code: "POLICY-TIER-ASK",
          message: `--force requires interactive confirmation: ${evaluation.reason}; non-interactive contexts treat ask as deny`,
        },
        { quiet: base.quiet, debug: base.debug ?? false },
      );
      return EXIT_CODES.securityBoundary;
    }
    return null;
  } catch {
    // Policy resolution failures never crash the completion path; the gate
    // itself remains the authority (fail-open on the TIER CHECK only, never on
    // the completion gate — documented limitation).
    return null;
  }
}

/**
 * Registers the `ackit task` command family on the program.
 */
export function registerTaskCommands(program: Command, invocation: CliInvocation): void {
  const taskCommand = program.command("task").description("docs-first task management");
  taskCommand
    .command("create")
    .description("create a pending task with a tool-allocated id")
    .argument("<title>")
    .option("--depends-on <ids...>", "dependency TASK-#### ids")
    .option("--intent <id>", "intent reference (INTENT-####)")
    .option("--spec <paths...>", "spec document references (repo-relative)")
    .option("--decision <paths...>", "decision document references (repo-relative)")
    .option("--plan <path>", "plan document reference (repo-relative)")
    .action(
      async (
        title: string,
        opts: {
          dependsOn?: string[];
          intent?: string;
          spec?: string[];
          decision?: string[];
          plan?: string;
        },
      ) => {
        const parentOptions = (program.opts() ?? {}) as Partial<GlobalOptions>;
        invocation.exitCode = await runTaskCommand(
          {
            root: parentOptions.root,
            json: parentOptions.json ?? false,
            quiet: parentOptions.quiet ?? false,
          },
          "create",
          {
            title,
            dependencies: opts.dependsOn ?? [],
            intentRef: opts.intent,
            specRefs: opts.spec,
            decisionRefs: opts.decision,
            planRef: opts.plan,
          },
        );
      },
    );
  for (const [sub, description] of [
    ["list", "list tasks (active dir by default; --all includes archive)"],
    ["doctor", "validate the active task set integrity"],
    ["show", "show one task by id"],
  ] as const) {
    taskCommand
      .command(sub)
      .description(description)
      .option("--all", "include archived tasks", false)
      .argument("[id]", "task id (required for show)")
      .action(async (id: string | undefined, opts: { all?: boolean }) => {
        const parentOptions = (program.opts() ?? {}) as Partial<GlobalOptions>;
        invocation.exitCode = await runTaskCommand(
          {
            root: parentOptions.root,
            json: parentOptions.json ?? false,
            quiet: parentOptions.quiet ?? false,
          },
          sub,
          id ? { id } : { all: opts.all ?? false },
        );
      });
  }
  taskCommand
    .command("resume")
    .description("print the deterministic resume context for a checkpointed task")
    .argument("<id>")
    .action(async (id: string) => {
      const parentOptions = (program.opts() ?? {}) as Partial<GlobalOptions>;
      const { runTaskResume } = await import("./checkpoint.js");
      invocation.exitCode = await runTaskResume(
        {
          root: parentOptions.root,
          json: parentOptions.json ?? false,
          quiet: parentOptions.quiet ?? false,
        },
        id,
      );
    });
  for (const sub of ["start", "complete", "archive"] as const) {
    taskCommand
      .command(sub)
      .argument("<id>")
      .description(`${sub} the given task`)
      .option("--force", "override completion gate with explicit intent (complete only)", false)
      .action(async (id: string, opts: { force?: boolean }) => {
        const parentOptions = (program.opts() ?? {}) as Partial<GlobalOptions>;
        invocation.exitCode = await runTaskCommand(
          {
            root: parentOptions.root,
            json: parentOptions.json ?? false,
            quiet: parentOptions.quiet ?? false,
            force: opts.force ?? false,
          },
          sub,
          { id },
        );
      });
  }
}
