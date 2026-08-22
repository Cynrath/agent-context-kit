import { getPackageIdentity } from "../../shared/version.js";
import type { Finding } from "../scanner/types.js";

const SEVERITY_LEVEL: Record<string, "error" | "warning" | "note"> = {
  critical: "error",
  high: "error",
  medium: "warning",
  low: "note",
};

/**
 * SARIF 2.1.0 writer (REQ-RPT-001): stable rule ids, repo-relative artifact
 * URIs, correct regions/levels, evidence already redacted upstream so no
 * secret can appear (REQ-GOV-005).
 */
export function renderSarif(
  findings: readonly Finding[],
  options: { policyDigest?: string | undefined } = {},
): string {
  const identity = getPackageIdentity();
  const ruleIds = [...new Set(findings.map((finding) => finding.ruleId))].sort();
  const rules = ruleIds.map((ruleId) => ({
    id: ruleId,
    shortDescription: { text: `ACKit rule ${ruleId}` },
    help: {
      text: `See documentation key rules/${ruleId}`,
    },
  }));
  const results = findings.map((finding) => ({
    ruleId: finding.ruleId,
    level: SEVERITY_LEVEL[finding.severity] ?? "note",
    message: {
      text: `${finding.message}${finding.evidence.length > 0 ? ` [evidence: ${finding.evidence}]` : ""}`,
    },
    locations: [
      {
        physicalLocation: {
          artifactLocation: { uri: finding.relativePath.split("\\").join("/") },
          region: { startLine: finding.line, startColumn: finding.column },
        },
      },
    ],
    fingerprints: { "ackit/v1": finding.fingerprint },
    properties: {
      severity: finding.severity,
      category: finding.category,
      suppressed: finding.suppressed,
      ...(finding.suppressionReason !== null
        ? { suppressionReason: finding.suppressionReason }
        : {}),
      policyDigest: options.policyDigest ?? "",
    },
  }));
  return `${JSON.stringify(
    {
      $schema: "https://json.schemastore.org/sarif-2.1.0.json",
      version: "2.1.0",
      runs: [
        {
          tool: {
            driver: {
              name: "ackit",
              version: identity.version,
              informationUri: "https://github.com/Cynrath/agent-context-kit",
              rules,
            },
          },
          invocations: [{ executionSuccessful: true, endTimeUtc: undefined }],
          results,
        },
      ],
    },
    null,
    2,
  )}\n`;
}
