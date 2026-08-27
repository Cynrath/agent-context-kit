import path from "node:path";
import process from "node:process";
import { loadAckitConfig } from "../../core/config/index.js";
import { buildCanonicalContextSections, buildContextPack } from "../../core/context/index.js";
import { resolveRepositoryRoot } from "../../core/filesystem/root.js";
import { changedFiles } from "../../core/git/git.js";
import { emitDiagnostic } from "../../shared/diagnostics.js";
import { EXIT_CODES, type ExitCodeValue } from "../../shared/exit-codes.js";
import type { InstructionsCommandOptions } from "../context.js";
import { reportConfigErrors } from "./config.js";

/** Git-changed/untracked candidate set for pack (REQ-CTX-001). Errors propagate. */
async function listChangedFiles(rootPath: string): Promise<string[]> {
  return changedFiles(rootPath);
}

/** `ackit pack` (REQ-CTX-001..004). */
export async function runPackCommand(
  options: Omit<InstructionsCommandOptions, "provider" | "forPath"> & {
    maxTokens?: number | undefined;
    format: "markdown" | "json";
    include?: string[] | undefined;
    changed: boolean;
    profile?: string | undefined;
  },
): Promise<ExitCodeValue> {
  const rootRequested = path.resolve(options.root ?? process.cwd());
  const configResult = await loadAckitConfig(rootRequested, { configPath: options.config });
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
  // Profile resolution (TASK-0010)
  const { resolveProfileForCommand } = await import("../profile.js");
  const profileRes = await resolveProfileForCommand(rootRequested, {
    cliProfile: options.profile,
    configProfile: configResult.config.profile,
    extendPaths: configResult.config.profiles.extend,
  });
  // Emit profile diagnostics to stderr (not failing)
  for (const d of profileRes.diagnostics) {
    emitDiagnostic(
      { code: d.code.toLowerCase(), message: d.message },
      { quiet: options.quiet, debug: options.debug },
    );
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
  // Canonical orchestration shared with the MCP `ackit_pack` tool.
  const sections = await buildCanonicalContextSections(rootResolution.root);
  const effectiveMaxTokens =
    options.maxTokens ??
    (profileRes.resolved.source !== "fallback"
      ? profileRes.resolved.resolved.contextBudget.maxTokens
      : configResult.config.context.maxTokens);
  const pack = await buildContextPack(rootResolution.root, {
    maxTokens: effectiveMaxTokens,
    format: options.format,
    includeGlobs: options.include,
    restrictToFiles,
    contextSections: sections,
    profile: profileRes.resolved,
  });

  if (options.json || options.format === "json") {
    process.stdout.write(pack.json);
  } else if (!options.quiet) {
    process.stdout.write(pack.markdown);
  }
  return EXIT_CODES.ok;
}
