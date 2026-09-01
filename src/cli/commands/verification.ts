import { promises as fsp } from "node:fs";
import path from "node:path";
import process from "node:process";
import type { Command } from "commander";
import { EvidenceStore } from "../../core/evidence/index.js";
import { resolveRepositoryRoot } from "../../core/filesystem/root.js";
import { TaskStore } from "../../core/tasks/index.js";
import { buildVerificationBundle } from "../../core/verification/bundle.js";
import { VerdictStore, VerdictStoreError } from "../../core/verification/store.js";
import { emitDiagnostic } from "../../shared/diagnostics.js";
import { EXIT_CODES, type ExitCodeValue } from "../../shared/exit-codes.js";
import type { CliInvocation, GlobalOptions } from "../context.js";

interface VerificationCommandBase {
  root?: string | undefined;
  json: boolean;
  quiet: boolean;
  debug?: boolean | undefined;
}

function emitJson(command: string, payload: Record<string, unknown>): void {
  process.stdout.write(
    `${JSON.stringify(
      {
        schemaVersion: "ackit.verification-report.v1",
        tool: "ackit",
        command: `verification ${command}`,
        ...payload,
      },
      null,
      2,
    )}\n`,
  );
}

export async function runVerificationCommand(
  base: VerificationCommandBase,
  subcommand: "bundle" | "record" | "show",
  args: {
    taskId?: string | undefined;
    out?: string | undefined;
    verdictFile?: string | undefined;
    diff?: boolean | undefined;
    format?: string | undefined;
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
  const root = rootResolution.root;
  const rootPath = root.canonicalPath;
  const tasks = new TaskStore(rootPath);
  const verdicts = new VerdictStore(rootPath);
  try {
    switch (subcommand) {
      case "bundle": {
        const taskId = args.taskId ?? "";
        const result = await buildVerificationBundle(root, taskId, {
          diff: args.diff ?? false,
        });
        if (!result.ok) {
          emitDiagnostic(
            { code: "verification-error", message: result.diagnostic.message },
            { quiet: base.quiet, debug: base.debug ?? false },
          );
          return EXIT_CODES.usage;
        }
        if (args.out !== undefined) {
          // Reject (never sanitize) traversal/absolute out paths (T19).
          const outArg = args.out.split("\\").join("/");
          const escapes =
            outArg.startsWith("/") ||
            /^[a-zA-Z]:/.test(outArg) ||
            outArg.split("/").some((segment) => segment === "..");
          const outPath = path.resolve(rootPath, outArg);
          if (escapes || !outPath.startsWith(rootPath)) {
            emitDiagnostic(
              { code: "verification-error", message: "bundle output path escapes repository root" },
              { quiet: base.quiet, debug: base.debug ?? false },
            );
            return EXIT_CODES.securityBoundary;
          }
          await fsp.mkdir(path.dirname(outPath), { recursive: true });
          await fsp.writeFile(
            outPath,
            args.format === "json" ? result.bundle.json : result.bundle.markdown,
            "utf8",
          );
          if (!base.quiet) process.stdout.write(`verification bundle written to ${args.out}\n`);
          return EXIT_CODES.ok;
        }
        process.stdout.write(args.format === "json" ? result.bundle.json : result.bundle.markdown);
        return EXIT_CODES.ok;
      }
      case "record": {
        const taskId = args.taskId ?? "";
        const verdictFile = args.verdictFile;
        if (verdictFile === undefined || taskId.length === 0) {
          emitDiagnostic(
            {
              code: "usage-error",
              message: "verification record requires <taskId> and --verdict <file>",
            },
            { quiet: base.quiet, debug: base.debug ?? false },
          );
          return EXIT_CODES.usage;
        }
        // Read the verdict file with containment (repository-relative only).
        const vArg = verdictFile.split("\\").join("/");
        const escapes =
          vArg.startsWith("/") ||
          /^[a-zA-Z]:/.test(vArg) ||
          vArg.split("/").some((segment) => segment === "..");
        const vPath = path.resolve(rootPath, vArg);
        if (escapes || !vPath.startsWith(rootPath)) {
          emitDiagnostic(
            { code: "verification-error", message: "verdict file path escapes repository root" },
            { quiet: base.quiet, debug: base.debug ?? false },
          );
          return EXIT_CODES.securityBoundary;
        }
        let raw: string;
        try {
          raw = await fsp.readFile(vPath, "utf8");
        } catch {
          emitDiagnostic(
            { code: "verification-error", message: `verdict file '${verdictFile}' not found` },
            { quiet: base.quiet, debug: base.debug ?? false },
          );
          return EXIT_CODES.usage;
        }
        const { parse } = await import("yaml");
        const input = parse(raw);
        const found = await tasks.find(taskId);
        if (found === null) {
          emitDiagnostic(
            { code: "verification-error", message: `unknown task '${taskId}'` },
            { quiet: base.quiet, debug: base.debug ?? false },
          );
          return EXIT_CODES.usage;
        }
        const evidence = await new EvidenceStore(root).load(taskId);
        const registered = await verdicts.register(taskId, input, {
          taskExists: async (id: string) => (await tasks.find(id)) !== null,
          evidenceRegistry: evidence,
        });
        try {
          const { JournalStore } = await import("../../core/journal/index.js");
          await new JournalStore(root).append(
            "verdict-registered",
            { taskId, verdict: registered.verdict },
            { taskId },
          );
        } catch {
          // journal best-effort
        }
        if (base.json) {
          emitJson("record", {
            task: taskId,
            verdict: registered.id,
            value: registered.verdict,
          });
        } else if (!base.quiet) {
          process.stdout.write(
            `${taskId}: verdict ${registered.id} registered (${registered.verdict})\n`,
          );
        }
        return EXIT_CODES.ok;
      }
      case "show": {
        const taskId = args.taskId ?? "";
        const latest = await verdicts.latest(taskId);
        if (latest === null) {
          if (base.json) {
            emitJson("show", { task: taskId, verdict: null });
          } else if (!base.quiet) {
            process.stdout.write(`${taskId}: no verdicts registered\n`);
          }
          return EXIT_CODES.ok;
        }
        if (base.json) {
          emitJson("show", { task: taskId, verdict: latest });
        } else {
          const { stringify } = await import("yaml");
          process.stdout.write(stringify(latest, { lineWidth: 0 }));
        }
        return EXIT_CODES.ok;
      }
      default:
        return EXIT_CODES.internal;
    }
  } catch (error) {
    const code = error instanceof VerdictStoreError ? error.code : "verification-error";
    emitDiagnostic(
      { code: code.toLowerCase(), message: (error as Error).message },
      { quiet: base.quiet, debug: base.debug ?? false },
    );
    return EXIT_CODES.usage;
  }
}

export function registerVerificationCommands(program: Command, invocation: CliInvocation): void {
  const verificationCommand = program
    .command("verification")
    .description("independent verification bundle + verdict registration (ackit.verdict.v1)");
  verificationCommand
    .command("bundle")
    .description("build a deterministic verification bundle for a fresh verifier")
    .argument("<taskId>")
    .option("--out <file>", "write to a repository-relative path (stdout when omitted)")
    .option("--diff", "include the capped full diff", false)
    .option("--format <fmt>", "output format: markdown|json", "markdown")
    .action(async (taskId: string, opts: { out?: string; diff?: boolean; format?: string }) => {
      const parentOptions = (program.opts() ?? {}) as Partial<GlobalOptions>;
      invocation.exitCode = await runVerificationCommand(
        {
          root: parentOptions.root,
          json: parentOptions.json ?? false,
          quiet: parentOptions.quiet ?? false,
        },
        "bundle",
        { taskId, out: opts.out, diff: opts.diff ?? false, format: opts.format },
      );
    });
  verificationCommand
    .command("record")
    .description("validate + register a verifier verdict file (append-only)")
    .argument("<taskId>")
    .requiredOption("--verdict <file>", "verdict file (repository-relative, ackit.verdict.v1)")
    .action(async (taskId: string, opts: { verdict: string }) => {
      const parentOptions = (program.opts() ?? {}) as Partial<GlobalOptions>;
      invocation.exitCode = await runVerificationCommand(
        {
          root: parentOptions.root,
          json: parentOptions.json ?? false,
          quiet: parentOptions.quiet ?? false,
        },
        "record",
        { taskId, verdictFile: opts.verdict },
      );
    });
  verificationCommand
    .command("show")
    .description("show the latest registered verdict of a task")
    .argument("<taskId>")
    .action(async (taskId: string) => {
      const parentOptions = (program.opts() ?? {}) as Partial<GlobalOptions>;
      invocation.exitCode = await runVerificationCommand(
        {
          root: parentOptions.root,
          json: parentOptions.json ?? false,
          quiet: parentOptions.quiet ?? false,
        },
        "show",
        { taskId },
      );
    });
}
