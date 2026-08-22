#!/usr/bin/env node
import { realpathSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { Command, CommanderError } from "commander";
import { type ConfigError, loadAckitConfig } from "../core/config/index.js";
import { emitDiagnostic } from "../shared/diagnostics.js";
import { EXIT_CODES, type ExitCodeValue } from "../shared/exit-codes.js";
import { getPackageIdentity } from "../shared/version.js";

/**
 * Global options shared by every ackit command (REQ-DX-003).
 */
export interface GlobalOptions {
  root?: string | undefined;
  config?: string | undefined;
  json: boolean;
  quiet: boolean;
  color: boolean;
  verbose: boolean;
  debug: boolean;
  strict: boolean;
}

const SUMMARY_SCHEMA_VERSION = "ackit.summary.v0";

const HELP_TEXT_SUFFIX = [
  "vNext scaffold build: only the CLI core is wired so far.",
  "Engine commands (doctor, scan, init, pack, ...) land task-by-task on rebuild/ackit-vnext.",
].join("\n");

/** Per-invocation state shared between command actions and runCli. */
interface CliInvocation {
  exitCode?: ExitCodeValue | undefined;
}

function buildProgram(invocation: CliInvocation): Command {
  const program = new Command();
  program
    .name("ackit")
    .description("AgentContextKit — repository readiness toolkit for coding agents.")
    .version(getPackageIdentity().version, "--version", "print the ackit version")
    .option("--root <path>", "repository root directory (default: current working directory)")
    .option("--config <path>", "path to the ackit config file (default: ./ackit.yml)")
    .option("--json", "write machine-readable JSON to stdout")
    .option("--quiet", "suppress diagnostics on stderr")
    .option("--no-color", "disable colored terminal output")
    .option("--verbose", "print additional diagnostic detail on stderr")
    .option("--debug", "debug mode; exposes raw stack traces for internal errors")
    .option("--strict", "treat warnings as failures where a command supports it")
    .showHelpAfterError("(run 'ackit --help' for usage)")
    .allowExcessArguments(false)
    .exitOverride((error: CommanderError) => {
      throw error;
    })
    .action((options: GlobalOptions) => {
      runSummary(options);
    });

  const configCommand = program.command("config").description("configuration file utilities");
  configCommand
    .command("check")
    .description("validate ackit.yml against the schema and report the result")
    .action(async () => {
      const parentOptions = (configCommand.opts() ?? {}) as Partial<GlobalOptions>;
      const rootOptions = (program.opts() ?? {}) as Partial<GlobalOptions>;
      invocation.exitCode = await runConfigCheck({ ...rootOptions, ...parentOptions });
    });

  program.addHelpText("after", `\n${HELP_TEXT_SUFFIX}`);
  return program;
}

/**
 * Bare `ackit` quick health summary scaffold (REQ-DX-002).
 * Deterministic output; JSON mode keeps stdout pure machine-readable.
 */
function runSummary(options: GlobalOptions): void {
  const identity = getPackageIdentity();
  if (options.json) {
    const payload = {
      schemaVersion: SUMMARY_SCHEMA_VERSION,
      tool: "ackit",
      version: identity.version,
      status: "scaffold",
      checks: {},
    };
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    return;
  }
  const lines = [
    `ackit ${identity.version}`,
    "Repository health summary: scaffold — checks are not wired in this build yet.",
    "Available today: --version, --help, global option parsing, JSON mode.",
  ];
  process.stdout.write(`${lines.join("\n")}\n`);
}

function isUsageError(error: CommanderError): boolean {
  return error.code !== "commander.helpDisplayed" && error.code !== "commander.version";
}

/**
 * Runs one CLI invocation and returns the process exit code (ADR-0007).
 * Exported for contract tests.
 */
export async function runCli(argv: readonly string[]): Promise<ExitCodeValue> {
  const invocation: CliInvocation = {};
  const program = buildProgram(invocation);
  try {
    await program.parseAsync([...argv], { from: "node" });
    return invocation.exitCode ?? EXIT_CODES.ok;
  } catch (error) {
    if (error instanceof CommanderError) {
      if (!isUsageError(error)) {
        return EXIT_CODES.ok;
      }
      emitDiagnostic(
        { code: "usage-error", message: error.message },
        { quiet: false, debug: false },
      );
      return EXIT_CODES.usage;
    }
    if (error instanceof Error) {
      if (process.env["ACKIT_DEBUG"] === "1") {
        emitDiagnostic({ code: "internal-error", message: error.stack ?? error.message });
      } else {
        emitDiagnostic({
          code: "internal-error",
          message: `${error.message} (re-run with ACKIT_DEBUG=1 for details)`,
        });
      }
    } else {
      emitDiagnostic({ code: "internal-error", message: String(error) });
    }
    return EXIT_CODES.internal;
  }
}

const CONFIG_CHECK_SCHEMA_VERSION = "ackit.config-check.v0";

function renderConfigError(error: ConfigError): string {
  const location =
    error.location !== undefined ? `:${error.location.line}:${error.location.column}` : "";
  const suggestion = error.suggestion !== undefined ? ` (did you mean '${error.suggestion}'?)` : "";
  return `${error.code} ${error.file ?? "ackit.yml"}${location}: ${error.message}${suggestion}`;
}

/**
 * `ackit config check`: validate ackit.yml and report structured results
 * (REQ-CFG-005). Exit 2 on invalid config per ADR-0007.
 */
export async function runConfigCheck(options: Partial<GlobalOptions>): Promise<ExitCodeValue> {
  const root = path.resolve(options.root ?? process.cwd());
  const result = await loadAckitConfig(root, { configPath: options.config });
  if (result.ok) {
    if (options.json === true) {
      process.stdout.write(
        `${JSON.stringify(
          {
            schemaVersion: CONFIG_CHECK_SCHEMA_VERSION,
            tool: "ackit",
            command: "config check",
            ok: true,
            configSourceFile:
              result.sourceFile === null ? null : toRepoRelative(root, result.sourceFile),
            digest: result.digest,
          },
          null,
          2,
        )}\n`,
      );
    } else {
      const sourceLabel =
        result.sourceFile === null ? "(defaults)" : toRepoRelative(root, result.sourceFile);
      process.stdout.write(
        `${sourceLabel} OK — schemaVersion 1, digest ${result.digest.slice(0, 12)}\n`,
      );
    }
    return EXIT_CODES.ok;
  }
  if (options.json === true) {
    process.stdout.write(
      `${JSON.stringify(
        {
          schemaVersion: CONFIG_CHECK_SCHEMA_VERSION,
          tool: "ackit",
          command: "config check",
          ok: false,
          errors: result.errors.map((error) => ({
            code: error.code,
            message: error.message,
            file: error.file ?? undefined,
            line: error.location?.line,
            column: error.location?.column,
            path: error.path,
            received: error.received,
            suggestion: error.suggestion,
          })),
        },
        null,
        2,
      )}\n`,
    );
  } else {
    for (const error of result.errors) {
      emitDiagnostic(
        { code: "config-error", message: renderConfigError(error) },
        {
          quiet: options.quiet ?? false,
          debug: options.debug ?? false,
        },
      );
    }
  }
  return EXIT_CODES.usage;
}

function toRepoRelative(root: string, absolutePath: string): string {
  const relative = path.relative(root, absolutePath);
  return relative.split(path.sep).join("/");
}

async function main(): Promise<void> {
  process.exitCode = await runCli(process.argv);
}

const invokedDirectly = (() => {
  try {
    const entry = process.argv[1];
    if (entry === undefined) {
      return false;
    }
    return realpathSync(entry) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
})();

if (invokedDirectly) {
  void main();
}
