import path from "node:path";
import process from "node:process";
import type { Command } from "commander";
import {
  EvidenceStore,
  EvidenceStoreError,
  type EvidenceType,
  validateEvidence,
} from "../../core/evidence/index.js";
import { syncRegistry } from "../../core/evidence/sync.js";
import { resolveRepositoryRoot } from "../../core/filesystem/root.js";
import { TaskStore } from "../../core/tasks/index.js";
import { emitDiagnostic } from "../../shared/diagnostics.js";
import { EXIT_CODES, type ExitCodeValue } from "../../shared/exit-codes.js";
import type { CliInvocation, GlobalOptions } from "../context.js";

interface EvidenceCommandBase {
  root?: string | undefined;
  json: boolean;
  quiet: boolean;
  debug?: boolean | undefined;
}

function emitJson(command: string, payload: Record<string, unknown>): void {
  process.stdout.write(
    `${JSON.stringify(
      {
        schemaVersion: "ackit.evidence-report.v1",
        tool: "ackit",
        command: `evidence ${command}`,
        ...payload,
      },
      null,
      2,
    )}\n`,
  );
}

export async function runEvidenceCommand(
  base: EvidenceCommandBase,
  subcommand: "sync" | "show" | "verify" | "validate",
  args: {
    taskId?: string | undefined;
    criterion?: string | undefined;
    type?: string | undefined;
    ref?: string | undefined;
  },
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
  const rootPath = rootResolution.root.canonicalPath;
  const store = new EvidenceStore(rootResolution.root);
  const tasks = new TaskStore(rootPath);
  try {
    switch (subcommand) {
      case "sync": {
        const taskId = args.taskId ?? "";
        const found = await tasks.find(taskId);
        if (found === null) {
          emitDiagnostic(
            { code: "evidence-error", message: `unknown task '${taskId}'` },
            { quiet: base.quiet, debug: base.debug ?? false },
          );
          return EXIT_CODES.usage;
        }
        const existing = await store.load(taskId);
        const registry = syncRegistry(found.doc, existing, new Date().toISOString().slice(0, 10));
        await store.save(taskId, registry);
        if (base.json) {
          emitJson("sync", { task: taskId, criteria: registry.criteria.length });
        } else if (!base.quiet) {
          process.stdout.write(
            `${taskId}: evidence registry synced (${registry.criteria.length} criterion/criteria)\n`,
          );
        }
        return EXIT_CODES.ok;
      }
      case "show": {
        const taskId = args.taskId ?? "";
        const registry = await store.load(taskId);
        if (registry === null) {
          emitDiagnostic(
            {
              code: "evidence-error",
              message: `no evidence registry for '${taskId}' — run 'ackit evidence sync ${taskId}' first`,
            },
            { quiet: base.quiet, debug: base.debug ?? false },
          );
          return EXIT_CODES.usage;
        }
        if (base.json) {
          emitJson("show", { registry });
        } else if (!base.quiet) {
          for (const criterion of registry.criteria) {
            const evidence = criterion.evidence
              .map((entry) => `${entry.type}:${entry.ref}`)
              .join(" | ");
            process.stdout.write(
              `${criterion.id} [${criterion.status}] ${criterion.requirement}${evidence.length > 0 ? ` — ${evidence}` : ""}\n`,
            );
          }
        }
        return EXIT_CODES.ok;
      }
      case "verify": {
        const taskId = args.taskId ?? "";
        const { criterion, type, ref } = args;
        if (criterion === undefined || type === undefined || ref === undefined) {
          emitDiagnostic(
            {
              code: "usage-error",
              message: "evidence verify requires <taskId>, --criterion, --type, and --ref",
            },
            { quiet: base.quiet, debug: base.debug ?? false },
          );
          return EXIT_CODES.usage;
        }
        const registry = await store.verify(taskId, criterion, {
          type: type as EvidenceType,
          ref,
        });
        if (base.json) {
          emitJson("verify", { task: taskId, criterion, type, criteria: registry.criteria.length });
        } else if (!base.quiet) {
          process.stdout.write(`${taskId}: ${criterion} verified with ${type} evidence\n`);
        }
        return EXIT_CODES.ok;
      }
      case "validate": {
        const taskId = args.taskId ?? "";
        const registry = await store.load(taskId);
        if (registry === null) {
          emitDiagnostic(
            { code: "evidence-error", message: `no evidence registry for '${taskId}'` },
            { quiet: base.quiet, debug: base.debug ?? false },
          );
          return EXIT_CODES.usage;
        }
        const result = validateEvidence(registry);
        if (base.json) {
          emitJson("validate", { task: taskId, ok: result.ok, problems: result.problems });
        } else if (!base.quiet) {
          if (result.ok) {
            process.stdout.write(`${taskId}: evidence complete — all criteria verified\n`);
          } else {
            for (const problem of result.problems) {
              emitDiagnostic(
                {
                  code: problem.code.toLowerCase(),
                  message: `${taskId} ${problem.criterionId !== undefined ? `${problem.criterionId}: ` : ""}${problem.message}`,
                },
                { quiet: false, debug: false },
              );
            }
          }
        }
        return result.ok ? EXIT_CODES.ok : EXIT_CODES.thresholdExceeded;
      }
      default:
        return EXIT_CODES.internal;
    }
  } catch (error) {
    const code = error instanceof EvidenceStoreError ? error.code : "evidence-error";
    emitDiagnostic(
      { code: code.toLowerCase(), message: (error as Error).message },
      { quiet: base.quiet, debug: base.debug ?? false },
    );
    return EXIT_CODES.usage;
  }
}

