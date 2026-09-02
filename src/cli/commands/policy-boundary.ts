import path from "node:path";
import process from "node:process";
import { emitDiagnostic } from "../../shared/diagnostics.js";
import { EXIT_CODES, type ExitCodeValue } from "../../shared/exit-codes.js";

/**
 * Boundary enforcement for ACKit-owned write surfaces (ADR-0028 §1).
 * Mirrors the `task complete --force` precedent (task.ts): an explicit deny
 * refuses with POLICY-TIER-DENIED (exit 4), an explicit ask in a
 * non-interactive context is treated as deny (no silent bypass), and — for
 * compatibility — repositories whose policy layers never explicitly set the
 * boundary's tier keep today's behavior (the boundary proceeds; the default
 * table is advisory for unconfigured repos). Every enforcement decision is
 * journaled as a `policy-decision` event (best-effort).
 *
 * Returns an exit code to emit when the boundary is refused, or null to
 * continue with the command.
 */
export async function enforceAckitBoundary(options: {
  boundary: "forceCompletion" | "checkpointExport" | "verdictRegistration";
  root?: string | undefined;
  quiet: boolean;
  debug?: boolean | undefined;
}): Promise<ExitCodeValue | null> {
  try {
    const rootPath = path.resolve(options.root ?? process.cwd());
    const { loadAckitConfig } = await import("../../core/config/index.js");
    const { enforceBoundary, resolveAutonomy, resolvePolicy } = await import(
      "../../core/policy/index.js"
    );
    const configResult = await loadAckitConfig(rootPath, {});
    const layers: unknown[] = [];
    if (configResult.ok) {
      const resolvedPolicy = await resolvePolicy(
        { canonicalPath: rootPath },
        { entryFiles: configResult.config.policy.extends },
      );
      for (const document of resolvedPolicy.documents) {
        const doc = document as { autonomy?: unknown };
        layers.push(doc.autonomy);
      }
      layers.push(configResult.config.autonomy);
    }
    const report = resolveAutonomy(layers);
    const evaluation = enforceBoundary(options.boundary, report);
    try {
      const { JournalStore } = await import("../../core/journal/index.js");
      const { resolveRepositoryRoot } = await import("../../core/filesystem/root.js");
      const resolvedRoot = await resolveRepositoryRoot(rootPath);
      if (resolvedRoot.ok) {
        // Detail shape must match the journal's strict policy-decision kind
        // (boundary/tier/decision only — enforced flags are not journaled).
        await new JournalStore(resolvedRoot.root).append("policy-decision", {
          boundary: options.boundary,
          tier: evaluation.tier,
          decision: evaluation.decision,
        });
      }
    } catch {
      // journal best-effort
    }
    if (!evaluation.enforce) return null;
    if (evaluation.decision === "deny") {
      emitDiagnostic(
        {
          code: "POLICY-TIER-DENIED",
          message: `${options.boundary} refused: ${evaluation.reason} (POLICY-TIER-DENIED)`,
        },
        { quiet: options.quiet, debug: options.debug ?? false },
      );
      return EXIT_CODES.securityBoundary;
    }
    // decision === "ask" (explicitly set) and non-interactive → deny.
    if (process.stdout.isTTY !== true) {
      emitDiagnostic(
        {
          code: "POLICY-TIER-ASK",
          message: `${options.boundary} requires interactive confirmation: ${evaluation.reason}; non-interactive contexts treat ask as deny`,
        },
        { quiet: options.quiet, debug: options.debug ?? false },
      );
      return EXIT_CODES.securityBoundary;
    }
    return null;
  } catch {
    // Policy resolution failures never crash the gated command; fail-open on
    // the TIER CHECK only (the owning gate remains the authority) — same
    // documented limitation as the --force path.
    return null;
  }
}
