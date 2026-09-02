import { z } from "zod";

/** Schema id for the evidence registry (ADR-0026). */
export const EVIDENCE_SCHEMA_ID = "ackit.evidence.v2";

/** Acceptance criterion ids: AC-### (mirrors intent criteria). */
export const CRITERION_ID_PATTERN = /^AC-\d{3}$/;

/**
 * Frozen evidence type enum (ADR-0026 §1). `manual` is intentionally weak:
 * manual-only evidence is insufficient unless explicitly configured.
 */
export const EVIDENCE_TYPES = [
  "test",
  "build",
  "lint",
  "typecheck",
  "benchmark",
  "runtime",
  "e2e",
  "ci",
  "git",
  "static-analysis",
  "security-scan",
  "manual",
  "external",
  "verifier-verdict",
] as const;
export type EvidenceType = (typeof EVIDENCE_TYPES)[number];

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, "expected a real calendar date (YYYY-MM-DD)");

/** Bounded evidence reference: command, path, run id, or record id — never a secret. */
const evidenceRef = z.string().trim().min(1).max(500);

export const EvidenceEntrySchema = z.object({
  type: z.enum(EVIDENCE_TYPES),
  ref: evidenceRef,
  /** Date-only ISO, determinism. */
  recordedAt: isoDate,
});
export type EvidenceEntry = z.infer<typeof EvidenceEntrySchema>;

export const AcceptanceCriterionSchema = z.object({
  id: z.string().regex(CRITERION_ID_PATTERN),
  requirement: z.string().trim().min(1).max(2000),
  status: z.enum(["unverified", "verified"]),
  evidence: z.array(EvidenceEntrySchema).max(32),
});
export type AcceptanceCriterion = z.infer<typeof AcceptanceCriterionSchema>;

/**
 * Per-task evidence registry (ackit.evidence.v2, ADR-0026): links acceptance
 * criteria to typed proof. Strict: unknown fields rejected (untrusted local
 * state, THREAT_MODEL T17). The task document remains the criterion source of
 * truth; `sync` derives criteria from it.
 */
export const EvidenceRegistrySchema = z.strictObject({
  schemaId: z.literal(EVIDENCE_SCHEMA_ID),
  taskId: z.string().regex(/^TASK-\d{4}$/),
  criteria: z.array(AcceptanceCriterionSchema).max(128),
  updatedAt: isoDate,
});

export type EvidenceRegistry = z.infer<typeof EvidenceRegistrySchema>;

/** Stable validation finding codes (ADR-0026 §2). */
export const EVIDENCE_PROBLEM_CODES = {
  requiredEvidenceMissing: "REQUIRED_EVIDENCE_MISSING",
  criterionUnverified: "CRITERION_UNVERIFIED",
  evidenceRefInvalid: "EVIDENCE_REF_INVALID",
  secretRef: "EVIDENCE_SECRET_REF",
} as const;

export interface EvidenceProblem {
  code: string;
  criterionId?: string | undefined;
  message: string;
}

export interface EvidenceValidationResult {
  ok: boolean;
  problems: EvidenceProblem[];
}
