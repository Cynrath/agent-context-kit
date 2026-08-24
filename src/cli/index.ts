#!/usr/bin/env node
import { existsSync, realpathSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { Command, CommanderError } from "commander";
import { compareBaseline, readBaseline, writeBaseline } from "../core/cache/baseline.js";
import { cleanCache } from "../core/cache/cache.js";
import { loadAckitConfig } from "../core/config/index.js";
import { analyzeOptimize, applyFixes, buildContextPack } from "../core/context/index.js";
import { resolveRepositoryRoot } from "../core/filesystem/root.js";
import {
  buildInstructionGraph,
  type ProviderId,
  resolveEffectiveStack,
} from "../core/instructions/index.js";
import { planOrApplyInit } from "../core/onboarding/index.js";
import { PolicyError, policyDigest, resolvePolicy } from "../core/policy/index.js";
import {
  assertBindableHost,
  renderHtmlReport,
  renderMarkdownReport,
  renderSarif,
  renderScanJson,
  renderScanTerminal,
  serveReportFile,
} from "../core/reporting/index.js";
import {
  type ExecutedScan,
  executeConfiguredScan,
  GitUnavailableError,
  ScanContractError,
} from "../core/scanner/index.js";
import { validateSkills } from "../core/skills/index.js";
import { installSkills } from "../core/skills/install.js";
import { TaskStore } from "../core/tasks/index.js";
import { hookStatus, installHook, uninstallHook } from "../core/watch/hooks.js";
import { startWatch } from "../core/watch/watch.js";
import { detectWorkspaces } from "../core/workspace/index.js";
import { emitDiagnostic } from "../shared/diagnostics.js";
import { EXIT_CODES, type ExitCodeValue } from "../shared/exit-codes.js";
import { getPackageIdentity } from "../shared/version.js";
import { runCacheCleanCommand } from "./commands/cache.js";
import { runConfigCheck } from "./commands/config.js";
import { runDoctorCommand } from "./commands/doctor.js";
import { runHooksCommand } from "./commands/hooks.js";
import { runInitCommand } from "./commands/init.js";
import { runInstructionsCommand } from "./commands/instructions.js";
import {
  runSkillsInstallCommand,
  runSkillsListCommand,
  runSkillsScaffoldCommand,
  runSkillsValidateCommand,
} from "./commands/skills.js";
import { runSummary } from "./commands/summary.js";
import { runTaskCommand } from "./commands/task.js";
import { runWorkspacesCommand } from "./commands/workspaces.js";
import {
  type CliInvocation,
  CONFIG_CHECK_SCHEMA_VERSION,
  type GlobalOptions,
  INSTRUCTIONS_REPORT_SCHEMA_VERSION,
  type InstructionsCommandOptions,
  SKILLS_REPORT_SCHEMA_VERSION,
  SUMMARY_SCHEMA_VERSION,
  TASK_REPORT_SCHEMA_VERSION,
} from "./context.js";
import { isUsageError, renderConfigError } from "./errors.js";
import { toRepoRelative } from "./root.js";

export type { GlobalOptions } from "./context.js";

const HELP_TEXT_SUFFIX = "";

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
    .option("--format <fmt>", "output format: terminal|json|sarif|markdown|html", "terminal")
    .option("--output <file>", "write report to this file instead of stdout")
    .option("--watch", "re-run scan on file changes until Ctrl+C", false)
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
        format?: string;
        output?: string;
        watch?: boolean;
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
        format: commandOptions.format ?? "terminal",
        output: commandOptions.output,
        watch: commandOptions.watch ?? false,
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
    .command("sync")
    .description("alias for install: sync builtin skills to the current version")
    .option("--force", "discard local edits on OWNED skills", false)
    .action(async () => {
      const parentOptions = (program.opts() ?? {}) as Partial<GlobalOptions>;
      const cmdOpts = (skillsCommand.opts() ?? {}) as { force?: boolean };
      invocation.exitCode = await runSkillsInstallCommand({
        root: parentOptions.root,
        config: parentOptions.config,
        json: parentOptions.json ?? false,
        quiet: parentOptions.quiet ?? false,
        debug: parentOptions.debug ?? false,
        force: cmdOpts.force ?? false,
      });
    });

  skillsCommand
    .command("doctor")
    .description("validate skills + verify lock integrity")
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
    .command("discover")
    .description("list all skill directories found in .agents/skills (including nested)")
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
    .command("scaffold")
    .description("create a new skill skeleton under .agents/skills/<name>")
    .argument("<name>", "kebab-case skill name")
    .action(async (name: string) => {
      const parentOptions = (program.opts() ?? {}) as Partial<GlobalOptions>;
      invocation.exitCode = await runSkillsScaffoldCommand(name, {
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

  const policyCommand = program
    .command("policy")
    .description("policy-as-code utilities (REQ-POL-001, offline by construction)");
  policyCommand
    .command("check")
    .description("resolve the effective policy and print chain + digest + problems")
    .action(async () => {
      const parentOptions = (program.opts() ?? {}) as Partial<GlobalOptions>;
      invocation.exitCode = await runPolicyCheckCommand({
        root: parentOptions.root,
        config: parentOptions.config,
        json: parentOptions.json ?? false,
        quiet: parentOptions.quiet ?? false,
        debug: parentOptions.debug ?? false,
      });
    });

  const workspacesCommand = program
    .command("workspaces")
    .description("detect monorepo workspace layout (REQ-MONO-001)");
  workspacesCommand.action(async () => {
    const parentOptions = (program.opts() ?? {}) as Partial<GlobalOptions>;
    invocation.exitCode = await runWorkspacesCommand({
      root: parentOptions.root,
      json: parentOptions.json ?? false,
      quiet: parentOptions.quiet ?? false,
    });
  });

  const doctorCommand = program
    .command("doctor")
    .description("comprehensive repository health check (config + tasks + skills + scan)");
  doctorCommand.option("--ci", "exit 1 when any check fails", false).action(async () => {
    const parentOptions = (program.opts() ?? {}) as Partial<GlobalOptions>;
    const cmdOpts = (doctorCommand.opts() ?? {}) as { ci?: boolean };
    invocation.exitCode = await runDoctorCommand({
      root: parentOptions.root,
      json: parentOptions.json ?? false,
      quiet: parentOptions.quiet ?? false,
      debug: parentOptions.debug ?? false,
      ci: cmdOpts.ci ?? false,
    });
  });

  const optimizeCommand = program
    .command("optimize")
    .description("read-only advisor for instruction/context hygiene (REQ-CTX-005)");
  optimizeCommand
    .option("--fix", "apply fixes limited to ACKit-managed surfaces", false)
    .option("--dry-run", "with --fix: print planned changes without writing", false)
    .action(async () => {
      const parentOptions = (program.opts() ?? {}) as Partial<GlobalOptions>;
      const commandOptions = (optimizeCommand.opts() ?? {}) as { fix?: boolean; dryRun?: boolean };
      invocation.exitCode = await runOptimizeCommand({
        root: parentOptions.root,
        config: parentOptions.config,
        json: parentOptions.json ?? false,
        quiet: parentOptions.quiet ?? false,
        debug: parentOptions.debug ?? false,
        fix: commandOptions.fix ?? false,
        dryRun: commandOptions.dryRun ?? false,
      });
    });

  const mcpCommand = program
    .command("mcp")
    .description("Model Context Protocol integration (official SDK, stdio only)");
  mcpCommand
    .command("serve")
    .description("serve the ACKit MCP server over stdio (protocol-pure stdout)")
    .action(async () => {
      // Delegate to the dedicated entry so stdout carries only JSON-RPC.
      await import("../mcp/stdio.js");
      // stdio entry keeps the process alive until the transport closes.
      return new Promise<void>((resolve) => {
        process.on("exit", () => resolve());
      });
    });

  const reportCommand = program.command("report").description("report utilities");
  reportCommand
    .command("serve")
    .description("serve an HTML report on loopback (read-only)")
    .argument("<file>")
    .option("--host <host>", "bind host (default 127.0.0.1)", "127.0.0.1")
    .option("--port <n>", "port (default: random free)", Number.parseInt)
    .option("--allow-nonlocal", "explicitly allow binding a non-loopback host", false)
    .action(
      async (file: string, opts: { host?: string; port?: number; allowNonlocal?: boolean }) => {
        const parentOptions = (program.opts() ?? {}) as Partial<GlobalOptions>;
        invocation.exitCode = await runReportServeCommand({
          root: parentOptions.root,
          json: parentOptions.json ?? false,
          quiet: parentOptions.quiet ?? false,
          file,
          host: opts.host ?? "127.0.0.1",
          port: Number.isFinite(opts.port) ? (opts.port as number) : undefined,
          allowNonLocal: opts.allowNonlocal ?? false,
        });
      },
    );

  const hooksCommand = program
    .command("hooks")
    .description("git pre-commit hook management (REQ-WATCH-002)");
  hooksCommand
    .command("install")
    .description("append the ACKit managed pre-commit block, preserving user content")
    .action(async () => {
      const parentOptions = (program.opts() ?? {}) as Partial<GlobalOptions>;
      invocation.exitCode = await runHooksCommand(
        {
          root: parentOptions.root,
          json: parentOptions.json ?? false,
          quiet: parentOptions.quiet ?? false,
        },
        "install",
      );
    });
  hooksCommand
    .command("uninstall")
    .description("remove only the ACKit managed lines")
    .action(async () => {
      const parentOptions = (program.opts() ?? {}) as Partial<GlobalOptions>;
      invocation.exitCode = await runHooksCommand(
        {
          root: parentOptions.root,
          json: parentOptions.json ?? false,
          quiet: parentOptions.quiet ?? false,
        },
        "uninstall",
      );
    });
  hooksCommand
    .command("status")
    .description("report hook installation status")
    .action(async () => {
      const parentOptions = (program.opts() ?? {}) as Partial<GlobalOptions>;
      invocation.exitCode = await runHooksCommand(
        {
          root: parentOptions.root,
          json: parentOptions.json ?? false,
          quiet: parentOptions.quiet ?? false,
        },
        "status",
      );
    });

  program.addHelpText("after", `\n${HELP_TEXT_SUFFIX}`);
  return program;
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

interface ScanCommandOptions {
  format?: string | undefined;
  output?: string | undefined;
  watch?: boolean | undefined;
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

  let executed: ExecutedScan;
  try {
    executed = await executeConfiguredScan(rootRequested, {
      configPath: options.config,
      changed: options.changed,
      staged: options.staged,
      since: options.since,
      range: options.range,
    });
  } catch (error) {
    if (
      error instanceof GitUnavailableError ||
      error instanceof ScanContractError ||
      error instanceof PolicyError
    ) {
      const code = (error as { code?: string }).code ?? "scan-error";
      emitDiagnostic(
        { code: String(code).toLowerCase(), message: error.message },
        { quiet: options.quiet, debug: options.debug },
      );
      return EXIT_CODES.usage;
    }
    emitDiagnostic(
      { code: "environment-error", message: (error as Error).message },
      { quiet: options.quiet, debug: options.debug },
    );
    return EXIT_CODES.environment;
  }

  const result = executed.result;

  let newCount: number | null = null;
  let fixedCount: number | null = null;
  if (options.baseline !== undefined) {
    const baseline = await readBaseline(executed.root, options.baseline);
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
    await writeBaseline(executed.root, result.findings, options.writeBaseline);
    if (!options.json && !options.quiet) {
      process.stdout.write(
        `baseline written to ${options.writeBaseline} (${result.findings.length} findings)\n`,
      );
    }
  }

  const effectiveFormat = options.json === true ? "json" : (options.format ?? "terminal");
  const reportMeta = { filesScanned: result.filesScanned, policyDigest: executed.policyDigest };
  const renderFor = (format: string): string => {
    switch (format) {
      case "json":
        return renderScanJson(result, { newCount, fixedCount });
      case "sarif":
        return renderSarif(result.findings, { policyDigest: executed.policyDigest });
      case "markdown":
        return renderMarkdownReport(result.findings, reportMeta);
      case "html":
        return renderHtmlReport(result.findings, reportMeta);
      default:
        return (
          renderScanTerminal(result) +
          (newCount !== null && fixedCount !== null
            ? `Baseline delta: ${newCount} new, ${fixedCount} fixed.\n`
            : "")
        );
    }
  };

  if (options.watch === true) {
    if (!options.quiet && !options.json) {
      process.stdout.write(renderFor(effectiveFormat));
      process.stdout.write("watching for changes... (Ctrl+C to stop)\n");
    }
    let rerunning = false;
    const controller = new AbortController();
    process.on("SIGINT", () => controller.abort());
    const rerun = (): void => {
      if (rerunning) return;
      rerunning = true;
      executeConfiguredScan(rootRequested, {
        configPath: options.config,
        changed: options.changed,
        staged: options.staged,
        since: options.since,
        range: options.range,
        signal: controller.signal,
      })
        .then((rerunResult) => {
          result.findings = rerunResult.findings;
          result.filesScanned = rerunResult.result.filesScanned;
          result.diagnostics = rerunResult.result.diagnostics;
          if (!options.quiet && !options.json) process.stdout.write("re-scan complete.\n");
        })
        .catch(() => undefined)
        .finally(() => {
          rerunning = false;
        });
    };
    const handle = startWatch(executed.root, {
      signal: controller.signal,
      onChange: rerun,
    });
    await handle.done;
    if (!options.quiet && !options.json) process.stdout.write("watch stopped cleanly (exit 0).\n");
    return EXIT_CODES.ok;
  }

  const rendered = renderFor(effectiveFormat);
  if (options.output !== undefined) {
    await import("node:fs/promises").then((fsp) =>
      fsp.writeFile(path.resolve(options.output as string), rendered, "utf8"),
    );
    if (!options.quiet && !options.json)
      process.stdout.write(`report written to ${options.output}\n`);
  } else {
    process.stdout.write(rendered);
  }

  const gateRequired = options.ci || newCount !== null;
  if (gateRequired && (executed.exceededThreshold || (newCount !== null && newCount > 0))) {
    if (!options.json && !options.quiet) {
      process.stdout.write(
        `CI gate failed: ${
          newCount !== null && newCount > 0
            ? `${newCount} new finding(s) vs baseline`
            : `threshold '${executed.threshold}' met or exceeded`
        }.\n`,
      );
    }
    return EXIT_CODES.thresholdExceeded;
  }
  return EXIT_CODES.ok;
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

  let restrictToFiles: string[] | undefined;
  if (options.changed) {
    try {
      restrictToFiles = await listChangedFiles(rootRequested);
    } catch (error) {
      emitDiagnostic(
        {
          code: (error as Error).name === "GitUnavailableError" ? "git-unavailable" : "pack-error",
          message: (error as Error).message,
        },
        { quiet: options.quiet, debug: options.debug },
      );
      return EXIT_CODES.environment;
    }
  }
  const pack = await buildContextPack(rootResolution.root, {
    maxTokens: options.maxTokens ?? configResult.config.context.maxTokens,
    format: options.format,
    includeGlobs: options.include,
    restrictToFiles,
  });

  if (options.json || options.format === "json") {
    process.stdout.write(pack.json);
  } else if (!options.quiet) {
    process.stdout.write(pack.markdown);
  }
  return EXIT_CODES.ok;
}

/** Git-changed/untracked candidate set for pack (REQ-CTX-001). Errors propagate. */
async function listChangedFiles(rootPath: string): Promise<string[]> {
  const { changedFiles } = await import("../core/git/git.js");
  return changedFiles(rootPath);
}

/** `ackit policy check` (REQ-POL-001/002). */
export async function runPolicyCheckCommand(
  options: Omit<InstructionsCommandOptions, "provider" | "forPath">,
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
  try {
    const resolved = await resolvePolicy(rootResolutionSafe(rootRequested), {
      entryFiles: configResult.config.policy.extends,
    });
    if (options.json) {
      process.stdout.write(
        `${JSON.stringify(
          {
            schemaVersion: "ackit.policy.v0",
            tool: "ackit",
            command: "policy check",
            ok: true,
            chain: resolved.chain,
            digest: policyDigest(resolved.policy),
            diagnostics: resolved.diagnostics,
          },
          null,
          2,
        )}\n`,
      );
    } else if (!options.quiet) {
      process.stdout.write(
        `policy OK — chain (${resolved.chain.length}), digest ${policyDigest(resolved.policy).slice(0, 12)}\n`,
      );
    }
    return EXIT_CODES.ok;
  } catch (error) {
    if (error instanceof PolicyError) {
      emitDiagnostic(
        { code: error.code.toLowerCase(), message: error.message },
        {
          quiet: options.quiet,
          debug: options.debug,
        },
      );
      return EXIT_CODES.usage;
    }
    throw error;
  }
}

function rootResolutionSafe(rootPath: string): { canonicalPath: string } {
  return { canonicalPath: rootPath };
}

/** `ackit optimize` (REQ-CTX-005): default run never mutates the repository. */
export async function runOptimizeCommand(
  options: Omit<InstructionsCommandOptions, "provider" | "forPath"> & {
    fix: boolean;
    dryRun: boolean;
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

  const suggestions = await analyzeOptimize(rootResolution.root, {
    maxTokens: configResult.config.instructions.maxTokenEstimatePerFile,
  });
  let outcomes: Awaited<ReturnType<typeof applyFixes>> = [];
  if (options.fix) {
    outcomes = await applyFixes(rootResolution.root, suggestions, { dryRun: options.dryRun });
  }
  if (options.json) {
    process.stdout.write(
      `${JSON.stringify(
        {
          schemaVersion: "ackit.optimize.v0",
          tool: "ackit",
          command: "optimize",
          fix: options.fix,
          dryRun: options.dryRun,
          suggestionCount: suggestions.length,
          suggestions,
          fixOutcomes: outcomes,
        },
        null,
        2,
      )}\n`,
    );
  } else if (!options.quiet) {
    process.stdout.write(`${suggestions.length} suggestion(s)\n`);
    for (const suggestion of suggestions) {
      process.stdout.write(
        `  [${suggestion.severity}] ${suggestion.category}: ${suggestion.message}\n`,
      );
    }
    for (const outcome of outcomes) {
      process.stdout.write(
        `fix ${outcome.action} ${outcome.target}${outcome.detail.startsWith("+") || outcome.detail.startsWith("-") ? `\n${outcome.detail}` : ` — ${outcome.detail}`}\n`,
      );
    }
  }
  return EXIT_CODES.ok;
}

/** `ackit report serve` (REQ-RPT-002): loopback-only by default. */
export async function runReportServeCommand(
  options: Omit<InstructionsCommandOptions, "provider" | "forPath" | "debug"> & {
    file: string;
    host: string;
    port?: number | undefined;
    allowNonLocal: boolean;
  },
): Promise<ExitCodeValue> {
  try {
    assertBindableHost(options.host, options.allowNonLocal);
  } catch (error) {
    emitDiagnostic(
      {
        code: (error as PolicyError).code?.toLowerCase() ?? "nonlocal-refused",
        message: (error as Error).message,
      },
      { quiet: options.quiet, debug: false },
    );
    return EXIT_CODES.usage;
  }
  const handle = await serveReportFile({
    file: options.file,
    host: options.host,
    port: options.port,
  });
  if (!options.quiet) {
    process.stdout.write(
      `report serving at http://${options.host}:${handle.port} (Ctrl+C to stop)\n`,
    );
  }
  await new Promise<void>((resolve) => process.on("SIGINT", resolve));
  await handle.close();
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
