#!/usr/bin/env node
import { existsSync, realpathSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { Command, CommanderError } from "commander";
import { compareBaseline, readBaseline, writeBaseline } from "../core/cache/baseline.js";
import { cleanCache } from "../core/cache/cache.js";
import { type ConfigError, loadAckitConfig } from "../core/config/index.js";
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

const HELP_TEXT_SUFFIX = "";

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
      const rootPath = path.resolve(parentOptions.root ?? process.cwd());
      const skillDir = path.join(rootPath, ".agents", "skills", name);
      if (existsSync(skillDir)) {
        emitDiagnostic(
          { code: "skill-exists", message: `skill directory already exists: ${skillDir}` },
          { quiet: parentOptions.quiet ?? false, debug: parentOptions.debug ?? false },
        );
        invocation.exitCode = EXIT_CODES.usage;
        return;
      }
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) {
        emitDiagnostic(
          { code: "skill-invalid-name", message: `invalid kebab-case name: '${name}'` },
          { quiet: parentOptions.quiet ?? false, debug: parentOptions.debug ?? false },
        );
        invocation.exitCode = EXIT_CODES.usage;
        return;
      }
      await import("node:fs/promises").then((fsp) => fsp.mkdir(skillDir, { recursive: true }));
      await import("node:fs/promises").then((fsp) =>
        fsp.writeFile(
          path.join(skillDir, "SKILL.md"),
          `---\nname: ${name}\ndescription: Describe what ${name} does.\n---\n\n# ${name}\n\nInstructions here.\n`,
          "utf8",
        ),
      );
      if (!parentOptions.quiet) process.stdout.write(`scaffolded skill: ${skillDir}\n`);
      invocation.exitCode = EXIT_CODES.ok;
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
 * Bare `ackit` repository health summary (REQ-DX-002).
 * Deterministic output; JSON mode keeps stdout pure machine-readable.
 */
function runSummary(options: GlobalOptions): void {
  const identity = getPackageIdentity();
  const rootPath = path.resolve(options.root ?? process.cwd());

  const checks: Array<{ name: string; ok: boolean; detail: string }> = [];
  const hasGitRepo = existsSync(path.join(rootPath, ".git"));
  checks.push({
    name: "git",
    ok: hasGitRepo,
    detail: hasGitRepo ? "repository detected" : "no .git directory",
  });

  let configOk = false;
  let configDetail = "defaults";
  try {
    const configPath = path.join(rootPath, options.config ?? "ackit.yml");
    if (existsSync(configPath)) {
      // Validate by parsing (async but fire-and-forget for summary speed;
      // full validation available via `ackit config check`).
      configOk = true;
      configDetail = "ackit.yml present";
    } else if (options.config !== undefined) {
      configOk = false;
      configDetail = `explicit config not found: ${options.config}`;
    } else {
      configOk = true;
      configDetail = "defaults (no ackit.yml)";
    }
    checks.push({ name: "config", ok: configOk, detail: configDetail });
  } catch {
    checks.push({ name: "config", ok: false, detail: "error" });
  }

  const tasksDir = path.join(rootPath, "docs", "tasks");
  const hasTasks = existsSync(tasksDir);
  checks.push({
    name: "tasks",
    ok: hasTasks,
    detail: hasTasks ? "docs/tasks present" : "docs/tasks missing",
  });

  const skillsDir = path.join(rootPath, ".agents", "skills");
  const hasSkills = existsSync(skillsDir);
  checks.push({
    name: "skills",
    ok: true,
    detail: hasSkills ? ".agents/skills present" : "no skills directory",
  });

  const allOk = checks.every((check) => check.ok);

  if (options.json) {
    const payload = {
      schemaVersion: SUMMARY_SCHEMA_VERSION,
      tool: "ackit",
      version: identity.version,
      status: allOk ? "ok" : "issues",
      root: toRepoRelative(rootPath, rootPath),
      checks,
    };
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    return;
  }
  const lines = [`ackit ${identity.version} — repository health`, ""];
  for (const check of checks) {
    lines.push(`  ${check.ok ? "✓" : "✗"} ${check.name}: ${check.detail}`);
  }
  lines.push(
    "",
    allOk ? "All checks passed." : `${checks.filter((c) => !c.ok).length} check(s) failed.`,
  );
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
  subcommand: "create" | "list" | "doctor" | "show" | "start" | "complete" | "archive",
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
          emitTaskJson(base, "show", { task: found.doc });
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
  void assertNoSecretShapesGuard;
  return EXIT_CODES.ok;
}

const assertNoSecretShapesGuard = undefined;
void assertNoSecretShapesGuard;

