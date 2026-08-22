import { stableStringify } from "../config/load.js";
import { type Finding, FindingSchema, type ScanResult } from "../scanner/types.js";

export const SCAN_REPORT_SCHEMA_VERSION = "ackit.scan.v0";

export interface ScanReportJson {
  schemaVersion: typeof SCAN_REPORT_SCHEMA_VERSION;
  tool: string;
  command: "scan";
  aborted: boolean;
  summary: {
    filesScanned: number;
    totalFindings: number;
    bySeverity: Record<string, number>;
  };
  diagnostics: ScanResult["diagnostics"];
  findings: unknown[];
}

/**
 * Canonical JSON report (REQ-SCAN-007): pure machine-readable stdout,
 * deterministic byte-for-byte for identical repo+config (REQ-TEST-006) —
 * no timestamps or machine-dependent fields.
 */
export function renderScanJson(result: ScanResult): string {
  const bySeverity: Record<string, number> = {};
  for (const finding of result.findings) {
    bySeverity[finding.severity] = (bySeverity[finding.severity] ?? 0) + 1;
  }
  const report: ScanReportJson = {
    schemaVersion: SCAN_REPORT_SCHEMA_VERSION,
    tool: "ackit",
    command: "scan",
    aborted: result.aborted,
    summary: {
      filesScanned: result.filesScanned,
      totalFindings: result.findings.length,
      bySeverity,
    },
    diagnostics: result.diagnostics,
    findings: result.findings,
  };
  // Validate every finding against the published contract before emitting.
  for (const finding of result.findings) {
    FindingSchema.parse(finding);
  }
  return `${JSON.stringify(report, null, 2)}\n`;
}

/** Deterministic hashable form used in contract snapshots. */
export function scanReportCanonical(result: ScanResult): string {
  return stableStringify(result);
}

export function parseFindingContract(value: unknown): Finding {
  return FindingSchema.parse(value);
}
