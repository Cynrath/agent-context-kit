import process from "node:process";
import { Command, CommanderError } from "commander";
import { emitDiagnostic } from "../shared/diagnostics.js";
import { EXIT_CODES, type ExitCodeValue } from "../shared/exit-codes.js";
import { getPackageIdentity } from "../shared/version.js";
import { runCacheCleanCommand } from "./commands/cache.js";
import { runConfigCheck } from "./commands/config.js";
import { runDoctorCommand } from "./commands/doctor.js";
import { runHooksCommand } from "./commands/hooks.js";
import { runInitCommand } from "./commands/init.js";
import { runInstructionsCommand } from "./commands/instructions.js";
import { runOptimizeCommand } from "./commands/optimize.js";
import { runPackCommand } from "./commands/pack.js";
import { runPolicyCheckCommand } from "./commands/policy.js";
import { runReportServeCommand } from "./commands/report.js";
import { runScanCommand } from "./commands/scan.js";
import { registerSkillsCommands } from "./commands/skills.js";
import { runSummary } from "./commands/summary.js";
import { registerTaskCommands } from "./commands/task.js";
import { runWorkspacesCommand } from "./commands/workspaces.js";
import type { CliInvocation, GlobalOptions } from "./context.js";
import { isUsageError } from "./errors.js";

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
    .option("--fail-below <n>", "fail if readiness score below N (0..100)")
    .option("--strict", "strict readiness gate (80 or config readiness.strictThreshold)", false)
    .option("--compare <file>", "compare readiness against baseline file")
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
        failBelow?: string;
        strict?: boolean;
        compare?: string;
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
        failBelow: commandOptions.failBelow,
        strict: commandOptions.strict ?? false,
        compare: commandOptions.compare,
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
    .option("--profile <name>", "provider profile (codex|claude|copilot|gemini|generic)")
    .option("--for <path>", "repository-relative path for applyTo matching")
    .option("--explain", "show per-node provenance for the resolved chain", false)
    .action(async () => {
      const parentOptions = (program.opts() ?? {}) as Partial<GlobalOptions>;
      const commandOptions = (instructionsCommand.opts() ?? {}) as {
        provider?: string;
        profile?: string;
        for?: string;
        explain?: boolean;
      };
      invocation.exitCode = await runInstructionsCommand({
        root: parentOptions.root,
        config: parentOptions.config,
        json: parentOptions.json ?? false,
        quiet: parentOptions.quiet ?? false,
        debug: parentOptions.debug ?? false,
        provider: commandOptions.provider,
        profile: (commandOptions as unknown as { profile?: string }).profile,
        forPath: commandOptions.for,
        explain: commandOptions.explain ?? false,
      });
    });
  registerSkillsCommands(program, invocation);

  registerTaskCommands(program, invocation);

  const initCommand = program
    .command("init")
    .description("onboard a repository with agent instructions and built-in skills");
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
    .description("build a budgeted, deterministic context pack");
  packCommand
    .option("--max-tokens <n>", "token budget override", Number.parseInt)
    .option("--format <fmt>", "output format: markdown|json", "markdown")
    .option("--include <globs...>", "explicit include globs (highest ranking signal)")
    .option("--changed", "boost/limit candidates to git-changed files", false)
    .option("--profile <name>", "provider profile (codex|claude|copilot|gemini|generic)")
    .action(async () => {
      const parentOptions = (program.opts() ?? {}) as Partial<GlobalOptions>;
      const commandOptions = (packCommand.opts() ?? {}) as {
        maxTokens?: number;
        format?: string;
        include?: string[];
        changed?: boolean;
        profile?: string;
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
        profile: commandOptions.profile,
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
    .description("policy-as-code utilities (offline by construction)");
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
    .description("detect monorepo workspace layout");
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
    .description("read-only advisor for instruction and context hygiene");
  optimizeCommand
    .option("--fix", "apply fixes limited to ACKit-managed surfaces", false)
    .option("--dry-run", "with --fix: print planned changes without writing", false)
    .option("--profile <name>", "provider profile for redundant guidance check")
    .option("--explain", "show provenance for each finding", false)
    .option("--category <cat>", "filter by category")
    .option("--min-severity <level>", "filter by minimum severity (low|medium|high)")
    .option("--format <fmt>", "output format: terminal|json|markdown|sarif", "terminal")
    .option("--diff", "show diff for fix plan", false)
    .action(async () => {
      const parentOptions = (program.opts() ?? {}) as Partial<GlobalOptions>;
      const commandOptions = (optimizeCommand.opts() ?? {}) as {
        fix?: boolean;
        dryRun?: boolean;
        profile?: string;
        explain?: boolean;
        category?: string;
        minSeverity?: string;
        format?: string;
        diff?: boolean;
      };
      invocation.exitCode = await runOptimizeCommand({
        root: parentOptions.root,
        config: parentOptions.config,
        json: parentOptions.json ?? false,
        quiet: parentOptions.quiet ?? false,
        debug: parentOptions.debug ?? false,
        fix: commandOptions.fix ?? false,
        dryRun: commandOptions.dryRun ?? false,
        profile: commandOptions.profile,
        explain: commandOptions.explain ?? false,
        category: commandOptions.category,
        minSeverity: commandOptions.minSeverity,
        format: commandOptions.format ?? "terminal",
        diff: commandOptions.diff ?? false,
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

  const hooksCommand = program.command("hooks").description("git pre-commit hook management");
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

  const diagnosticsCommand = program
    .command("diagnostics")
    .description("diagnostics and profile trace");
  diagnosticsCommand.action(async () => {
    const parentOptions = (program.opts() ?? {}) as Partial<GlobalOptions>;
    const cmdOpts = (diagnosticsCommand.opts() ?? {}) as { profile?: string };
    const { runDiagnosticsCommand } = await import("./commands/diagnostics.js");
    invocation.exitCode = await runDiagnosticsCommand({
      root: parentOptions.root,
      config: parentOptions.config,
      json: parentOptions.json ?? false,
      quiet: parentOptions.quiet ?? false,
      debug: parentOptions.debug ?? false,
      profile: cmdOpts.profile,
    });
  });
  diagnosticsCommand.option("--profile <name>", "provider profile override");

  const readinessCommand = program
    .command("readiness")
    .description("readiness scoring (deterministic 0–100)");
  readinessCommand
    .option("--fail-below <n>", "fail if readiness score below N (0..100)")
    .option("--strict", "strict gate (80 or config readiness.strictThreshold)", false)
    .option("--baseline <file>", "write readiness baseline file")
    .option("--write-baseline <file>", "alias for --baseline")
    .option("--compare <file>", "compare readiness against baseline file")
    .action(async () => {
      const parentOptions = (program.opts() ?? {}) as Partial<GlobalOptions>;
      const commandOptions = (readinessCommand.opts() ?? {}) as {
        failBelow?: string;
        strict?: boolean;
        baseline?: string;
        writeBaseline?: string;
        compare?: string;
      };
      const { runReadinessCommand } = await import("./commands/readiness.js");
      invocation.exitCode = await runReadinessCommand({
        root: parentOptions.root,
        config: parentOptions.config,
        json: parentOptions.json ?? false,
        quiet: parentOptions.quiet ?? false,
        debug: parentOptions.debug ?? false,
        failBelow: commandOptions.failBelow,
        strict: commandOptions.strict ?? false,
        ci: (parentOptions.strict ?? false) ? true : !!commandOptions.strict,
        baseline: commandOptions.baseline ?? commandOptions.writeBaseline,
        compare: commandOptions.compare,
        writeBaseline: commandOptions.writeBaseline,
      });
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
