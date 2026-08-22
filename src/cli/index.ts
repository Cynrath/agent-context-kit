#!/usr/bin/env node
import { realpathSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { Command, CommanderError } from "commander";
import { compareBaseline, readBaseline, writeBaseline } from "../core/cache/baseline.js";
import { cleanCache } from "../core/cache/cache.js";
import { type ConfigError, loadAckitConfig } from "../core/config/index.js";
import { buildContextPack } from "../core/context/index.js";
import { resolveRepositoryRoot } from "../core/filesystem/root.js";
import { changedFiles, rangeFiles, sinceFiles, stagedFiles } from "../core/git/git.js";
import {
  buildInstructionGraph,
  type ProviderId,
  resolveEffectiveStack,
} from "../core/instructions/index.js";
import { planOrApplyInit } from "../core/onboarding/index.js";
import { renderScanJson, renderScanTerminal } from "../core/reporting/index.js";
import { defaultRegistry, runScan, severityAtLeast } from "../core/scanner/index.js";
import { validateSkills } from "../core/skills/index.js";
import { installSkills } from "../core/skills/install.js";
import { TaskStore } from "../core/tasks/index.js";
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
    .option("--changed", "incremental: only git-changed/untracked files", false)
    .option("--staged", "incremental: only git-staged files", false)
    .option("--since <ref>", "incremental: files changed since <ref>")
    .option("--range <a..b>", "incremental: files changed in commit range")
    .option("--baseline <file>", "compare findings against a baseline JSON")
    .option("--write-baseline <file>", "write current findings as baseline JSON")
    .action(async () => {
      const parentOptions = (program.opts() ?? {}) as Partial<GlobalOptions>;
      const commandOptions = (scanCommand.opts() ?? {}) as {
        ci?: boolean;
        changed?: boolean;
        staged?: boolean;
        since?: string;
        range?: string;
        baseline?: string;
        writeBaseline?: string;
      };
      invocation.exitCode = await runScanCommand({
        root: parentOptions.root,
        config: parentOptions.config,
        json: parentOptions.json ?? false,
        quiet: parentOptions.quiet ?? false,
        debug: parentOptions.debug ?? false,
        ci: commandOptions.ci ?? false,
        changed: commandOptions.changed ?? false,
        staged: commandOptions.staged ?? false,
        since: commandOptions.since,
        range: commandOptions.range,
        baseline: commandOptions.baseline,
        writeBaseline: commandOptions.writeBaseline,
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

  skillsCommand
    .command("install")
    .description("install the four built-in ACKit skills idempotently")
    .option("--force", "discard local edits on OWNED skills (third-party names still refused)")
    .action(async () => {
      const parentOptions = (program.opts() ?? {}) as Partial<GlobalOptions>;
      const commandOptions = (skillsCommand.opts() ?? {}) as { force?: boolean };
      invocation.exitCode = await runSkillsInstallCommand({
        root: parentOptions.root,
        config: parentOptions.config,
        json: parentOptions.json ?? false,
        quiet: parentOptions.quiet ?? false,
        debug: parentOptions.debug ?? false,
        force: commandOptions.force ?? false,
      });
    });

  const taskCommand = program.command("task").description("docs-first task system (REQ-TASKS-001)");
  taskCommand
    .command("create")
    .description("create a pending task with a tool-allocated id")
    .argument("<title>")
    .option("--depends-on <ids...>", "dependency TASK-#### ids")
    .action(async (title: string, opts: { dependsOn?: string[] }) => {
      const parentOptions = (program.opts() ?? {}) as Partial<GlobalOptions>;
      invocation.exitCode = await runTaskCommand(
        {
          root: parentOptions.root,
          json: parentOptions.json ?? false,
          quiet: parentOptions.quiet ?? false,
        },
        "create",
        { title, dependencies: opts.dependsOn ?? [] },
      );
    });
  for (const [sub, description] of [
    ["list", "list tasks (active dir by default; --all includes archive)"],
    ["doctor", "validate the active task set integrity"],
  ] as const) {
    taskCommand
      .command(sub)
      .description(description)
      .option("--all", "include archived tasks", false)
      .action(async (opts: { all?: boolean }) => {
        const parentOptions = (program.opts() ?? {}) as Partial<GlobalOptions>;
        invocation.exitCode = await runTaskCommand(
          {
            root: parentOptions.root,
            json: parentOptions.json ?? false,
            quiet: parentOptions.quiet ?? false,
          },
          sub,
          { all: opts.all ?? false },
        );
      });
  }
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

  const initCommand = program
    .command("init")
    .description("onboard a repository: instruction shims + built-in skills (REQ-INSTR-009)");
  initCommand
    .option(
      "--agents <list>",
      "comma-separated providers or 'all' (codex,claude,gemini,copilot)",
      "all",
    )
    .option("--dry-run", "print the plan without writing", false)
    .action(async () => {
      const parentOptions = (program.opts() ?? {}) as Partial<GlobalOptions>;
      const commandOptions = (initCommand.opts() ?? {}) as { agents?: string; dryRun?: boolean };
      invocation.exitCode = await runInitCommand({
        root: parentOptions.root,
        json: parentOptions.json ?? false,
        quiet: parentOptions.quiet ?? false,
        debug: parentOptions.debug ?? false,
        agents: commandOptions.agents,
        dryRun: commandOptions.dryRun ?? false,
      });
    });

  const packCommand = program
    .command("pack")
    .description("build a budgeted, deterministic context pack (REQ-CTX-001)");
  packCommand
    .option("--max-tokens <n>", "token budget override", Number.parseInt)
    .option("--format <fmt>", "output format: markdown|json", "markdown")
    .option("--include <globs...>", "explicit include globs (highest ranking signal)")
    .option("--changed", "boost/limit candidates to git-changed files", false)
    .action(async () => {
      const parentOptions = (program.opts() ?? {}) as Partial<GlobalOptions>;
      const commandOptions = (packCommand.opts() ?? {}) as {
        maxTokens?: number;
        format?: string;
        include?: string[];
        changed?: boolean;
      };
      invocation.exitCode = await runPackCommand({
        root: parentOptions.root,
        config: parentOptions.config,
        json: parentOptions.json ?? false,
        quiet: parentOptions.quiet ?? false,
        debug: parentOptions.debug ?? false,
        maxTokens: commandOptions.maxTokens,
        format: commandOptions.format === "json" ? "json" : "markdown",
        include: commandOptions.include,
        changed: commandOptions.changed ?? false,
      });
    });

  const cacheCommand = program.command("cache").description("ACKit cache utilities");
  cacheCommand
    .command("clean")
    .description("remove the ACKit scan cache tree only (.ackit/cache)")
    .action(async () => {
      const parentOptions = (program.opts() ?? {}) as Partial<GlobalOptions>;
      invocation.exitCode = await runCacheCleanCommand({
        root: parentOptions.root,
        json: parentOptions.json ?? false,
        quiet: parentOptions.quiet ?? false,
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
  changed?: boolean | undefined;
  staged?: boolean | undefined;
  since?: string | undefined;
  range?: string | undefined;
  baseline?: string | undefined;
  writeBaseline?: string | undefined;
}

/**
 * `ackit scan` (REQ-SCAN-001/007, REQ-BASE-001): pipeline over the fs engine
 * with git-aware incremental sets and baseline compare/write; exit codes per
 * ADR-0007 (1 threshold/--ci exceeded or new-vs-baseline, 2 invalid config,
 * 3 environment).
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

  // Incremental candidate set (REQ-BASE-003). Non-git + any incremental flag
  // is invalid usage of the flag in that context → exit 2 with clear reason.
  let filterPaths: Set<string> | undefined;
  try {
    if (
      options.changed ||
      options.staged ||
      options.since !== undefined ||
      options.range !== undefined
    ) {
      const paths = new Set<string>();
      if (options.changed) for (const file of changedFiles(rootRequested)) paths.add(file);
      if (options.staged) for (const file of stagedFiles(rootRequested)) paths.add(file);
      if (options.since !== undefined)
        for (const file of sinceFiles(rootRequested, options.since)) paths.add(file);
      if (options.range !== undefined) {
        const [from, to] = options.range.split("..");
        for (const file of rangeFiles(rootRequested, from ?? "HEAD", to ?? "HEAD")) paths.add(file);
      }
      filterPaths = paths;
    }
  } catch (error) {
    emitDiagnostic(
      { code: "git-unavailable", message: (error as Error).message },
      { quiet: options.quiet, debug: options.debug },
    );
    return EXIT_CODES.usage;
  }

  const result = await runScan(rootResolution.root, {
    rules: defaultRegistry.getAll(),
    limits: configResult.config.limits,
    userExcludeGlobs: configResult.config.scan.exclude,
    filterPaths,
  });

  let newCount: number | null = null;
  let fixedCount: number | null = null;
  if (options.baseline !== undefined) {
    const baseline = await readBaseline(rootResolution.root, options.baseline);
    if (baseline === null) {
      emitDiagnostic(
        {
          code: "baseline-error",
          message: `cannot read/validate baseline '${options.baseline}'`,
        },
        { quiet: options.quiet, debug: options.debug },
      );
      return EXIT_CODES.usage;
    }
    const diff = compareBaseline(result.findings, baseline);
    newCount = diff.newFindings.length;
    fixedCount = diff.fixedCount;
  }

  if (options.writeBaseline !== undefined) {
    await writeBaseline(rootResolution.root, result.findings, options.writeBaseline);
    if (!options.json && !options.quiet) {
      process.stdout.write(
        `baseline written to ${options.writeBaseline} (${result.findings.length} findings)\n`,
      );
    }
  }

  if (options.json) {
    process.stdout.write(renderScanJson(result, { newCount, fixedCount }));
  } else if (!options.quiet) {
    process.stdout.write(renderScanTerminal(result));
    if (newCount !== null && fixedCount !== null) {
      process.stdout.write(`Baseline delta: ${newCount} new, ${fixedCount} fixed.\n`);
    }
  }

  if (options.ci || newCount !== null) {
    const threshold = configResult.config.scan.severityThreshold;
    const exceededThreshold = result.findings.some((finding) =>
      severityAtLeast(finding.severity, threshold),
    );
    const hasNew = newCount !== null && newCount > 0;
    if (exceededThreshold || hasNew) {
      if (!options.json && !options.quiet) {
        process.stdout.write(
          `CI gate failed: ${hasNew ? `${newCount} new finding(s) vs baseline` : `threshold '${threshold}' met or exceeded`}.\n`,
        );
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

/** `ackit skills install`: ownership-safe idempotent builtin installation. */
export async function runSkillsInstallCommand(
  options: Omit<InstructionsCommandOptions, "provider" | "forPath"> & { force: boolean },
): Promise<ExitCodeValue> {
  const rootRequested = path.resolve(options.root ?? process.cwd());
  const rootResolution = await resolveRepositoryRoot(rootRequested);
  if (!rootResolution.ok) {
    emitDiagnostic(
      { code: "environment-error", message: rootResolution.diagnostic.message },
      { quiet: options.quiet, debug: options.debug },
    );
    return EXIT_CODES.environment;
  }
  const outcomes = await installSkills(rootResolution.root, { force: options.force });
  if (options.json) {
    process.stdout.write(
      `${JSON.stringify(
        {
          schemaVersion: SKILLS_REPORT_SCHEMA_VERSION,
          tool: "ackit",
          command: "skills install",
          outcomes,
        },
        null,
        2,
      )}\n`,
    );
  } else if (!options.quiet) {
    for (const outcome of outcomes) {
      process.stdout.write(`${outcome.skill}: ${outcome.status} — ${outcome.message}\n`);
    }
  }
  const refused = outcomes.filter(
    (outcome) =>
      outcome.status === "refused-third-party" || outcome.status === "conflict-user-modified",
  );
  if (refused.length > 0) {
    for (const outcome of refused) {
      emitDiagnostic(
        {
          code: "ownership-conflict",
          message: `${outcome.skill}: ${outcome.message}`,
        },
        { quiet: options.quiet, debug: options.debug },
      );
    }
    return EXIT_CODES.securityBoundary;
  }
  return EXIT_CODES.ok;
}

const TASK_REPORT_SCHEMA_VERSION = "ackit.tasks.v0";

interface TaskCommandBase {
  root?: string | undefined;
  json: boolean;
  quiet: boolean;
  debug?: boolean | undefined;
  force?: boolean | undefined;
}

export async function runTaskCommand(
  base: TaskCommandBase,
  subcommand: "create" | "list" | "doctor" | "start" | "complete" | "archive",
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
          emitTaskJson(base, "create", { created: doc.meta.id, file: doc.relativePath });
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
          emitTaskJson(base, "list", { count: rows.length, tasks: rows });
        } else if (!base.quiet) {
          for (const row of rows) process.stdout.write(`${row.id} [${row.status}] ${row.title}\n`);
          if (rows.length === 0) process.stdout.write("no tasks found\n");
        }
        return EXIT_CODES.ok;
      }
      case "doctor": {
        const report = await store.doctor();
        if (base.json) {
          emitTaskJson(base, "doctor", report);
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
          emitTaskJson(base, subcommand, { id, ok: true, warnings });
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

function emitTaskJson(
  _base: { json: boolean },
  command: string,
  payload: Record<string, unknown>,
): void {
  process.stdout.write(
    `${JSON.stringify({ schemaVersion: TASK_REPORT_SCHEMA_VERSION, tool: "ackit", command: `task ${command}`, ...payload }, null, 2)}\n`,
  );
}

/** `ackit init` (REQ-ONB-001/002): plan → write lifecycle; refusals exit 4. */
export async function runInitCommand(
  options: Omit<InstructionsCommandOptions, "provider" | "forPath"> & {
    agents?: string | undefined;
    dryRun: boolean;
  },
): Promise<ExitCodeValue> {
  const rootRequested = path.resolve(options.root ?? process.cwd());
  const rootResolution = await resolveRepositoryRoot(rootRequested);
  if (!rootResolution.ok) {
    emitDiagnostic(
      { code: "environment-error", message: rootResolution.diagnostic.message },
      { quiet: options.quiet, debug: options.debug },
    );
    return EXIT_CODES.environment;
  }
  const agents = (options.agents ?? "all").split(",").map((entry) => entry.trim());
  const actions = await planOrApplyInit(rootResolution.root, { agents, dryRun: options.dryRun });
  if (options.json) {
    process.stdout.write(
      `${JSON.stringify(
        {
          schemaVersion: SKILLS_REPORT_SCHEMA_VERSION,
          tool: "ackit",
          command: "init",
          dryRun: options.dryRun,
          actions,
        },
        null,
        2,
      )}\n`,
    );
  } else if (!options.quiet) {
    process.stdout.write(options.dryRun ? "Init plan (dry-run):\n" : "Init results:\n");
    for (const action of actions) {
      process.stdout.write(`  [${action.action}] ${action.file} — ${action.detail}\n`);
    }
  }
  const refused = actions.filter((action) => action.action === "refused-non-managed");
  return refused.length > 0 ? EXIT_CODES.securityBoundary : EXIT_CODES.ok;
}

/** `ackit pack` (REQ-CTX-001..004). */
export async function runPackCommand(
  options: Omit<InstructionsCommandOptions, "provider" | "forPath"> & {
    maxTokens?: number | undefined;
    format: "markdown" | "json";
    include?: string[] | undefined;
    changed: boolean;
  },
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

  const changedFiles = options.changed ? await listChangedFiles(rootRequested) : [];
  const pack = await buildContextPack(rootResolution.root, {
    maxTokens: options.maxTokens ?? configResult.config.context.maxTokens,
    format: options.format,
    includeGlobs: options.include,
    changedFiles,
  });

  if (options.json || options.format === "json") {
    process.stdout.write(pack.json);
  } else if (!options.quiet) {
    process.stdout.write(pack.markdown);
  }
  void assertNoSecretShapesGuard;
  return EXIT_CODES.ok;
}

const assertNoSecretShapesGuard = undefined;
void assertNoSecretShapesGuard;

/** Minimal git-changed fallback (full module lands in TASK-0279). */
async function listChangedFiles(rootPath: string): Promise<string[]> {
  try {
    const { execFileSync } = await import("node:child_process");
    const out = execFileSync("git", ["status", "--porcelain"], { cwd: rootPath, encoding: "utf8" });
    return out
      .split(/\r?\n/)
      .filter((line) => line.length > 3)
      .map((line) => line.slice(3).trim().replace(/^"|"$/g, ""))
      .map((file) => file.split("\\").join("/"));
  } catch {
    return [];
  }
}

/** `ackit cache clean` — scope-limited to .ackit/cache (REQ-BASE-004). */
export async function runCacheCleanCommand(options: {
  root?: string | undefined;
  json: boolean;
  quiet: boolean;
}): Promise<ExitCodeValue> {
  const rootRequested = path.resolve(options.root ?? process.cwd());
  const rootResolution = await resolveRepositoryRoot(rootRequested);
  if (!rootResolution.ok) {
    emitDiagnostic(
      { code: "environment-error", message: rootResolution.diagnostic.message },
      { quiet: options.quiet, debug: false },
    );
    return EXIT_CODES.environment;
  }
  const { removedBytes } = await cleanCache(rootResolution.root);
  if (options.json) {
    process.stdout.write(
      `${JSON.stringify(
        { schemaVersion: "ackit.cache.v0", tool: "ackit", command: "cache clean", removedBytes },
        null,
        2,
      )}\n`,
    );
  } else if (!options.quiet) {
    process.stdout.write(`cache clean: removed ${removedBytes} bytes from .ackit/cache\n`);
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
