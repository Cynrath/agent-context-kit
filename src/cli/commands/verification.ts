import { promises as fsp } from "node:fs";
import path from "node:path";
import process from "node:process";
import type { Command } from "commander";
import { EvidenceStore } from "../../core/evidence/index.js";
import { resolveRepositoryRoot } from "../../core/filesystem/root.js";
import { TaskStore } from "../../core/tasks/index.js";
import { buildVerificationBundle } from "../../core/verification/bundle.js";
import {
  computeStateBinding,
  HEX64_PATTERN,
  StateBindingError,
} from "../../core/verification/index.js";
import { VerdictStore, VerdictStoreError } from "../../core/verification/store.js";
import { emitDiagnostic } from "../../shared/diagnostics.js";
import { EXIT_CODES, type ExitCodeValue } from "../../shared/exit-codes.js";
import type { CliInvocation, GlobalOptions } from "../context.js";
import { enforceAckitBoundary } from "./policy-boundary.js";

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

/** Read a repository-relative file with traversal/absolute containment. */
async function readContainedFile(
  rootPath: string,
  arg: string,
): Promise<{ ok: true; content: string } | { ok: false; message: string; security: boolean }> {
  const normalized = arg.split("\\").join("/");
  const escapes =
    normalized.startsWith("/") ||
    /^[a-zA-Z]:/.test(normalized) ||
    normalized.split("/").some((segment) => segment === "..");
  const filePath = path.resolve(rootPath, normalized);
  if (escapes || !filePath.startsWith(rootPath)) {
    return { ok: false, message: "bundle file path escapes repository root", security: true };
  }
  try {
    return { ok: true, content: await fsp.readFile(filePath, "utf8") };
  } catch {
    return { ok: false, message: `bundle file '${arg}' not found`, security: false };
  }
}

/** Extract the v2 bundle digest from bundle JSON (null when absent). */
function extractBundleDigest(content: string): string | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return null;
  }
  const digest = (parsed as { binding?: { bundleDigest?: unknown } } | null)?.binding?.bundleDigest;
  return typeof digest === "string" && HEX64_PATTERN.test(digest) ? digest : null;
}

export async function runVerificationCommand(
  base: VerificationCommandBase,
  subcommand: "bundle" | "record" | "show",
  args: {
    taskId?: string | undefined;
    out?: string | undefined;
    verdictFile?: string | undefined;
    bundleFile?: string | undefined;
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
        // ADR-0028 §1 boundary: verdict registration appends verification
        // state — enforce the autonomy table (explicit deny/ask refuse;
        // unconfigured repositories proceed unchanged).
        const boundary = await enforceAckitBoundary({
          boundary: "verdictRegistration",
          root: base.root,
          quiet: base.quiet,
          debug: base.debug,
        });
        if (boundary !== null) return boundary;
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
        // Registration-time validation (ADR-0030 §13): recompute CURRENT
        // state and bind it. A self-declared binding in the verdict file is
        // never trusted (strict input validation refuses it); an explicitly
        // submitted bundle (--bundle) must match current state or the
        // registration is refused with a stable stale/mismatch code.
        let binding: Awaited<ReturnType<typeof computeStateBinding>>;
        try {
          binding = await computeStateBinding(rootPath, taskId);
        } catch (error) {
          const code =
            error instanceof StateBindingError
              ? error.code.toLowerCase()
              : "verification-binding-unavailable";
          emitDiagnostic(
            { code, message: (error as Error).message },
            { quiet: base.quiet, debug: base.debug ?? false },
          );
          return EXIT_CODES.usage;
        }
        if (args.bundleFile !== undefined) {
          const replay = await readContainedFile(rootPath, args.bundleFile);
          if (!replay.ok) {
            emitDiagnostic(
              { code: "verification-error", message: replay.message },
              { quiet: base.quiet, debug: base.debug ?? false },
            );
            return replay.security ? EXIT_CODES.securityBoundary : EXIT_CODES.usage;
          }
          const submitted = extractBundleDigest(replay.content);
          if (submitted === null) {
            emitDiagnostic(
              {
                code: "verification-error",
                message: `bundle file '${args.bundleFile}' has no v2 bundle digest — generate it with 'ackit verification bundle ${taskId} --format json --out <file>'`,
              },
              { quiet: base.quiet, debug: base.debug ?? false },
            );
            return EXIT_CODES.usage;
          }
          if (submitted !== binding.bundleDigest) {
            emitDiagnostic(
              {
                code: "verdict-bundle-mismatch",
                message: `bundle digest mismatch: submitted bundle '${submitted}' does not match current state '${binding.bundleDigest}' — re-verify against current state`,
              },
              { quiet: base.quiet, debug: base.debug ?? false },
            );
            return EXIT_CODES.usage;
          }
        }
        const registered = await verdicts.register(taskId, input, {
          taskExists: async (id: string) => (await tasks.find(id)) !== null,
          evidenceRegistry: evidence,
          binding,
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
            bundleDigest: registered.binding.bundleDigest,
            stateDigest: registered.binding.stateDigest,
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
          // Trust state rides along: consumers learn bound/fresh without a
          // second call (completion rechecks independently — this is
          // informational, never the gate itself).
          const summary = await verdicts.latestVerdictSummary(taskId);
          emitJson("show", {
            task: taskId,
            verdict: latest,
            bound: summary?.bound ?? false,
            fresh: summary?.fresh ?? false,
            problemCode: summary?.problemCode ?? null,
            gitUnavailable: summary?.gitUnavailable ?? false,
          });
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
    .description("validate + register a verifier verdict file (append-only, state-bound)")
    .argument("<taskId>")
    .requiredOption("--verdict <file>", "verdict file (repository-relative, ackit.verdict.v1)")
    .option(
      "--bundle <file>",
      "v2 bundle JSON the verifier reviewed (repository-relative; refused when stale)",
    )
    .action(async (taskId: string, opts: { verdict: string; bundle?: string }) => {
      const parentOptions = (program.opts() ?? {}) as Partial<GlobalOptions>;
      invocation.exitCode = await runVerificationCommand(
        {
          root: parentOptions.root,
          json: parentOptions.json ?? false,
          quiet: parentOptions.quiet ?? false,
        },
        "record",
        { taskId, verdictFile: opts.verdict, bundleFile: opts.bundle },
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
