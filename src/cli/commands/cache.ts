import process from "node:process";
import { cleanCache } from "../../core/cache/cache.js";
import { emitDiagnostic } from "../../shared/diagnostics.js";
import { EXIT_CODES, type ExitCodeValue } from "../../shared/exit-codes.js";
import { writeJson } from "../output.js";
import { resolveCliRoot } from "../root.js";

/** `ackit cache clean` — scope-limited to .ackit/cache (REQ-BASE-004). */
export async function runCacheCleanCommand(options: {
  root?: string | undefined;
  json: boolean;
  quiet: boolean;
}): Promise<ExitCodeValue> {
  const rootResolution = await resolveCliRoot(options.root);
  if (!rootResolution.ok) {
    emitDiagnostic(
      { code: "environment-error", message: rootResolution.message },
      { quiet: options.quiet, debug: false },
    );
    return EXIT_CODES.environment;
  }
  const { removedBytes } = await cleanCache(rootResolution.root);
  if (options.json) {
    writeJson({
      schemaVersion: "ackit.cache.v0",
      tool: "ackit",
      command: "cache clean",
      removedBytes,
    });
  } else if (!options.quiet) {
    process.stdout.write(`cache clean: removed ${removedBytes} bytes from .ackit/cache\n`);
  }
  return EXIT_CODES.ok;
}
