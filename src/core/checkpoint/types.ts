import { z } from "zod";

/** Schema id for serialized checkpoints (ADR-0027). */
export const CHECKPOINT_SCHEMA_ID = "ackit.checkpoint.v1";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, "expected a real calendar date (YYYY-MM-DD)");

const boundedText = z.string().trim().max(500);
const shortText = z.string().trim().max(200);

/**
 * The recorded next action (ADR-0027 §1): the exact instruction a fresh agent
 * continues from. `objective` is required; the rest are optional context.
 */
export const NextActionSchema = z.object({
  objective: boundedText,
  path: shortText.optional(),
  command: shortText.optional(),
  expectedResult: boundedText.optional(),
});
export type NextAction = z.infer<typeof NextActionSchema>;

/**
 * Serialized task checkpoint (ackit.checkpoint.v1, ADR-0027). Strict: unknown
 * fields rejected (untrusted local state, THREAT_MODEL T16/T20). All paths
 * repo-relative POSIX; git head stored as short SHA only.
 */
export const CheckpointSchema = z.strictObject({
  schemaId: z.literal(CHECKPOINT_SCHEMA_ID),
  id: z.string().regex(/^CP-\d{4}$/),
  taskId: z.string().regex(/^TASK-\d{4}$/),
  workflow: z.object({
    profile: z.enum(["quick", "standard", "high-risk"]),
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
  }),
  intentRef: z
    .string()
    .regex(/^INTENT-\d{4}$/)
    .optional(),
  planRef: shortText.optional(),
  completedWork: z.array(boundedText).max(64),
  pendingWork: z.array(boundedText).max(64),
  decisions: z.array(boundedText).max(32),
  failures: z.array(boundedText).max(32),
  blockers: z.array(boundedText).max(32),
  evidenceRefs: z.array(shortText).max(32),
  changedAreas: z.array(shortText).max(128),
  nextAction: NextActionSchema,
  gitHead: shortText,
  /** Explicit marker when git was unavailable at creation time (never a lie). */
  gitUnavailable: z.boolean().default(false),
  createdAt: isoDate,
});

export type Checkpoint = z.infer<typeof CheckpointSchema>;

/** Structured staleness/validation problem (stable codes, ADR-0027 §4). */
export interface CheckpointProblem {
  code: string;
  message: string;
}

export const CHECKPOINT_PROBLEM_CODES = {
  schema: "CHECKPOINT-INVALID",
  stale: "STALE_CHECKPOINT",
  gitUnavailable: "CHECKPOINT-GIT-UNAVAILABLE",
} as const;