export function registerEvidenceCommands(program: Command, invocation: CliInvocation): void {
  const evidenceCommand = program
    .command("evidence")
    .description("evidence contract v2: criteria linked to typed proof (ackit.evidence.v2)");
  evidenceCommand
    .command("sync")
    .description("create/refresh the evidence registry from the task's acceptance criteria")
    .argument("<taskId>")
    .action(async (taskId: string) => {
      const parentOptions = (program.opts() ?? {}) as Partial<GlobalOptions>;
      invocation.exitCode = await runEvidenceCommand(
        {
          root: parentOptions.root,
          json: parentOptions.json ?? false,
          quiet: parentOptions.quiet ?? false,
        },
        "sync",
        { taskId },
      );
    });
  evidenceCommand
    .command("show")
    .description("show the evidence registry of a task")
    .argument("<taskId>")
    .action(async (taskId: string) => {
      const parentOptions = (program.opts() ?? {}) as Partial<GlobalOptions>;
      invocation.exitCode = await runEvidenceCommand(
        {
          root: parentOptions.root,
          json: parentOptions.json ?? false,
          quiet: parentOptions.quiet ?? false,
        },
        "show",
        { taskId },
      );
    });
  evidenceCommand
    .command("verify")
    .description("record evidence for a criterion and mark it verified")
    .argument("<taskId>")
    .requiredOption("--criterion <id>", "criterion id (AC-###)")
    .requiredOption("--type <type>", "evidence type (test|build|lint|...|manual)")
    .requiredOption("--ref <text>", "evidence reference (command, path, run id)")
    .action(async (taskId: string, opts: { criterion: string; type: string; ref: string }) => {
      const parentOptions = (program.opts() ?? {}) as Partial<GlobalOptions>;
      invocation.exitCode = await runEvidenceCommand(
        {
          root: parentOptions.root,
          json: parentOptions.json ?? false,
          quiet: parentOptions.quiet ?? false,
        },
        "verify",
        { taskId, criterion: opts.criterion, type: opts.type, ref: opts.ref },
      );
    });
  evidenceCommand
    .command("validate")
    .description("validate completeness: every criterion verified with qualifying evidence")
    .argument("<taskId>")
    .action(async (taskId: string) => {
      const parentOptions = (program.opts() ?? {}) as Partial<GlobalOptions>;
      invocation.exitCode = await runEvidenceCommand(
        {
          root: parentOptions.root,
          json: parentOptions.json ?? false,
          quiet: parentOptions.quiet ?? false,
        },
        "validate",
        { taskId },
      );
    });
}
