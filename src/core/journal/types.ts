import { z } from "zod";

/** Schema id for journal events (ADR-0027 §6). */
export const JOURNAL_SCHEMA_ID = "ackit.execution-journal.v1";

/**
 * CLOSED event-kind list (ADR-0027 §6): structurally excludes conversation,
 * hidden chain-of-thought, and provider tool-call capture — those kinds do
 * not exist in this enum and cannot be journaled (THREAT_MODEL T26).
 */
export const JOURNAL_EVENT_KINDS = [
  "task-transition",
  "ackit-command",
  "policy-decision",
  "evidence-registered",
  "verdict-registered",
  "checkpoint-created",
  "workflow-stage",
  "verification-attempt",
] as const;
export type JournalEventKind = (typeof JOURNAL_EVENT_KINDS)[number];

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, "expected a real calendar date (YYYY-MM-DD)");

/** Per-kind detail shapes (strict, bounded — never raw conversation content). */
const TaskTransitionDetail = z.strictObject({
  from: z.enum(["pending", "active", "completed", "blocked"]).optional(),
  to: z.enum(["pending", "active", "completed", "blocked"]),
  taskId: z.string().regex(/^TASK-\d{4}$/),
});
const AckitCommandDetail = z.strictObject({
  command: z.string().trim().min(1).max(200),
  /** Outcome code only — never arguments that could embed secrets. */
  outcome: z.enum(["ok", "usage", "threshold", "environment", "security", "internal"]),
});
const PolicyDecisionDetail = z.strictObject({
  boundary: z.string().trim().min(1).max(120),
  tier: z.enum(["tier0", "tier1", "tier2", "tier3", "tier4"]),
  decision: z.enum(["allow", "ask", "deny"]),
});
const EvidenceDetail = z.strictObject({
  taskId: z.string().regex(/^TASK-\d{4}$/),
  criterion: z.string().regex(/^AC-\d{3}$/),
  type: z.string().trim().min(1).max(40),
});
const VerdictDetail = z.strictObject({
  taskId: z.string().regex(/^TASK-\d{4}$/),
  verdict: z.enum(["PASS", "PASS_WITH_WARNINGS", "REWORK_REQUIRED", "BLOCKED"]),
});
const CheckpointDetail = z.strictObject({
  taskId: z.string().regex(/^TASK-\d{4}$/),
  checkpoint: z.string().regex(/^CP-\d{4}$/),
});
const WorkflowStageDetail = z.strictObject({
  taskId: z.string().regex(/^TASK-\d{4}$/),
  stage: z
    .enum([
      "task",
      "intent",
      "spec",
      "plan",
      "tasks",
      "implement",
      "verify",
      "review",
      "independent-review",
      "release-evidence",
    ])
    .optional(),
  profile: z.enum(["quick", "standard", "high-risk"]),
});
const VerificationAttemptDetail = z.strictObject({
  taskId: z.string().regex(/^TASK-\d{4}$/),
  outcome: z.enum(["pass", "fail"]),
});

const detailByKind = {
  "task-transition": TaskTransitionDetail,
  "ackit-command": AckitCommandDetail,
  "policy-decision": PolicyDecisionDetail,
  "evidence-registered": EvidenceDetail,
  "verdict-registered": VerdictDetail,
  "checkpoint-created": CheckpointDetail,
  "workflow-stage": WorkflowStageDetail,
  "verification-attempt": VerificationAttemptDetail,
} as const;

/** Redaction marker detail: valid for every kind (ADR-0027 §6 — redaction at construction). */
const RedactedDetail = z.strictObject({ redacted: z.literal(true) });

export const JournalEventSchema = z
  .object({
    schemaId: z.literal(JOURNAL_SCHEMA_ID),
    /** Monotonic per-repository sequence. */
    seq: z.number().int().positive(),
    /** Date-only ISO (determinism). */
    occurredAt: isoDate,
    kind: z.enum(JOURNAL_EVENT_KINDS),
    taskId: z
      .string()
      .regex(/^TASK-\d{4}$/)
      .optional(),
    detail: z.unknown(),
  })
  .superRefine((event, ctx) => {
    // A redacted detail is always valid: secret-shaped content was replaced
    // at construction (THREAT_MODEL T26) — redaction must not invalidate the
    // event on re-read.
    if (RedactedDetail.safeParse(event.detail).success) return;
    const shape = detailByKind[event.kind];
    const result = shape.safeParse(event.detail);
    if (!result.success) {
      ctx.addIssue({
        code: "custom",
        message: `detail shape invalid for kind '${event.kind}' (${result.error.issues.length} issue(s))`,
        path: ["detail"],
      });
    }
  });

export type JournalEvent = z.infer<typeof JournalEventSchema>;
