import { promises as fsp } from "node:fs";
import path from "node:path";
import process from "node:process";
import type { Command } from "commander";
import {
  CheckpointStore,
  CheckpointStoreError,
  collectStalenessContext,
  renderHandoffPack,
  renderResumeContext,
  validateCheckpointStaleness,
} from "../../core/checkpoint/index.js";
import { resolveRepositoryRoot } from "../../core/filesystem/root.js";
import { IntentStore } from "../../core/intent/index.js";
import { TaskStore } from "../../core/tasks/index.js";
import { WorkflowStore } from "../../core/workflow/index.js";
import { emitDiagnostic } from "../../shared/diagnostics.js";
import { EXIT_CODES, type ExitCodeValue } from "../../shared/exit-codes.js";
import type { CliInvocation, GlobalOptions } from "../context.js";
import { resolveContainedPath, runHandoffExport, runHandoffImport } from "./checkpoint-handoff.js";
import { enforceAckitBoundary } from "./policy-boundary.js";

interface CheckpointCommandBase {
  root?: string | undefined;
  json: boolean;
  quiet: boolean;
  debug?: boolean | undefined;
}

export type { CheckpointCommandBase };

interface NextActionArgs {
  objective: string;
  path?: string | undefined;
  command?: string | undefined;
  expectedResult?: string | undefined;
}

function emitJson(command: string, payload: Record<string, unknown>): void {
  process.stdout.write(
    `${JSON.stringify(
      {
        schemaVersion: "ackit.checkpoint-report.v1",
        tool: "ackit",
        command: `checkpoint ${command}`,
        ...payload,
      },
      null,
      2,
    )}\n`,
  );
}

async function resolveStores(base: CheckpointCommandBase) {
  const rootRequested = path.resolve(base.root ?? process.cwd());
  const rootResolution = await resolveRepositoryRoot(rootRequested);
  if (!rootResolution.ok) {
    emitDiagnostic(
      { code: "environment-error", message: rootResolution.diagnostic.message },
      { quiet: base.quiet, debug: base.debug ?? false },
    );
    return null;
  }
  const rootPath = rootResolution.root.canonicalPath;
  return {
    root: rootResolution.root,
    rootPath,
    checkpoints: new CheckpointStore(rootResolution.root, rootPath),
    tasks: new TaskStore(rootPath),
    workflow: new WorkflowStore(rootResolution.root),
    intents: new IntentStore(rootPath),
  };
}

export type CheckpointStores = NonNullable<Awaited<ReturnType<typeof resolveStores>>>;

async function intentSummaryFor(
  intents: IntentStore,
  intentRef: string | undefined,
): Promise<{ id: string; title: string; problem: string; desiredOutcome: string } | null> {
  if (intentRef === undefined) return null;
  const found = await intents.find(intentRef);
  if (found === null) return null;
  return {
    id: found.doc.meta.id,
    title: found.doc.meta.title,
    problem: found.doc.meta.problem,
    desiredOutcome: found.doc.meta.desiredOutcome,
  };
}

