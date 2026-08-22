import { getPackageIdentity } from "../../shared/version.js";
import { type Finding, SEVERITY_ORDER } from "../scanner/types.js";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Markdown summary report (REQ-SCAN-007). */
export function renderMarkdownReport(
  findings: readonly Finding[],
  meta: { filesScanned: number; policyDigest?: string | undefined },
): string {
  const identity = getPackageIdentity();
  const lines: string[] = [
    "# ACKit Scan Report",
    "",
    `Tool: ackit ${identity.version} · Files: ${meta.filesScanned} · Findings: ${findings.length}`,
    `Policy digest: \`${meta.policyDigest ?? "n/a"}\``,
    "",
    "| Severity | Count |",
    "|---|---|",
  ];
  for (const severity of SEVERITY_ORDER) {
    const count = findings.filter((finding) => finding.severity === severity).length;
    lines.push(`| ${severity} | ${count} |`);
  }
  for (const severity of [...SEVERITY_ORDER].reverse()) {
    const group = findings.filter((finding) => finding.severity === severity);
    if (group.length === 0) continue;
    lines.push("", `## ${severity.toUpperCase()}`, "");
    for (const finding of group) {
      lines.push(
        `- **${finding.ruleId}** \`${finding.relativePath}:${finding.line}:${finding.column}\` — ${finding.message}`,
        finding.evidence.length > 0 ? `  - evidence: \`${finding.evidence}\`` : "",
      );
    }
  }
  return `${lines.filter((line) => line !== "").join("\n")}\n`;
}

/**
 * Self-contained HTML report (REQ-RPT-002): inline styles only, no external
 * URLs/assets, all dynamic text HTML-escaped (terminal + injection safety).
 */
export function renderHtmlReport(
  findings: readonly Finding[],
  meta: { filesScanned: number; policyDigest?: string | undefined },
): string {
  const identity = getPackageIdentity();
  const rows = findings
    .map(
      (finding) =>
        `<tr class="sev-${escapeHtml(finding.severity)}"><td>${escapeHtml(finding.severity)}</td><td>${escapeHtml(finding.ruleId)}</td><td><code>${escapeHtml(finding.relativePath)}:${finding.line}</code></td><td>${escapeHtml(finding.message)}</td></tr>`,
    )
    .join("\n");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>ACKit Scan Report</title>
<style>
body{font-family:system-ui,sans-serif;margin:2rem;color:#111}
table{border-collapse:collapse;width:100%}
td,th{border:1px solid #ddd;padding:.4rem .6rem;text-align:left}
.sev-critical td:first-child,.sev-high td:first-child{color:#b00;font-weight:600}
</style>
</head>
<body>
<h1>ACKit Scan Report</h1>
<p>ackit ${escapeHtml(identity.version)} · files: ${meta.filesScanned} · findings: ${findings.length} · policy digest: <code>${escapeHtml(meta.policyDigest ?? "n/a")}</code></p>
<table>
<thead><tr><th>severity</th><th>rule</th><th>location</th><th>message</th></tr></thead>
<tbody>
${rows}
</tbody>
</table>
</body>
</html>
`;
}
