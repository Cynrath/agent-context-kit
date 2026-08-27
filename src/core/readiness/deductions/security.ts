import type { ScanResult } from "../../scanner/types.js";
import type { Deduction } from "../types.js";
import { redactExcerpt } from "./redact.js";

export function collectSecurityDeductions(scan: ScanResult | null | undefined): Deduction[] {
  const out: Deduction[] = [];
  if (!scan || !Array.isArray(scan.findings)) return out;

  // Map findings to deductions based on category/severity
  // secrets -> high 10, private key -> critical 15, etc.
  let hasSecret = false;
  for (const f of scan.findings) {
    // Avoid absolute paths; ensure relativePath is already repo-relative
    const rel = toPosix(f.relativePath);
    if (f.category === "secrets" || f.ruleId.startsWith("ACKIT00")) {
      if (!hasSecret) {
        out.push({
          id: "READINESS-SEC-SECRET-001",
          category: "security",
          points: 10,
          severity: "high",
          reason: `Secret pattern ${f.ruleId} in ${rel}:${f.line} — redact example value`,
          evidence: { relativePath: rel, line: f.line, excerpt: redactExcerpt(f.evidence) },
          remediation: "Redact secret or move to env",
          fingerprint: `READINESS-SEC-SECRET-001:${rel}`,
        });
        hasSecret = true;
      }
    } else if (f.category === "unsafe-path") {
      out.push({
        id: "READINESS-SEC-PATH-001",
        category: "security",
        points: 5,
        severity: "medium",
        reason: `Unsafe path reference in ${rel}`,
        evidence: { relativePath: rel, line: f.line, excerpt: redactExcerpt(f.evidence) },
        remediation: "Validate path containment",
        fingerprint: `READINESS-SEC-PATH-001:${rel}`,
      });
      break;
    }
  }

  // If multiple secrets, add truncated diagnostic via info? But we cap.
  // Detect private key specifically via evidence containing BEGIN PRIVATE KEY
  const hasPrivateKey = scan.findings.some(
    (f) => f.evidence.includes("PRIVATE KEY") || f.ruleId === "ACKIT002",
  );
  if (hasPrivateKey && !hasSecret) {
    // Already covered; but if hasPrivateKey separate, add critical
    out.push({
      id: "READINESS-SEC-PRIVATE-KEY-001",
      category: "security",
      points: 15,
      severity: "critical",
      reason: "Private key detected",
      evidence: {
        relativePath: "secrets.pem",
        excerpt: redactExcerpt("-----BEGIN PRIVATE KEY-----"),
      },
      remediation: "Remove private key",
      fingerprint: "READINESS-SEC-PRIVATE-KEY-001:secrets.pem",
    });
  }

  return out;
}

function toPosix(p: string): string {
  return p.split("\\").join("/");
}
