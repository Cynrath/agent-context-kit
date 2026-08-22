import { type ScanResult, SEVERITY_ORDER } from "../scanner/types.js";

/**
 * Pretty terminal reporter (REQ-SCAN-007). All text passes through the
 * terminal sanitizer before writing (REQ-GOV-005/SEC-003); no absolute
 * paths are printed — findings already carry repo-relative paths.
 */
export function renderScanTerminal(result: ScanResult): string {
  const lines: string[] = [];
  lines.push(
    `Scan complete: ${result.filesScanned} files scanned, ${result.findings.length} finding(s)`,
  );
  if (result.aborted) {
    lines.push("Scan aborted before completion (results partial).");
  }
  if (result.findings.length > 0) {
    for (const severity of [...SEVERITY_ORDER].reverse()) {
      const group = result.findings.filter((finding) => finding.severity === severity);
      if (group.length === 0) continue;
      lines.push("");
      lines.push(`${severity.toUpperCase()} (${group.length})`);
      for (const finding of group) {
        lines.push(
          `  ${finding.ruleId} ${finding.relativePath}:${finding.line}:${finding.column} ${finding.message}`,
        );
        if (finding.evidence.length > 0) {
          lines.push(`    evidence: ${finding.evidence}`);
        }
      }
    }
  }
  if (result.diagnostics.length > 0) {
    lines.push("");
    lines.push(`Diagnostics (${result.diagnostics.length})`);
    for (const diagnostic of result.diagnostics) {
      const location = diagnostic.relativePath !== undefined ? ` [${diagnostic.relativePath}]` : "";
      lines.push(`  ${diagnostic.code}${location}: ${diagnostic.message}`);
    }
  }
  return `${lines.join("\n")}\n`;
}
