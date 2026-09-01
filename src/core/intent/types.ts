import { z } from "zod";

/** Schema id for intent documents (ADR-0025 §4). */
export const INTENT_SCHEMA_ID = "ackit.intent.v1";

/** Intent ids are INTENT-#### (allocation mirrors TASK-####). */
export const INTENT_ID_PATTERN = /^INTENT-\d{4}$/;

/** Acceptance criterion ids inside an intent: AC-###. */
export const CRITERION_ID_PATTERN = /^AC-\d{3}$/;

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, "expected a real calendar date (YYYY-MM-DD)");
const boundedText = z.string().trim().min(1).max(4000);
const boundedList = z.array(boundedText).max(32);

/** One acceptance criterion of an intent. */
export const IntentCriterionSchema = z.object({
  id: z.string().regex(CRITERION_ID_PATTERN),
  requirement: boundedText,
});
export type IntentCriterion = z.infer<typeof IntentCriterionSchema>;

/**
 * Normalized, provider-independent intent frontmatter (ackit.intent.v1).
 * Strict: unknown fields are validation errors (untrusted repository content,
 * THREAT_MODEL T16/T19). ACKit validates/normalizes/references only — it never
 * generates or infers intent (ADR-0025).
 */
export const IntentMetaSchema = z.strictObject({
  schemaId: z.literal(INTENT_SCHEMA_ID).optional(),
  id: z.string().regex(INTENT_ID_PATTERN),
  title: boundedText,
  status: z.enum(["draft", "accepted", "superseded"]).default("draft"),
  createdAt: isoDate,
  source: z.string().trim().max(500).default(""),
  problem: boundedText,
  desiredOutcome: boundedText,
  constraints: boundedList.default([]),
  nonGoals: boundedList.default([]),
  affectedSystems: boundedList.default([]),
  acceptanceCriteria: z.array(IntentCriterionSchema).max(64).default([]),
  openQuestions: boundedList.default([]),
  risks: boundedList.default([]),
});
export type IntentMeta = z.infer<typeof IntentMetaSchema>;

export interface IntentDoc {
  meta: IntentMeta;
  relativePath: string;
  body: string;
}

/** Structured validation problem (reportable, never a raw zod dump). */
export interface IntentProblem {
  code: string;
  message: string;
}

/** Stable finding codes surfaced by validation. */
export const INTENT_PROBLEM_CODES = {
  schema: "INTENT-STATE-INVALID",
  duplicateCriterion: "INTENT-CRITERION-DUPLICATE",
  secret: "INTENT-SECRET-CONTENT",
} as const;
