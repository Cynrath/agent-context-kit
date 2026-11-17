import { getPackageIdentity } from "../../shared/version.js";
import type { OptimizeSuggestion } from "../context/optimize.js";
import type { Finding } from "../scanner/types.js";

/** Shared SARIF projection; optimizer categories are also valid properties. */
export type SarifFinding = Omit<
  Finding,
  "category" | "remediation" | "documentationKey" | "relativePath" | "line" | "column"
> & {
  category: string;
  relativePath?: string;
  line?: number;
  column?: number;
  remediation?: string;
  documentationKey?: string;
};

type OptimizeSarifSource = Pick<
  OptimizeSuggestion,
  "id" | "severity" | "message" | "evidence" | "evidencePaths"
> & { category: string };

export function projectOptimizeSuggestions(
  suggestions: readonly OptimizeSarifSource[],
): SarifFinding[] {
  return suggestions.map((suggestion) => ({
    ruleId: suggestion.id,
    category: suggestion.category,
    severity: suggestion.severity,
    message: suggestion.message,
    relativePath: suggestion.evidence?.[0]?.relativePath ?? suggestion.evidencePaths[0],
    line: suggestion.evidence?.[0]?.line ?? 1,
    column: 1,
    evidence: "",
    fingerprint: suggestion.id,
    suppressed: false,
    suppressionReason: null,
  }));
}

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
  findings: readonly SarifFinding[],
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
    ...(finding.relativePath
      ? {
          locations: [
            {
              physicalLocation: {
                artifactLocation: {
                  uri: finding.relativePath
                    .split("\\")
                    .join("/")
                    .split("/")
                    .map(encodeURIComponent)
                    .join("/"),
                },
                region: { startLine: finding.line ?? 1, startColumn: finding.column ?? 1 },
              },
            },
          ],
        }
      : {}),
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
