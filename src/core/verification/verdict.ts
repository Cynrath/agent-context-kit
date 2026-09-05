import { z } from "zod";
import { domainDigest } from "./canonical.js";

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
  /**
   * Digest of the v2 bundle JSON the verifier reviewed (TASK-0080,
   * ADR-0031): the exact bundle/state reference for this verdict. `null`
   * for same-context verdicts registered without bundle proof. Optional
   * (not required) so TASK-0079-era v2 records stay readable — absent is
   * classified exactly like `null` (no proof, never independent).
   */
  reviewedBundleDigest: hex64.nullable().optional(),
});

export type BoundVerdict = z.infer<typeof VerdictV2Schema>;

/** Stored verdict record: legacy v1 (unbound history) or bound v2. */
export type VerdictRecord = Verdict | BoundVerdict;

/** True for state-bound v2 records (type narrow for freshness checks). */
export function isBoundVerdict(record: VerdictRecord): record is BoundVerdict {
  return (record as BoundVerdict).schemaId === VERDICT_SCHEMA_ID_V2;
}

/** Domain for verdict-content digests (replay detection, ADR-0031 §3). */
export const VERDICT_CONTENT_DOMAIN = "verdict-content";

/**
 * Project the authoring subset of a verdict candidate or stored record:
 * exactly what a verifier judged (store-allocated id/taskId, the binding,
 * and the reviewed-bundle reference never participate — they describe
 * registration, not judgment, so re-registering the same judgment after
 * state moved on is detected as replay even though the new binding would
 * differ).
 */
export function projectVerdictAuthoring(value: {
  verdict: unknown;
  verifier: unknown;
  findings: unknown;
  checkedCriteria: unknown;
  summary: unknown;
}): {
  verdict: unknown;
  verifier: unknown;
  findings: unknown;
  checkedCriteria: unknown;
  summary: unknown;
} {
  return {
    verdict: value.verdict,
    verifier: value.verifier,
    findings: value.findings,
    checkedCriteria: value.checkedCriteria,
    summary: value.summary,
  };
}

/**
 * Canonical content digest of a verdict's authoring subset (TASK-0080
 * replay detection, wired to the TASK-0079 canonical module: same content
 * in any process yields the identical digest — no timestamps of our own,
 * no paths, no insertion-order dependence).
 */
export function verdictContentDigest(
  authoring: ReturnType<typeof projectVerdictAuthoring>,
): string {
  return domainDigest(VERDICT_CONTENT_DOMAIN, authoring);
}

/** How a verdict relates to independent verification (ADR-0031 §2). */
export type IndependenceBasis =
  | "reviewed-bundle"
  | "self-issued"
  | "same-context"
  | "legacy-unbound";

export interface IndependenceAssessment {
  /** True only for a fresh-context claim proven by the reviewed bundle. */
  independent: boolean;
  basis: IndependenceBasis;
  /** Reviewed bundle digest (`null` when no bundle proof was supplied). */
  reviewedBundleDigest: string | null;
  /** Stable diagnostic code, or null when independent. */
  problemCode: string | null;
}

/**
 * Structural independence assessment (TASK-0080, ADR-0031 §2): pure
 * function of the stored record — no IO, no clock, no identity crypto.
 * A verdict is independent iff it claims a fresh context AND references
 * the exact bundle digest it is bound to (proof the verifier reviewed
 * that bundle). Everything else is flagged explicitly and never silently
 * qualifies where independence is required.
 */
export function assessVerdictIndependence(record: VerdictRecord): IndependenceAssessment {
  if (!isBoundVerdict(record)) {
    return {
      independent: false,
      basis: "legacy-unbound",
      reviewedBundleDigest: null,
      problemCode: VERDICT_PROBLEM_CODES.bindingMissing,
    };
  }
  const reviewed = record.reviewedBundleDigest ?? null;
  if (record.verifier.context !== "fresh") {
    return {
      independent: false,
      basis: "same-context",
      reviewedBundleDigest: reviewed,
      problemCode: VERDICT_PROBLEM_CODES.independenceUnproven,
    };
  }
  if (reviewed === null) {
    return {
      independent: false,
      basis: "self-issued",
      reviewedBundleDigest: null,
      problemCode: VERDICT_PROBLEM_CODES.independenceUnproven,
    };
  }
  if (reviewed !== record.binding.bundleDigest) {
    return {
      independent: false,
      basis: "self-issued",
      reviewedBundleDigest: reviewed,
      problemCode: VERDICT_PROBLEM_CODES.bundleMismatch,
    };
  }
  return {
    independent: true,
    basis: "reviewed-bundle",
    reviewedBundleDigest: reviewed,
    problemCode: null,
  };
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
  /**
   * Independence unproven (TASK-0080, ADR-0031): a fresh-context verdict
   * without reviewed-bundle proof at registration, or a non-independent
   * latest verdict where the effective profile requires an independent one.
   */
  independenceUnproven: "VERDICT-INDEPENDENCE-UNPROVEN",
  /**
   * Replay refused (TASK-0080, ADR-0031): byte-identical verdict content
   * (canonical authoring digest) is already registered for this task.
   */
  replayRejected: "VERDICT-REPLAY-REJECTED",
} as const;
