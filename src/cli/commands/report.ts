import process from "node:process";
import type { PolicyError } from "../../core/policy/index.js";
import { assertBindableHost, serveReportFile } from "../../core/reporting/index.js";
import { emitDiagnostic } from "../../shared/diagnostics.js";
import { EXIT_CODES, type ExitCodeValue } from "../../shared/exit-codes.js";
import type { InstructionsCommandOptions } from "../context.js";

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
