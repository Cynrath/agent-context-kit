import { z } from "zod";

/** Schema id for registered verdicts (ADR-0026 §4). */
export const VERDICT_SCHEMA_ID = "ackit.verdict.v1";

/** Schema id for state-bound verdicts (TASK-0079, ADR-0030). */
export const VERDICT_SCHEMA_ID_V2 = "ackit.verdict.v2";

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

const hex64 = z.string().regex(/^[0-9a-f]{64}$/, "state digest hex expected");

/**
 * State-binding record attached at registration (TASK-0079, ADR-0030).
 * Strict: unknown fields rejected. Computed by ACKit from CURRENT state at
 * registration — never trusted from verdict input (a self-declared binding
 * fails input validation with VERDICT-INVALID). No timestamps, no paths, no
 * secrets: digests and the task id only.
 */
export const VerdictBindingSchema = z.strictObject({
  version: z.literal(1),
  stateDigest: hex64,
  bundleDigest: hex64,
  components: z.strictObject({
    sourceState: hex64,
    taskContract: hex64,
    intent: hex64,
    artifacts: hex64,
    workflow: hex64,
    config: hex64,
    policy: hex64,
    evidence: hex64,
  }),
  /**
   * True when git was unavailable at registration and source state is the
   * explicitly degraded marker (ADR-0030 §4): the long-lived record carries
   * the weakness visibly instead of a silent strong claim.
   */
  gitUnavailable: z.boolean(),
});

export type VerdictBinding = z.infer<typeof VerdictBindingSchema>;

/**
 * State-bound verdict (ackit.verdict.v2, ADR-0030): the v1 authoring shape
 * plus the registration-time binding. Historical v1 verdicts stay readable
 * as legacy history but never satisfy a state-bound completion requirement.
 */
export const VerdictV2Schema = z.strictObject({
  schemaId: z.literal(VERDICT_SCHEMA_ID_V2),
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
  binding: VerdictBindingSchema,
});

export type BoundVerdict = z.infer<typeof VerdictV2Schema>;

/** Stored verdict record: legacy v1 (unbound history) or bound v2. */
export type VerdictRecord = Verdict | BoundVerdict;

/** True for state-bound v2 records (type narrow for freshness checks). */
export function isBoundVerdict(record: VerdictRecord): record is BoundVerdict {
  return (record as BoundVerdict).schemaId === VERDICT_SCHEMA_ID_V2;
}

export interface VerdictProblem {
  code: string;
  message: string;
}

export const VERDICT_PROBLEM_CODES = {
  schema: "VERDICT-INVALID",
  taskUnknown: "VERDICT-TASK-UNKNOWN",
  criterionUnknown: "VERDICT-CRITERION-UNKNOWN",
  blockingOnPass: "VERDICT-BLOCKING-ON-PASS",
  /** Bound data absent where required (legacy unbound v1 in a bound gate). */
  bindingMissing: "VERDICT-BINDING-MISSING",
  /** Submitted bundle digest differs from recomputed current state. */
  bundleMismatch: "VERDICT-BUNDLE-MISMATCH",
  /** Stored binding differs from recomputed current state. */
  stateStale: "VERDICT-STATE-STALE",
} as const;
