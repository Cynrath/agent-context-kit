import type { Finding } from "../scanner/types.js";
import { globMatches } from "./match.js";
import type { PolicyDocument } from "./types.js";

/** Minimal structural input accepted by the applier (audit 2.6). */
export interface AppliedPolicyInput {
  /** Flattened rule overrides/thresholds source (global semantics). */
  policy: Pick<PolicyDocument, "rules" | "thresholds" | "suppressions" | "forbiddenPatterns">;
  /**
   * Per-layer documents carrying their own pathScopes. When provided,
   * a layer's suppressions/forbidden patterns apply ONLY to paths matching
   * at least one of that layer's pathScopes (in addition to each entry's
   * own pathGlobs).
   */
  documents?: readonly PolicyDocument[] | undefined;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function active(suppression: { expiresAt?: string | undefined }): boolean {
  return suppression.expiresAt === undefined || suppression.expiresAt >= today();
}

/**
 * Applies an effective offline policy to findings (REQ-POL-001, audit 2.6):
 * - severity overrides from flattened rules;
 * - suppressions from flattened list AND from per-layer scoped documents;
 * - expiry honored (expired ⇒ inactive);
 * - layer pathScopes gate per-document entries.
 */
export function applyPolicyToFindings(
  findings: readonly Finding[],
  input: AppliedPolicyInput,
): Finding[] {
  const severityByRule = new Map(
    (input.policy.rules ?? [])
      .filter((rule) => rule.severity !== undefined)
      .map((rule) => [rule.ruleId, rule.severity as string]),
  );

  interface SuppressionView {
    ruleId: string;
    globs: readonly string[];
    reason: string;
    expiresAt?: string | undefined;
    scopes: readonly string[];
  }
  const suppressionViews: SuppressionView[] = (input.policy.suppressions ?? []).map((s) => ({
    ruleId: s.ruleId,
    globs: s.pathGlobs,
    reason: s.reason,
    expiresAt: s.expiresAt,
    scopes: [],
  }));
  for (const doc of input.documents ?? []) {
    if (doc.pathScopes.length === 0) continue; // already covered by flattened view
    for (const s of doc.suppressions) {
      suppressionViews.push({
        ruleId: s.ruleId,
        globs: s.pathGlobs,
        reason: s.reason,
        expiresAt: s.expiresAt,
        scopes: doc.pathScopes,
      });
    }
  }

  return findings.map((finding) => {
    let result = finding;

    const suppressed = suppressionViews.some((view) => {
      if (!active(view)) return false;
      if (view.ruleId !== finding.ruleId) return false;
      const globOk = view.globs.some((glob) => globMatches(glob, finding.relativePath));
      if (!globOk) return false;
      const scopeOk =
        view.scopes.length === 0 ||
        view.scopes.some((scope) => globMatches(scope, finding.relativePath));
      return scopeOk;
    });

    if (suppressed && !finding.suppressed) {
      result = { ...result, suppressed: true, suppressionReason: "policy suppression" };
    } else if (suppressed && finding.suppressed) {
      // Keep inline reason; still counts as suppressed.
    }

    const override = severityByRule.get(finding.ruleId);
    if (override !== undefined && override !== result.severity) {
      result = { ...result, severity: override as Finding["severity"] };
    }
    return result;
  });
}