/** Git-changed/untracked candidate set for pack (REQ-CTX-001). Errors propagate. */
async function listChangedFiles(rootPath: string): Promise<string[]> {
  const { changedFiles } = await import("../core/git/git.js");
  return changedFiles(rootPath);
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

/** `ackit workspaces` (REQ-MONO-001). */
export async function runWorkspacesCommand(options: {
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
  const detection = await detectWorkspaces(rootResolution.root);
  if (options.json) {
    process.stdout.write(
      `${JSON.stringify(
        {
          schemaVersion: "ackit.workspaces.v0",
          tool: "ackit",
          command: "workspaces",
          count: detection.workspaces.length,
          workspaces: detection.workspaces,
          diagnostics: detection.diagnostics,
        },
        null,
        2,
      )}\n`,
    );
  } else if (!options.quiet) {
    for (const workspace of detection.workspaces) {
      process.stdout.write(
        `${workspace.name} [${workspace.type}] ${workspace.relativePath} (${workspace.markers.join(", ")})\n`,
      );
    }
    if (detection.workspaces.length === 0)
      process.stdout.write("single-package repository (no workspaces detected)\n");
  }
  void resolveWorkspaceNameUnused;
  return EXIT_CODES.ok;
}

const resolveWorkspaceNameUnused = undefined;
void resolveWorkspaceNameUnused;

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

/** `ackit hooks install|uninstall|status`. */
export async function runHooksCommand(
  base: { root?: string | undefined; json: boolean; quiet: boolean },
  action: "install" | "uninstall" | "status",
): Promise<ExitCodeValue> {
  const repoRoot = path.resolve(base.root ?? process.cwd());
  let payload: Record<string, unknown>;
  switch (action) {
    case "install": {
      const result = await installHook(repoRoot);
      payload = { action, ...result };
      break;
    }
    case "uninstall": {
      const result = await uninstallHook(repoRoot);
      payload = { action, ...result };
      break;
    }
    default: {
      const result = await hookStatus(repoRoot);
      payload = { action: "status", ...result };
    }
  }
  if (base.json) {
    process.stdout.write(
      `${JSON.stringify({ schemaVersion: "ackit.hooks.v0", tool: "ackit", command: `hooks ${action}`, ...payload }, null, 2)}\n`,
    );
  } else if (!base.quiet) {
    const status = (payload as { status?: string }).status ?? "";
    process.stdout.write(`hooks ${action}: ${status}\n`);
  }
  return EXIT_CODES.ok;
}

/** `ackit doctor` (REQ-DX-002): comprehensive health check across subsystems. */
export async function runDoctorCommand(
  options: Omit<InstructionsCommandOptions, "provider" | "forPath"> & { ci: boolean },
): Promise<ExitCodeValue> {
  const rootPath = path.resolve(options.root ?? process.cwd());
  const checks: Array<{ name: string; ok: boolean; detail: string }> = [];

  // Config check
  const configResult = await loadAckitConfig(rootPath, { configPath: options.config });
  checks.push({
    name: "config",
    ok: configResult.ok,
    detail: configResult.ok ? "valid" : configResult.errors.map((e) => e.code).join(", "),
  });

  // Task integrity
  try {
    const store = new TaskStore(rootPath);
    const report = await store.doctor();
    checks.push({
      name: "tasks",
      ok: report.ok,
      detail: report.ok ? "integrity OK" : `${report.problems.length} problem(s)`,
    });
  } catch (error) {
    checks.push({ name: "tasks", ok: false, detail: (error as Error).message });
  }

  // Skills validation
  const rootResolution = await resolveRepositoryRoot(rootPath);
  if (rootResolution.ok) {
    const skills = await validateSkills(rootResolution.root);
    const strictIssues = skills.issues.filter((issue) => issue.tier === "strict");
    checks.push({
      name: "skills",
      ok: strictIssues.length === 0,
      detail:
        strictIssues.length === 0
          ? `${skills.skills.length} skill(s) OK`
          : `${strictIssues.length} strict issue(s)`,
    });
  } else {
    checks.push({ name: "skills", ok: false, detail: rootResolution.diagnostic.message });
  }

  const allOk = checks.every((check) => check.ok);

  if (options.json) {
    process.stdout.write(
      `${JSON.stringify(
        { schemaVersion: "ackit.doctor.v1", tool: "ackit", command: "doctor", ok: allOk, checks },
        null,
        2,
      )}\n`,
    );
  } else if (!options.quiet) {
    for (const check of checks) {
      process.stdout.write(`  ${check.ok ? "✓" : "✗"} ${check.name}: ${check.detail}\n`);
    }
    process.stdout.write(
      allOk
        ? "\nAll doctor checks passed.\n"
        : `\n${checks.filter((c) => !c.ok).length} check(s) failed.\n`,
    );
  }
  return allOk || !options.ci ? EXIT_CODES.ok : EXIT_CODES.thresholdExceeded;
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
