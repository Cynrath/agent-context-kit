import { loadAckitConfig } from "../../core/config/index.js";
import {
  PolicyError,
  policyDigest,
  resolveAutonomy,
  resolvePolicy,
  resolveReview,
} from "../../core/policy/index.js";
import { emitDiagnostic } from "../../shared/diagnostics.js";
import { EXIT_CODES, type ExitCodeValue } from "../../shared/exit-codes.js";
import type { InstructionsCommandOptions } from "../context.js";
import { resolveCliRoot } from "../root.js";
import { reportConfigErrors } from "./config.js";

/** `ackit policy check` (REQ-POL-001/002 + policy v2 surfaces, ADR-0028). */
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
    // Policy v2 surfaces (ADR-0028): autonomy table + review policy resolved
    // from document layers over config (deny wins) and printed alongside the
    // digest so users can see the effective risk-tier decisions.
    const autonomyLayers: unknown[] = [];
    const reviewLayers: unknown[] = [];
    for (const document of resolved.documents) {
      const doc = document as { autonomy?: unknown; review?: unknown };
      autonomyLayers.push(doc.autonomy);
      reviewLayers.push(doc.review);
    }
    autonomyLayers.push(configResult.config.autonomy);
    reviewLayers.push(configResult.config.review);
    const { autonomy, diagnostics: autonomyDiag } = resolveAutonomy(autonomyLayers);
    const { review, diagnostics: reviewDiag } = resolveReview(reviewLayers);
    const allDiag = [...resolved.diagnostics, ...autonomyDiag, ...reviewDiag];
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
            autonomy,
            review,
            diagnostics: allDiag,
          },
          null,
          2,
        )}\n`,
      );
    } else if (!options.quiet) {
      process.stdout.write(
        `policy OK — chain (${resolved.chain.length}), digest ${policyDigest(resolved.policy).slice(0, 12)}\n`,
      );
      process.stdout.write(
        `autonomy: tier0=${autonomy.tier0} tier1=${autonomy.tier1} tier2=${autonomy.tier2} tier3=${autonomy.tier3} tier4=${autonomy.tier4}\n`,
      );
      process.stdout.write(
        `review: required=[${review.required.join(", ")}] blocking=[${review.blockingSeverity.join(", ")}]\n`,
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