export async function runCheckpointCommand(
  base: CheckpointCommandBase,
  subcommand: "create" | "show" | "validate" | "export" | "import",
  args: {
    taskId?: string | undefined;
    cpId?: string | undefined;
    out?: string | undefined;
    format?: string | undefined;
    handoffFile?: string | undefined;
    nextAction?: NextActionArgs | undefined;
  },
): Promise<ExitCodeValue> {
  const stores = await resolveStores(base);
  if (stores === null) return EXIT_CODES.environment;
  const { root, rootPath, checkpoints, tasks, workflow, intents } = stores;
  try {
    switch (subcommand) {
      case "create": {
        const taskId = args.taskId ?? "";
        if (args.nextAction === undefined || taskId.length === 0) {
          emitDiagnostic(
            {
              code: "usage-error",
              message: "checkpoint create requires <taskId> and --next-objective",
            },
            { quiet: base.quiet, debug: base.debug ?? false },
          );
          return EXIT_CODES.usage;
        }
        const found = await tasks.find(taskId);
        if (found === null) {
          emitDiagnostic(
            { code: "checkpoint-error", message: `unknown task '${taskId}'` },
            { quiet: base.quiet, debug: base.debug ?? false },
          );
          return EXIT_CODES.usage;
        }
        const wf = await workflow.load(taskId);
        const checkpoint = await checkpoints.create(
          taskId,
          found.doc,
          wf !== null ? { profile: wf.profile, stage: wf.stage } : { profile: "quick" },
          args.nextAction,
        );
        try {
          const { JournalStore } = await import("../../core/journal/index.js");
          await new JournalStore(root).append(
            "checkpoint-created",
            { taskId, checkpoint: checkpoint.id },
            { taskId },
          );
        } catch {
          // journal best-effort
        }
        if (base.json) {
          emitJson("create", {
            task: taskId,
            checkpoint: checkpoint.id,
            file: `.ackit/workflow/${taskId}/checkpoints/${checkpoint.id}.yaml`,
          });
        } else if (!base.quiet) {
          process.stdout.write(
            `${taskId}: checkpoint ${checkpoint.id} created (${checkpoint.completedWork.length} completed / ${checkpoint.pendingWork.length} pending)\n`,
          );
        }
        return EXIT_CODES.ok;
      }
      case "show": {
        const taskId = args.taskId ?? "";
        const checkpoint =
          args.cpId !== undefined
            ? await checkpoints.find(taskId, args.cpId)
            : await checkpoints.latest(taskId);
        if (checkpoint === null) {
          emitDiagnostic(
            { code: "checkpoint-error", message: `no checkpoint found for '${taskId}'` },
            { quiet: base.quiet, debug: base.debug ?? false },
          );
          return EXIT_CODES.usage;
        }
        if (base.json) {
          emitJson("show", { checkpoint });
        } else if (!base.quiet) {
          const { stringify } = await import("yaml");
          process.stdout.write(stringify(checkpoint, { lineWidth: 0 }));
        }
        return EXIT_CODES.ok;
      }
      case "validate": {
        const taskId = args.taskId ?? "";
        const checkpoint = await checkpoints.latest(taskId);
        if (checkpoint === null) {
          emitDiagnostic(
            { code: "checkpoint-error", message: `no checkpoint found for '${taskId}'` },
            { quiet: base.quiet, debug: base.debug ?? false },
          );
          return EXIT_CODES.usage;
        }
        const problems = validateCheckpointStaleness(
          checkpoint,
          rootPath,
          collectStalenessContext(rootPath),
        );
        if (base.json) {
          emitJson("validate", { task: taskId, checkpoint: checkpoint.id, problems });
        } else if (!base.quiet) {
          if (problems.length === 0) {
            process.stdout.write(`${taskId}: checkpoint ${checkpoint.id} fresh\n`);
          } else {
            for (const problem of problems) {
              emitDiagnostic(
                { code: problem.code.toLowerCase(), message: problem.message },
                { quiet: false, debug: false },
              );
            }
          }
        }
        return problems.some((p) => p.code === "STALE_CHECKPOINT")
          ? EXIT_CODES.thresholdExceeded
          : EXIT_CODES.ok;
      }
      case "export": {
        const taskId = args.taskId ?? "";
        // ADR-0028 §1 boundary: checkpoint/handoff export is a tier2
        // controlled state change — enforce the autonomy table (explicit
        // deny/ask refuse; unconfigured repositories proceed unchanged).
        const boundary = await enforceAckitBoundary({
          boundary: "checkpointExport",
          root: base.root,
          quiet: base.quiet,
          debug: base.debug,
        });
        if (boundary !== null) return boundary;
        if (args.format !== undefined && args.format !== "md" && args.format !== "json") {
          emitDiagnostic(
            {
              code: "checkpoint-error",
              message: `unknown handoff format '${args.format}' (md|json)`,
            },
            { quiet: base.quiet, debug: base.debug ?? false },
          );
          return EXIT_CODES.usage;
        }
        // Machine-readable bound handoff (TASK-0082): handled in
        // checkpoint-handoff.ts (module size contract REQ-ARCH-008).
        if (args.format === "json") {
          return runHandoffExport(base, stores, { taskId, out: args.out });
        }
        const found = await tasks.find(taskId);
        const checkpoint = await checkpoints.latest(taskId);
        if (found === null || checkpoint === null) {
          emitDiagnostic(
            { code: "checkpoint-error", message: `task or checkpoint missing for '${taskId}'` },
            { quiet: base.quiet, debug: base.debug ?? false },
          );
          return EXIT_CODES.usage;
        }
        const intent = await intentSummaryFor(intents, checkpoint.intentRef);
        const pack = renderHandoffPack(
          checkpoint,
          {
            id: found.doc.meta.id,
            title: found.doc.meta.title,
            status: found.doc.meta.status,
            body: found.doc.body,
            relativePath: found.doc.relativePath,
          },
          intent,
        );
        const metaExtra = found.doc.meta as { planRef?: string | undefined };
        void metaExtra;
        if (args.out !== undefined) {
          // Reject (never sanitize) traversal attempts: an out path with ..
          // segments, absolute form, or backslashes is refused outright
          // (THREAT_MODEL T19).
          const outPath = resolveContainedPath(rootPath, args.out);
          if (outPath === null) {
            emitDiagnostic(
              { code: "checkpoint-error", message: "export path escapes repository root" },
              { quiet: base.quiet, debug: base.debug ?? false },
            );
            return EXIT_CODES.securityBoundary;
          }
          await fsp.mkdir(path.dirname(outPath), { recursive: true });
          await fsp.writeFile(outPath, pack, "utf8");
          if (!base.quiet) process.stdout.write(`handoff pack written to ${args.out}\n`);
          return EXIT_CODES.ok;
        }
        process.stdout.write(pack);
        return EXIT_CODES.ok;
      }
      case "import": {
        // Read-only by construction (handled in checkpoint-handoff.ts):
        // validates against CURRENT disk state and renders resume, or
        // refuses with a stable code. Never mutates ledger state.
        return runHandoffImport(base, stores, { handoffFile: args.handoffFile ?? "" });
      }
      default:
        return EXIT_CODES.internal;
    }
  } catch (error) {
    const code = error instanceof CheckpointStoreError ? error.code : "checkpoint-error";
    emitDiagnostic(
      { code: code.toLowerCase(), message: (error as Error).message },
      { quiet: base.quiet, debug: base.debug ?? false },
    );
    return EXIT_CODES.usage;
  }
}

