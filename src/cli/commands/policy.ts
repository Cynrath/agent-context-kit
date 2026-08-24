import { loadAckitConfig } from "../../core/config/index.js";
import { PolicyError, policyDigest, resolvePolicy } from "../../core/policy/index.js";
import { emitDiagnostic } from "../../shared/diagnostics.js";
import { EXIT_CODES, type ExitCodeValue } from "../../shared/exit-codes.js";
import type { InstructionsCommandOptions } from "../context.js";
import { resolveCliRoot } from "../root.js";
import { reportConfigErrors } from "./config.js";

/** `ackit policy check` (REQ-POL-001/002). */
export async function runPolicyCheckCommand(
  options: Omit<InstructionsCommandOptions, "provider" | "forPath">,
): Promise<ExitCodeValue> {
  const rootResolution = await resolveCliRoot(options.root);
  if (!rootResolution.ok) {
    emitDiagnostic(
      { code: "environment-error", message: rootResolution.message },
      { quiet: options.quiet, debug: options.debug },
    );
    return EXIT_CODES.environment;
  }
  const configResult = await loadAckitConfig(rootResolution.root.canonicalPath, {
    configPath: options.config,
  });
  if (!configResult.ok) {
    reportConfigErrors(configResult.errors, { quiet: options.quiet, debug: options.debug });
    return EXIT_CODES.usage;
  }
  try {
    const resolved = await resolvePolicy(rootResolution.root, {
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
