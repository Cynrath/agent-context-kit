import { z } from "zod";

/** Schema id for registered verdicts (ADR-0026 §4). */
export const VERDICT_SCHEMA_ID = "ackit.verdict.v1";

/** Verdict ids: VR-#### (allocation per task, append-only). */
export const VERDICT_ID_PATTERN = /^VR-\d{4}$/;

/** Acceptance criterion ids (mirrors evidence registry). */
const criterionId = z.string().regex(/^AC-\d{3}$/);

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, "expected a real calendar date (YYYY-MM-DD)");

const stableCode = z
  .string()
  .regex(/^[A-Z][A-Z0-9_]{2,63}$/, "stable upper-snake finding code expected");

/**
 * Registered verifier verdict (ackit.verdict.v1, ADR-0026 §4). Strict: unknown
 * fields rejected; forged attempts (wrong task, tampered criteria, blocking
 * findings on PASS) are rejected at registration. Append-only: a REWORK verdict
 * is never overwritten, only superseded by a later registered verdict.
 */
export const VerdictSchema = z.strictObject({
  schemaId: z.literal(VERDICT_SCHEMA_ID),
  id: z.string().regex(VERDICT_ID_PATTERN),
  taskId: z.string().regex(/^TASK-\d{4}$/),
  verdict: z.enum(["PASS", "PASS_WITH_WARNINGS", "REWORK_REQUIRED", "BLOCKED"]),
  verifier: z.object({
    agent: z.string().trim().min(1).max(120),
    context: z.enum(["fresh", "same"]),
    issuedAt: isoDate,
  }),
  findings: z
    .array(
      z.object({
        severity: z.enum(["blocking", "warning", "info"]),
        criterion: criterionId.optional(),
        code: stableCode,
        message: z.string().trim().min(1).max(1000),
      }),
    )
    .max(64),
  checkedCriteria: z.array(criterionId).max(128),
  summary: z.string().trim().max(2000),
});

export type Verdict = z.infer<typeof VerdictSchema>;

export interface VerdictProblem {
  code: string;
  message: string;
}

export const VERDICT_PROBLEM_CODES = {
  schema: "VERDICT-INVALID",
  taskUnknown: "VERDICT-TASK-UNKNOWN",
  criterionUnknown: "VERDICT-CRITERION-UNKNOWN",
  blockingOnPass: "VERDICT-BLOCKING-ON-PASS",
} as const;
