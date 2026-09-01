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
    task?: string | undefined;
    resume?: boolean | undefined;
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
  // Task-aware pack context (TASK-0049 / ADR-0027 §5): --task TASK-#### ranks
  // declared scope + references + changed files; --resume additionally embeds
  // the latest checkpoint's resume section (and may omit --task when exactly
  // one task is active). Unknown tasks fail with usage.
  let taskContext: import("../../core/context/pack.js").TaskPackContext | undefined;
  if (options.task !== undefined || options.resume === true) {
    const { buildTaskPackContext } = await import("../../core/context/orchestrate.js");
    let taskId = options.task;
    if (taskId === undefined) {
      const { TaskStore } = await import("../../core/tasks/index.js");
      const active = (await new TaskStore(rootResolution.root.canonicalPath).list(false)).filter(
        (doc) => doc.meta.status === "active",
      );
      if (active.length === 1) taskId = active[0]?.meta.id;
    }
    if (taskId === undefined) {
      emitDiagnostic(
        {
          code: "pack-error",
          message: "--task <TASK-ID> required (or exactly one active task for --resume)",
        },
        { quiet: options.quiet, debug: options.debug },
      );
      return EXIT_CODES.usage;
    }
    const taskPack = await buildTaskPackContext(rootResolution.root, taskId);
    if (!taskPack.ok) {
      emitDiagnostic(
        { code: "pack-error", message: taskPack.diagnostic.message },
        { quiet: options.quiet, debug: options.debug },
      );
      return EXIT_CODES.usage;
    }
    taskContext = taskPack.taskContext;
    if (taskPack.resumeSection !== null) {
      sections.unshift(taskPack.resumeSection);
    }
  }
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
    taskContext,
  });

  if (options.json || options.format === "json") {
    process.stdout.write(pack.json);
  } else if (!options.quiet) {
    process.stdout.write(pack.markdown);
  }
  return EXIT_CODES.ok;
}
