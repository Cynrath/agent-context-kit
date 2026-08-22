#!/usr/bin/env node
import { realpathSync } from "node:fs";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { Command, CommanderError } from "commander";
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

function buildProgram(): Command {
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
  const program = buildProgram();
  try {
    await program.parseAsync([...argv], { from: "node" });
    return EXIT_CODES.ok;
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
