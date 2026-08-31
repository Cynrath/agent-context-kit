import { z } from "zod";

/** Schema id for serialized workflow state (ADR-0025). */
export const WORKFLOW_SCHEMA_ID = "ackit.workflow.v1";

/** Workflow profile ids (frozen set; ADR-0025). */
export const WORKFLOW_PROFILES = ["quick", "standard", "high-risk"] as const;
export type WorkflowProfileId = (typeof WORKFLOW_PROFILES)[number];

/**
 * Stage ids. The union is the full vocabulary; each profile declares its own
 * canonical ordered subset (ADR-0025). Stage ids are kebab-case.
 */
export const STAGE_IDS = [
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
] as const;
export type WorkflowStage = (typeof STAGE_IDS)[number];

/** Required artifact kinds a stage can demand (existence-checked only). */
export const ARTIFACT_KINDS = ["intent", "spec", "plan", "task", "evidence", "verdict"] as const;
export type ArtifactKind = (typeof ARTIFACT_KINDS)[number];

export const WorkflowProfileSchema = z.enum(WORKFLOW_PROFILES);
export const WorkflowStageSchema = z.enum(STAGE_IDS);
export const ArtifactKindSchema = z.enum(ARTIFACT_KINDS);

/** One recorded verification attempt (verify/fix loop state, ADR-0025 §6). */
export const VerificationAttemptSchema = z.object({
  /** Date-only ISO (determinism). */
  recordedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  outcome: z.enum(["pass", "fail"]),
});
export type VerificationAttempt = z.infer<typeof VerificationAttemptSchema>;

/** One stage transition in the (append-only) stage history. */
export const StageHistoryEntrySchema = z.object({
  stage: WorkflowStageSchema,
  /** Date-only ISO (determinism). */
  enteredAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export type StageHistoryEntry = z.infer<typeof StageHistoryEntrySchema>;

/**
 * Serialized per-task workflow state (ackit.workflow.v1, ADR-0025).
 * Strict: unknown fields are validation errors — repository state files are
 * untrusted input (THREAT_MODEL T16).
 */
export const WorkflowStateSchema = z.strictObject({
  schemaId: z.literal(WORKFLOW_SCHEMA_ID),
  taskId: z.string().regex(/^TASK-\d{4}$/),
  profile: WorkflowProfileSchema,
  stage: WorkflowStageSchema,
  createdAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  updatedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  stageHistory: z.array(StageHistoryEntrySchema).max(64),
  verificationAttempts: z.array(VerificationAttemptSchema).max(64),
});

export type WorkflowState = z.infer<typeof WorkflowStateSchema>;

/** Structured validation problem (reportable, never a raw zod dump). */
export interface WorkflowProblem {
  code: string;
  message: string;
}

/** Resolved required artifacts for a stage of a profile. */
export interface RequiredArtifacts {
  profile: WorkflowProfileId;
  stage: WorkflowStage;
  artifacts: readonly ArtifactKind[];
}
