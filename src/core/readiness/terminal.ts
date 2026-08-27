import type { ScoreReport } from "./types.js";

export function renderReadinessTerminal(report: ScoreReport): string {
  const lines: string[] = [];
  const bar = (score: number | null): string => {
    if (score === null) return "n/a";
    const filled = Math.round((score / 100) * 20);
    const empty = 20 - filled;
    return `${"█".repeat(filled)}${"░".repeat(empty)}`;
  };
  const thresh = report.threshold
    ? `  (threshold ${report.threshold.requested} — ${report.threshold.passed ? "pass" : "fail"})`
    : "";
  lines.push(`Readiness  ${report.overall}/100  ${bar(report.overall)}${thresh}`);
  for (const cat of report.categories) {
    if (cat.status === "n/a") {
      lines.push(
        `  ${pad(cat.label, 20)} n/a — ${cat.reason ?? "excluded"} (excluded, weights renormalized)`,
      );
      continue;
    }
    const eff = cat.effectiveWeight.toFixed(1);
    lines.push(
      `  ${pad(cat.label, 20)} ${String(cat.score).padStart(3)}/100  ${bar(cat.score)}  (weight ${cat.weight} → eff ${eff})`,
    );
    for (const d of cat.deductions) {
      const sev = `[${d.severity.toUpperCase().padEnd(7)} -${d.points}]`;
      const loc = d.evidence.line
        ? `${d.evidence.relativePath}:${d.evidence.line}`
        : d.evidence.relativePath;
      lines.push(`    - ${sev} ${d.reason} (${loc}) — ${d.remediation ?? ""}`.trimEnd());
    }
  }
  if (report.baseline) {
    lines.push(
      `  Baseline delta: ${report.baseline.delta > 0 ? "+" : ""}${report.baseline.delta} (was ${report.baseline.baselineScore} → now ${report.overall})`,
    );
  }
  return `${lines.join("\n")}\n`;
}

function pad(s: string, n: number): string {
  if (s.length >= n) return s.slice(0, n);
  return s + " ".repeat(n - s.length);
}
