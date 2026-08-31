import { canAdvance, requiredArtifacts } from "./profiles.js";
import type { ArtifactKind, WORKFLOW_PROFILES, WorkflowProblem, WorkflowStage } from "./types.js";
import { WorkflowStateSchema } from "./types.js";

/**
 * Deterministic workflow validation (ADR-0025): schema + stage-order +
 * required-artifact resolution. Reportable problems are returned, never thrown;
 * raw zod dumps are not leaked to callers.
 */
/**
 * Deterministic existence check for an artifact kind tied to a task
 * (ADR-0025): used by validateWorkflow to resolve required-artifact presence.
 */
export type ArtifactResolver = (taskId: string, kind: ArtifactKind) => Promise<boolean> | boolean;

export interface WorkflowValidationInput {
  taskId: string;
  state: unknown;
  /** Target stage for advancement validation (defaults to the state's stage). */
  targetStage?: WorkflowStage | undefined;
  /** Resolves whether each required artifact exists. */
  artifactResolver?: ArtifactResolver | undefined;
}

export interface WorkflowValidationResult {
  ok: boolean;
  problems: WorkflowProblem[];
  state: {
    profile: (typeof WORKFLOW_PROFILES)[number];
    stage: WorkflowStage;
  } | null;
  /** Required artifacts for the validated stage (empty when unresolvable). */
  required: readonly ArtifactKind[];
  /** Missing required artifacts for the validated stage. */
  missing: readonly ArtifactKind[];
}

const WORKFLOW_STAGE_ORDER_PROBLEM = "WORKFLOW_STAGE_INVALID";

const SCHEMA_PROBLEM_CODES = {
  shape: "WORKFLOW-STATE-INVALID",
  taskId: "WORKFLOW-TASK-ID-INVALID",
  stage: WORKFLOW_STAGE_ORDER_PROBLEM,
} as const;

export async function validateWorkflow(
  input: WorkflowValidationInput,
): Promise<WorkflowValidationResult> {
  const problems: WorkflowProblem[] = [];
  const parsed = WorkflowStateSchema.safeParse(input.state);
  if (!parsed.success) {
    return {
      ok: false,
      problems: [
        {
          code: SCHEMA_PROBLEM_CODES.shape,
          message: `workflow state failed schema validation (${parsed.error.issues.length} issue(s))`,
        },
      ],
      state: null,
      required: [],
      missing: [],
    };
  }
  const state = parsed.data;
  if (state.taskId !== input.taskId) {
    problems.push({
      code: "WORKFLOW-TASK-ID-MISMATCH",
      message: `state task id '${state.taskId}' does not match requested '${input.taskId}'`,
    });
  }
  const target = input.targetStage ?? state.stage;
  const stageValid = canAdvance(
    state.profile,
    // A target is advanceable only from the current stage; for pure stage
    // membership validation we check that the CURRENT stage is in the profile.
    state.stage,
    target,
  );
  const required = requiredArtifacts(state.profile, target);
  const missing: ArtifactKind[] = [];
  const resolver = input.artifactResolver;
  if (resolver !== undefined) {
    for (const kind of required.artifacts) {
      let exists: boolean;
      try {
        exists = await resolver(input.taskId, kind);
      } catch {
        exists = false;
      }
      if (!exists) missing.push(kind);
    }
  }
  if (input.targetStage !== undefined && !stageValid) {
    problems.push({
      code: WORKFLOW_STAGE_ORDER_PROBLEM,
      message: `stage transition '${state.stage}' → '${target}' is invalid for profile '${state.profile}' (forward-only, adjacent)`,
    });
  }
  if (missing.length > 0) {
    problems.push({
      code: "MISSING_REQUIRED_ARTIFACT",
      message: `stage '${target}' of profile '${state.profile}' is missing required artifact(s): ${missing.join(", ")}`,
    });
  }
  // Verdict/evidence REQUIREMENTS (not presence) resolve from the profile +
  // config in the completion gate (ADR-0026 / TASK-0053); this validator
  // keeps deterministic artifact presence only.
  return {
    ok: problems.length === 0,
    problems,
    state: { profile: state.profile, stage: state.stage },
    required: required.artifacts,
    missing,
  };
}

export { WORKFLOW_STAGE_INVALID } from "./store.js";