/** `ackit task resume <id>` — print the deterministic resume context. */
export async function runTaskResume(
  base: CheckpointCommandBase,
  taskId: string,
): Promise<ExitCodeValue> {
  const stores = await resolveStores(base);
  if (stores === null) return EXIT_CODES.environment;
  const { checkpoints, tasks, intents } = stores;
  try {
    const found = await tasks.find(taskId);
    if (found === null) {
      emitDiagnostic(
        { code: "task-error", message: `unknown task '${taskId}'` },
        { quiet: base.quiet, debug: base.debug ?? false },
      );
      return EXIT_CODES.usage;
    }
    const checkpoint = await checkpoints.latest(taskId);
    if (checkpoint === null) {
      emitDiagnostic(
        { code: "task-error", message: `no checkpoint recorded for '${taskId}'` },
        { quiet: base.quiet, debug: base.debug ?? false },
      );
      return EXIT_CODES.usage;
    }
    const intent = await intentSummaryFor(intents, checkpoint.intentRef);
    const resume = renderResumeContext(
      checkpoint,
      {
        id: found.doc.meta.id,
        title: found.doc.meta.title,
        status: found.doc.meta.status,
      },
      intent,
    );
    if (base.json) {
      emitJson("resume", { task: taskId, checkpoint: checkpoint.id, resume });
    } else {
      process.stdout.write(resume);
    }
    return EXIT_CODES.ok;
  } catch (error) {
    emitDiagnostic(
      { code: "task-error", message: (error as Error).message },
      { quiet: base.quiet, debug: base.debug ?? false },
    );
    return EXIT_CODES.usage;
  }
}

