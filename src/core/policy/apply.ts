import type { Finding } from "../scanner/types.js";
import type { PolicyDocument } from "./types.js";

/**
 * Applies an effective policy to findings (REQ-POL-001): active suppressions
 * (pathGlobs + expiry) and severity overrides. Lives in core so scan, MCP
 * and reports share one implementation.
 */
export function applyPolicyToFindings(
  findings: readonly Finding[],
  policy: PolicyDocument,
): Finding[] {
  const today = new Date().toISOString().slice(0, 10);
  const severityByRule = new Map(
    (policy.rules ?? [])
      .filter((rule) => rule.severity !== undefined)
      .map((rule) => [rule.ruleId, rule.severity as string]),
  );
  return findings.map((finding) => {
    let result = finding;
    const suppressedByPolicy = policy.suppressions.some((suppression) => {
      if (suppression.ruleId !== finding.ruleId) return false;
      if (suppression.expiresAt !== undefined && suppression.expiresAt < today) return false;
      return suppression.pathGlobs.some((glob) => globMatches(glob, finding.relativePath));
    });
    if (suppressedByPolicy && !finding.suppressed) {
      const match = policy.suppressions.find(
        (suppression) => suppression.ruleId === finding.ruleId,
      );
      result = {
        ...result,
        suppressed: true,
        suppressionReason: `policy suppression${match?.expiresAt !== undefined ? ` (expires ${match.expiresAt})` : ""}`,
      };
    }
    const override = severityByRule.get(finding.ruleId);
    if (override !== undefined && override !== result.severity) {
      result = { ...result, severity: override as Finding["severity"] };
    }
    return result;
  });
}

/** Minimal glob → matcher: `**` spans segments, `*` matches within one. */
export function globMatches(glob: string, relativePath: string): boolean {
  const NUL = String.fromCharCode(0);
  const source = glob
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, NUL)
    .replace(/\*/g, "[^/]*")
    .split(NUL)
    .join(".*");
  return new RegExp(`^${source}$`).test(relativePath);
}
