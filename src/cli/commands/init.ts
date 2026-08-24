import process from "node:process";
import { planOrApplyInit } from "../../core/onboarding/index.js";
import { emitDiagnostic } from "../../shared/diagnostics.js";
import { EXIT_CODES, type ExitCodeValue } from "../../shared/exit-codes.js";
import type { InstructionsCommandOptions } from "../context.js";
import { SKILLS_REPORT_SCHEMA_VERSION } from "../context.js";
import { resolveCliRoot } from "../root.js";

/** `ackit init` (REQ-ONB-001/002): plan → write lifecycle; refusals exit 4. */
export async function runInitCommand(
  options: Omit<InstructionsCommandOptions, "provider" | "forPath"> & {
    agents?: string | undefined;
    dryRun: boolean;
  },
): Promise<ExitCodeValue> {
  const rootResolution = await resolveCliRoot(options.root);
  if (!rootResolution.ok) {
    emitDiagnostic(
      { code: "environment-error", message: rootResolution.message },
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