export function registerCheckpointCommands(program: Command, invocation: CliInvocation): void {
  const checkpointCommand = program
    .command("checkpoint")
    .description("deterministic task checkpoints, resume and handoff");
  checkpointCommand
    .command("create")
    .description("record a checkpoint with the exact next action")
    .argument("<taskId>")
    .requiredOption("--next-objective <text>", "the next action objective")
    .option("--next-path <path>", "file the next action touches")
    .option("--next-command <cmd>", "command the next action runs")
    .option("--next-expected <text>", "expected result of the next action")
    .action(
      async (
        taskId: string,
        opts: {
          nextObjective: string;
          nextPath?: string;
          nextCommand?: string;
          nextExpected?: string;
        },
      ) => {
        const parentOptions = (program.opts() ?? {}) as Partial<GlobalOptions>;
        invocation.exitCode = await runCheckpointCommand(
          {
            root: parentOptions.root,
            json: parentOptions.json ?? false,
            quiet: parentOptions.quiet ?? false,
          },
          "create",
          {
            taskId,
            nextAction: {
              objective: opts.nextObjective,
              ...(opts.nextPath !== undefined ? { path: opts.nextPath } : {}),
              ...(opts.nextCommand !== undefined ? { command: opts.nextCommand } : {}),
              ...(opts.nextExpected !== undefined ? { expectedResult: opts.nextExpected } : {}),
            },
          },
        );
      },
    );
  checkpointCommand
    .command("show")
    .description("show a checkpoint (latest by default)")
    .argument("<taskId>")
    .argument("[cpId]")
    .action(async (taskId: string, cpId: string | undefined) => {
      const parentOptions = (program.opts() ?? {}) as Partial<GlobalOptions>;
      invocation.exitCode = await runCheckpointCommand(
        {
          root: parentOptions.root,
          json: parentOptions.json ?? false,
          quiet: parentOptions.quiet ?? false,
        },
        "show",
        { taskId, cpId },
      );
    });
  checkpointCommand
    .command("validate")
    .description("validate the latest checkpoint (staleness detection)")
    .argument("<taskId>")
    .action(async (taskId: string) => {
      const parentOptions = (program.opts() ?? {}) as Partial<GlobalOptions>;
      invocation.exitCode = await runCheckpointCommand(
        {
          root: parentOptions.root,
          json: parentOptions.json ?? false,
          quiet: parentOptions.quiet ?? false,
        },
        "validate",
        { taskId },
      );
    });
  checkpointCommand
    .command("export")
    .description("write a self-contained handoff pack")
    .argument("<taskId>")
    .option("--out <file>", "output path inside the repository (stdout when omitted)")
    .option("--format <fmt>", "handoff format: md (v1 pack) | json (verification-bound v2)", "md")
    .action(async (taskId: string, opts: { out?: string; format?: string }) => {
      const parentOptions = (program.opts() ?? {}) as Partial<GlobalOptions>;
      invocation.exitCode = await runCheckpointCommand(
        {
          root: parentOptions.root,
          json: parentOptions.json ?? false,
          quiet: parentOptions.quiet ?? false,
        },
        "export",
        { taskId, out: opts.out, format: opts.format },
      );
    });
  checkpointCommand
    .command("import")
    .description(
      "validate a bound handoff against current state and render its resume context (read-only)",
    )
    .argument("<file>", "handoff file inside the repository")
    .action(async (file: string) => {
      const parentOptions = (program.opts() ?? {}) as Partial<GlobalOptions>;
      invocation.exitCode = await runCheckpointCommand(
        {
          root: parentOptions.root,
          json: parentOptions.json ?? false,
          quiet: parentOptions.quiet ?? false,
        },
        "import",
        { handoffFile: file },
      );
    });
}
