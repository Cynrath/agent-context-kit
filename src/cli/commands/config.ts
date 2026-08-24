import path from "node:path";
import process from "node:process";
import { type ConfigError, loadAckitConfig } from "../../core/config/index.js";
import { emitDiagnostic } from "../../shared/diagnostics.js";
import { EXIT_CODES, type ExitCodeValue } from "../../shared/exit-codes.js";
import type { GlobalOptions } from "../context.js";
import { renderConfigError } from "../errors.js";
import { writeJson } from "../output.js";
import { toRepoRelative } from "../root.js";

/** Renders a config error as one stable diagnostic line (REQ-CFG-005). */
export function reportConfigErrors(
  errors: readonly ConfigError[],
  options: { quiet?: boolean | undefined; debug?: boolean | undefined },
): void {
  for (const error of errors) {
    emitDiagnostic(
      { code: "config-error", message: renderConfigError(error) },
      { quiet: options.quiet ?? false, debug: options.debug ?? false },
    );
  }
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
      writeJson({
        schemaVersion: "ackit.config-check.v0",
        tool: "ackit",
        command: "config check",
        ok: true,
        configSourceFile:
          result.sourceFile === null ? null : toRepoRelative(root, result.sourceFile),
        digest: result.digest,
      });
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
    writeJson({
      schemaVersion: "ackit.config-check.v0",
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
    });
  } else {
    reportConfigErrors(result.errors, { quiet: options.quiet, debug: options.debug });
  }
  return EXIT_CODES.usage;
}
