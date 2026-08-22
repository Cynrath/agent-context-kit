import { z } from "zod";

export const SEVERITY_ORDER = ["low", "medium", "high", "critical"] as const;
export type Severity = (typeof SEVERITY_ORDER)[number];

export const SCAN_CATEGORIES = [
  "secrets",
  "unsafe-path",
  "hygiene",
  "instruction-conflict",
  "instruction-scope",
  "instruction-staleness",
  "skill-validity",
  "absolute-path-leak",
  "generated-artifact",
  "binary-anomaly",
  "large-context-file",
  "config-problem",
  "task-docs-integrity",
  "ci-release-hygiene",
  "dependency-advisory",
] as const;

export type ScanCategory = (typeof SCAN_CATEGORIES)[number];

/**
 * Stable finding contract (REQ-SCAN-002). Evidence is already redacted when a
 * Finding is constructed — no reporter can ever see raw secret values
 * (REQ-GOV-005, ADR-0009).
 */
export const FindingSchema = z.strictObject({
  ruleId: z.string(),
  severity: z.enum(SEVERITY_ORDER),
  category: z.enum(SCAN_CATEGORIES),
  message: z.string(),
  relativePath: z.string(),
  line: z.number().int().positive(),
  column: z.number().int().positive(),
  fingerprint: z.string(),
  evidence: z.string(),
  remediation: z.string(),
  documentationKey: z.string(),
  suppressed: z.boolean().default(false),
  suppressionReason: z.string().nullable().default(null),
});

export type Finding = z.infer<typeof FindingSchema>;

/** Raw match data produced by a rule BEFORE redaction. Never leaves the pipeline. */
export interface FindingDraft {
  ruleId: string;
  severity: Severity;
  category: ScanCategory;
  message: string;
  /** Zero-based offset of the match inside the file content. */
  offset: number;
  /** Raw matched text — redacted by the pipeline before any Finding exists. */
  rawEvidence: string;
  remediation: string;
  documentationKey: string;
}

export interface ScanRuleContext {
  relativePath: string;
  content: string;
}

/**
 * A scan rule (ADR-0009). Pure function over file content; deterministic and
 * offline. Registered in the central registry with a stable ACKIT<NNN> id.
 */
export interface ScanRule {
  id: string;
  category: ScanCategory;
  severity: Severity;
  documentationKey: string;
  remediation: string;
  appliesTo(relativePath: string): boolean;
  evaluate(context: ScanRuleContext): FindingDraft[];
}

export interface ScanDiagnostic {
  code: string;
  message: string;
  relativePath?: string | undefined;
}

export interface ScanSummaryEntry {
  severity: Severity;
  count: number;
}

export interface ScanResult {
  findings: Finding[];
  diagnostics: ScanDiagnostic[];
  filesScanned: number;
  /** True when cancellation fired mid-scan (JSON stays valid either way). */
  aborted: boolean;
}

export function severityAtLeast(severity: Severity, threshold: Severity): boolean {
  return SEVERITY_ORDER.indexOf(severity) >= SEVERITY_ORDER.indexOf(threshold);
}
