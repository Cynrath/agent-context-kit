#!/usr/bin/env node
import { realpathSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { Command, CommanderError } from "commander";
import { type ConfigError, loadAckitConfig } from "../core/config/index.js";
import { resolveRepositoryRoot } from "../core/filesystem/root.js";
import {
  buildInstructionGraph,
  type ProviderId,
  resolveEffectiveStack,
} from "../core/instructions/index.js";
import { renderScanJson, renderScanTerminal } from "../core/reporting/index.js";
import { defaultRegistry, runScan, severityAtLeast } from "../core/scanner/index.js";
import { validateSkills } from "../core/skills/index.js";
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

  const scanCommand = program.command("scan").description("scan the repository for problems");
  scanCommand
    .option("--ci", "enforce the configured severity threshold as a CI gate (exit 1 when exceeded)")
    .action(async () => {
      const parentOptions = (program.opts() ?? {}) as Partial<GlobalOptions>;
      const commandOptions = (scanCommand.opts() ?? {}) as { ci?: boolean };
      invocation.exitCode = await runScanCommand({
        root: parentOptions.root,
        config: parentOptions.config,
        json: parentOptions.json ?? false,
        quiet: parentOptions.quiet ?? false,
        debug: parentOptions.debug ?? false,
        ci: commandOptions.ci ?? false,
      });
    });

  const instructionsCommand = program
    .command("instructions")
    .description("discover and resolve the agent instruction graph");
  instructionsCommand
    .option(
      "--provider <id>",
      "restrict effective resolution to one provider (codex|claude|gemini|copilot)",
    )
    .option("--for <path>", "repository-relative path for applyTo matching")
    .action(async () => {
      const parentOptions = (program.opts() ?? {}) as Partial<GlobalOptions>;
      const commandOptions = (instructionsCommand.opts() ?? {}) as {
        provider?: string;
        for?: string;
      };
      invocation.exitCode = await runInstructionsCommand({
        root: parentOptions.root,
        config: parentOptions.config,
        json: parentOptions.json ?? false,
        quiet: parentOptions.quiet ?? false,
        debug: parentOptions.debug ?? false,
        provider: commandOptions.provider,
        forPath: commandOptions.for,
      });
    });

  const skillsCommand = program.command("skills").description("agent skills utilities");
  skillsCommand
    .command("validate")
    .description("validate .agents/skills against the open standard (strict + warning tiers)")
    .action(async () => {
      const parentOptions = (program.opts() ?? {}) as Partial<GlobalOptions>;
      invocation.exitCode = await runSkillsValidateCommand({
        root: parentOptions.root,
        config: parentOptions.config,
        json: parentOptions.json ?? false,
        quiet: parentOptions.quiet ?? false,
        debug: parentOptions.debug ?? false,
      });
    });
  skillsCommand
    .command("list")
    .description("list discovered agent skills")
    .action(async () => {
      const parentOptions = (program.opts() ?? {}) as Partial<GlobalOptions>;
      invocation.exitCode = await runSkillsListCommand({
        root: parentOptions.root,
        config: parentOptions.config,
        json: parentOptions.json ?? false,
        quiet: parentOptions.quiet ?? false,
        debug: parentOptions.debug ?? false,
      });
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

interface ScanCommandOptions {
  root?: string | undefined;
  config?: string | undefined;
  json: boolean;
  quiet: boolean;
  debug: boolean;
  ci: boolean;
}

/**
 * `ackit scan` (REQ-SCAN-001/007): pipeline over the fs engine; exit 1 when
 * --ci and findings meet/exceed the configured severity threshold, 2 on
 * invalid config, 0 otherwise (ADR-0007).
 */
export async function runScanCommand(options: ScanCommandOptions): Promise<ExitCodeValue> {
  const rootRequested = path.resolve(options.root ?? process.cwd());
  const configResult = await loadAckitConfig(rootRequested, { configPath: options.config });
  if (!configResult.ok) {
    for (const error of configResult.errors) {
      emitDiagnostic(
        { code: "config-error", message: renderConfigError(error) },
        {
          quiet: options.quiet,
          debug: options.debug,
        },
      );
    }
    return EXIT_CODES.usage;
  }

  const rootResolution = await resolveRepositoryRoot(rootRequested);
  if (!rootResolution.ok) {
    emitDiagnostic(
      { code: "environment-error", message: rootResolution.diagnostic.message },
      { quiet: options.quiet, debug: options.debug },
    );
    return EXIT_CODES.environment;
  }

  const result = await runScan(rootResolution.root, {
    rules: defaultRegistry.getAll(),
    limits: configResult.config.limits,
    userExcludeGlobs: configResult.config.scan.exclude,
  });

  if (options.json) {
    process.stdout.write(renderScanJson(result));
  } else if (!options.quiet) {
    process.stdout.write(renderScanTerminal(result));
  }

  if (options.ci) {
    const threshold = configResult.config.scan.severityThreshold;
    const exceeded = result.findings.some((finding) =>
      severityAtLeast(finding.severity, threshold),
    );
    if (exceeded) {
      if (!options.json && !options.quiet) {
        process.stdout.write(`CI gate failed: threshold '${threshold}' met or exceeded.\n`);
      }
      return EXIT_CODES.thresholdExceeded;
    }
  }
  return EXIT_CODES.ok;
}

function toRepoRelative(root: string, absolutePath: string): string {
  const relative = path.relative(root, absolutePath);
  return relative.split(path.sep).join("/");
}

const INSTRUCTIONS_REPORT_SCHEMA_VERSION = "ackit.instructions.v0";

interface InstructionsCommandOptions {
  root?: string | undefined;
  config?: string | undefined;
  json: boolean;
  quiet: boolean;
  debug: boolean;
  provider?: string | undefined;
  forPath?: string | undefined;
}

/**
 * `ackit instructions` (REQ-INSTR-001..003): prints the discovered graph as
 * a stable tree, or pure JSON; --provider/--for resolve an effective stack.
 */
export async function runInstructionsCommand(
  options: InstructionsCommandOptions,
): Promise<ExitCodeValue> {
  const rootRequested = path.resolve(options.root ?? process.cwd());
  const configResult = await loadAckitConfig(rootRequested, { configPath: options.config });
  if (!configResult.ok) {
    for (const error of configResult.errors) {
      emitDiagnostic(
        { code: "config-error", message: renderConfigError(error) },
        {
          quiet: options.quiet,
          debug: options.debug,
        },
      );
    }
    return EXIT_CODES.usage;
  }
  const rootResolution = await resolveRepositoryRoot(rootRequested);
  if (!rootResolution.ok) {
    emitDiagnostic(
      { code: "environment-error", message: rootResolution.diagnostic.message },
      { quiet: options.quiet, debug: options.debug },
    );
    return EXIT_CODES.environment;
  }

  const graph = await buildInstructionGraph(rootResolution.root, {
    maxTokenEstimatePerFile: configResult.config.instructions.maxTokenEstimatePerFile,
  });

  if (options.json) {
    let chain: string[] | null = null;
    if (options.provider !== undefined) {
      const provider = options.provider as ProviderId;
      chain = resolveEffectiveStack(graph, provider, options.forPath ?? "");
    }
    process.stdout.write(
      `${JSON.stringify(
        {
          schemaVersion: INSTRUCTIONS_REPORT_SCHEMA_VERSION,
          tool: "ackit",
          command: "instructions",
          nodeCount: graph.nodes.length,
          effectiveChain: chain,
          nodes: graph.nodes,
          diagnostics: graph.diagnostics,
        },
        null,
        2,
      )}\n`,
    );
    return EXIT_CODES.ok;
  }

  if (!options.quiet) {
    for (const node of graph.nodes) {
      const indent = "  ".repeat(Math.min(node.depth, 6));
      const applyLabel = node.applyTo !== null ? ` [applyTo: ${node.applyTo.join(", ")}]` : "";
      process.stdout.write(
        `${indent}${node.provider}/${node.kind} ${node.relativePath}${applyLabel} (${node.tokenEstimate} tokens)\n`,
      );
    }
    if (graph.diagnostics.length > 0) {
      process.stdout.write(`Diagnostics (${graph.diagnostics.length})\n`);
      for (const diagnostic of graph.diagnostics) {
        emitDiagnostic(
          {
            code: diagnostic.code.toLowerCase(),
            message: `${diagnostic.relativePath ?? ""}: ${diagnostic.message}`,
          },
          { quiet: false, debug: options.debug },
        );
      }
    }
  }
  return EXIT_CODES.ok;
}

const SKILLS_REPORT_SCHEMA_VERSION = "ackit.skills.v0";

async function loadValidatedSkills(
  options: Omit<InstructionsCommandOptions, "provider" | "forPath">,
): Promise<
  | { ok: true; result: Awaited<ReturnType<typeof validateSkills>> }
  | { ok: false; exitCode: ExitCodeValue }
> {
  const rootRequested = path.resolve(options.root ?? process.cwd());
  const configResult = await loadAckitConfig(rootRequested, { configPath: options.config });
  if (!configResult.ok) {
    for (const error of configResult.errors) {
      emitDiagnostic(
        { code: "config-error", message: renderConfigError(error) },
        {
          quiet: options.quiet,
          debug: options.debug,
        },
      );
    }
    return { ok: false, exitCode: EXIT_CODES.usage };
  }
  const rootResolution = await resolveRepositoryRoot(rootRequested);
  if (!rootResolution.ok) {
    emitDiagnostic(
      { code: "environment-error", message: rootResolution.diagnostic.message },
      { quiet: options.quiet, debug: options.debug },
    );
    return { ok: false, exitCode: EXIT_CODES.environment };
  }
  const result = await validateSkills(rootResolution.root);
  return { ok: true, result };
}

/** `ackit skills validate`: 0 clean, 1 findings (strict or warning), 2 usage. */
export async function runSkillsValidateCommand(
  options: Omit<InstructionsCommandOptions, "provider" | "forPath">,
): Promise<ExitCodeValue> {
  const loaded = await loadValidatedSkills(options);
  if (!loaded.ok) return loaded.exitCode;
  const { skills, issues } = loaded.result;
  if (options.json) {
    process.stdout.write(
      `${JSON.stringify(
        {
          schemaVersion: SKILLS_REPORT_SCHEMA_VERSION,
          tool: "ackit",
          command: "skills validate",
          skillCount: skills.length,
          issueCount: issues.length,
          skills,
          issues,
        },
        null,
        2,
      )}\n`,
    );
  } else if (!options.quiet) {
    process.stdout.write(`${skills.length} skill(s), ${issues.length} issue(s)\n`);
    for (const issue of issues) {
      emitDiagnostic(
        {
          code: `skill-${issue.id.toLowerCase()}`,
          message: `${issue.relativePath}: ${issue.message} [${issue.tier}]`,
        },
        { quiet: false, debug: options.debug },
      );
    }
  }
  return issues.length > 0 ? EXIT_CODES.thresholdExceeded : EXIT_CODES.ok;
}

/** `ackit skills list`. */
export async function runSkillsListCommand(
  options: Omit<InstructionsCommandOptions, "provider" | "forPath">,
): Promise<ExitCodeValue> {
  const loaded = await loadValidatedSkills(options);
  if (!loaded.ok) return loaded.exitCode;
  const { skills } = loaded.result;
  if (options.json) {
    process.stdout.write(
      `${JSON.stringify(
        {
          schemaVersion: SKILLS_REPORT_SCHEMA_VERSION,
          tool: "ackit",
          command: "skills list",
          skills,
        },
        null,
        2,
      )}\n`,
    );
  } else if (!options.quiet) {
    for (const skill of skills) {
      process.stdout.write(`${skill.name} — ${skill.description} (${skill.relativePath})\n`);
    }
    if (skills.length === 0) {
      process.stdout.write("No agent skills discovered.\n");
    }
  }
  return EXIT_CODES.ok;
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
