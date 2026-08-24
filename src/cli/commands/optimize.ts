import path from "node:path";
import process from "node:process";
import { loadAckitConfig } from "../../core/config/index.js";
import { analyzeOptimize, applyFixes } from "../../core/context/index.js";
import { resolveRepositoryRoot } from "../../core/filesystem/root.js";
import { emitDiagnostic } from "../../shared/diagnostics.js";
import { EXIT_CODES, type ExitCodeValue } from "../../shared/exit-codes.js";
import type { InstructionsCommandOptions } from "../context.js";
import { reportConfigErrors } from "./config.js";

/** `ackit optimize` (REQ-CTX-005): default run never mutates the repository. */
export async function runOptimizeCommand(
  options: Omit<InstructionsCommandOptions, "provider" | "forPath"> & {
    fix: boolean;
    dryRun: boolean;
  },
): Promise<ExitCodeValue> {
  const rootRequested = path.resolve(options.root ?? process.cwd());
  const configResult = await loadAckitConfig(rootRequested, {
    configPath: options.config,
  });
  if (!configResult.ok) {
    reportConfigErrors(configResult.errors, { quiet: options.quiet, debug: options.debug });
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
