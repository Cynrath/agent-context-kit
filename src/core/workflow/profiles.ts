import type { ArtifactKind, RequiredArtifacts, WorkflowProfileId, WorkflowStage } from "./types.js";
import { WORKFLOW_PROFILES } from "./types.js";

/**
 * Built-in workflow profile catalog (ADR-0025): canonical stage order and the
 * artifacts each stage requires before advancement. Required artifacts are
 * deterministic existence checks only — no semantic inference.
 */
export interface WorkflowProfileDefinition {
  id: WorkflowProfileId;
  title: string;
  description: string;
  stages: readonly WorkflowStage[];
  /** First stage the workflow starts at when set. */
  entryStage: WorkflowStage;
  /** Artifacts that must exist before ADVANCING PAST the given stage. */
  requiredArtifactsByStage: Readonly<Partial<Record<WorkflowStage, readonly ArtifactKind[]>>>;
  /** Verifier verdict requirement for completion (ADR-0026 integration). */
  requiresVerdict: boolean;
  /** Evidence registry requirement for completion (ADR-0026 integration). */
  requiresEvidence: boolean;
  /** Minimum stage that permits task completion. */
  completionStage: WorkflowStage;
}

const QUICK_STAGES = ["task", "implement", "verify"] as const;
const STANDARD_STAGES = ["intent", "plan", "tasks", "implement", "verify", "review"] as const;
const HIGH_RISK_STAGES = [
  "intent",
  "spec",
  "plan",
  "tasks",
  "implement",
  "verify",
  "independent-review",
  "release-evidence",
] as const;

export const BUILTIN_PROFILES: Readonly<Record<WorkflowProfileId, WorkflowProfileDefinition>> =
  Object.freeze({
    quick: {
      id: "quick",
      title: "Quick",
      description: "Small, low-risk fixes: task → implement → verify.",
      stages: QUICK_STAGES,
      entryStage: "task",
      requiredArtifactsByStage: {
        task: ["task"],
        implement: [],
        verify: [],
      },
      requiresVerdict: false,
      requiresEvidence: false,
      completionStage: "verify",
    },
    standard: {
      id: "standard",
      title: "Standard",
      description: "Normal feature work: intent → plan → tasks → implement → verify → review.",
      stages: STANDARD_STAGES,
      entryStage: "intent",
      requiredArtifactsByStage: {
        intent: ["intent", "task"],
        plan: ["plan"],
        tasks: [],
        implement: [],
        verify: ["evidence"],
        review: [],
      },
      requiresVerdict: true,
      requiresEvidence: true,
      completionStage: "verify",
    },
    "high-risk": {
      id: "high-risk",
      title: "High-risk",
      description:
        "Architecture/security/migration/release-sensitive work: intent → spec → plan → tasks → implement → verify → independent-review → release-evidence.",
      stages: HIGH_RISK_STAGES,
      entryStage: "intent",
      requiredArtifactsByStage: {
        intent: ["intent", "task"],
        spec: ["spec"],
        plan: ["plan"],
        tasks: [],
        implement: [],
        verify: ["evidence"],
        "independent-review": ["verdict"],
        "release-evidence": [],
      },
      requiresVerdict: true,
      requiresEvidence: true,
      completionStage: "release-evidence",
    },
  });

/** All built-in profile ids in catalog order (deterministic). */
export function listWorkflowProfiles(): WorkflowProfileId[] {
  return [...WORKFLOW_PROFILES];
}

export function getProfile(id: WorkflowProfileId): WorkflowProfileDefinition {
  const profile = BUILTIN_PROFILES[id];
  if (profile === undefined) throw new Error(`unknown workflow profile '${id}'`);
  return profile;
}

/** Stages of a profile in canonical order. */
export function profileStages(id: WorkflowProfileId): readonly WorkflowStage[] {
  return getProfile(id).stages;
}

/** Deterministic forward-transition check within a profile (ADR-0025 §3). */
export function canAdvance(id: WorkflowProfileId, from: WorkflowStage, to: WorkflowStage): boolean {
  const stages = profileStages(id);
  const fromIndex = stages.indexOf(from);
  const toIndex = stages.indexOf(to);
  if (fromIndex === -1 || toIndex === -1) return false;
  // Forward-only; the sanctioned verify→implement regression is handled by the
  // explicit verify/fix loop path (recordVerificationAttempt), never by advance.
  return toIndex === fromIndex + 1;
}

/** Validate that a stage belongs to a profile (else WORKFLOW_STAGE_INVALID). */
export function stageInProfile(id: WorkflowProfileId, stage: WorkflowStage): boolean {
  return profileStages(id).includes(stage);
}

/** Resolved required artifacts for a stage (deterministic, pure). */
export function requiredArtifacts(id: WorkflowProfileId, stage: WorkflowStage): RequiredArtifacts {
  const profile = getProfile(id);
  const artifacts = profile.requiredArtifactsByStage[stage];
  return {
    profile: id,
    stage,
    artifacts: artifacts === undefined ? [] : [...artifacts],
  };
}

/**
 * Resolve user config overrides onto the catalog. Overrides are
 * ADDITIVE-ONLY (TASK-0067): explicit `true` tightens the built-in minimum,
 * explicit `false`/absence never loosens it. Stage orders are fixed
 * (ADR-0025: config tunes requirements, never invents profiles/stages).
 */
export interface WorkflowConfigOverrides {
  requireVerifier?: boolean | undefined;
  requireEvidence?: boolean | undefined;
}

export function resolveProfileRequirements(
  id: WorkflowProfileId,
  overrides: WorkflowConfigOverrides = {},
): Pick<WorkflowProfileDefinition, "requiresVerdict" | "requiresEvidence"> {
  const profile = getProfile(id);
  // Additive-only: built-in `true` stays `true` even when config says false.
  // Explicit config `true` tightens a built-in `false` (per-repository opt-in).
  // Absence keeps the built-in default (ADR-0025 §7, TASK-0067 risk mitigation).
  return {
    requiresVerdict: profile.requiresVerdict || (overrides.requireVerifier ?? false),
    requiresEvidence: profile.requiresEvidence || (overrides.requireEvidence ?? false),
  };
}

/**
 * Canonical workflow-config extraction (TASK-0067): single place where the
 * parsed `ackit.yml` `workflow:` section becomes gate overrides + default
 * profile. All gates (completion, advance, drift, show) read through here —
 * no second gate engine. Legacy repos (no `workflow:` section) yield empty
 * overrides and no default (exact v0.3.0 behavior).
 *
 * Schema shape (frozen): `workflow.defaultProfile`, `workflow.requireVerifier`
 * (top-level), `workflow.profiles.requireEvidence` / `requireVerdict`.
 * The per-section `requireVerdict` wins over top-level `requireVerifier`
 * when both are set (more specific layer).
 */
export function workflowOverridesFromConfig(
  config:
    | {
        workflow?:
          | {
              requireVerifier?: boolean | undefined;
              profiles?:
                | {
                    requireEvidence?: boolean | undefined;
                    requireVerdict?: boolean | undefined;
                  }
                | undefined;
            }
          | undefined;
      }
    | undefined,
): WorkflowConfigOverrides {
  const workflow = config?.workflow;
  if (workflow === undefined) return {};
  const requireVerifier =
    workflow.profiles?.requireVerdict ?? workflow.requireVerifier ?? undefined;
  const requireEvidence = workflow.profiles?.requireEvidence ?? undefined;
  const overrides: WorkflowConfigOverrides = {};
  if (requireVerifier !== undefined) overrides.requireVerifier = requireVerifier;
  if (requireEvidence !== undefined) overrides.requireEvidence = requireEvidence;
  return overrides;
}

/** Resolved default profile from config (undefined = no config default). */
export function defaultProfileFromConfig(
  config: { workflow?: { defaultProfile?: WorkflowProfileId | undefined } | undefined } | undefined,
): WorkflowProfileId | undefined {
  const candidate = config?.workflow?.defaultProfile;
  if (candidate === undefined) return undefined;
  // Schema already constrains to the frozen set; defensive check keeps this
  // pure function total for programmatic callers.
  return (WORKFLOW_PROFILES as readonly string[]).includes(candidate) ? candidate : undefined;
}

/**
 * Effective required artifacts for a stage under config overrides
 * (TASK-0067): catalog requirements plus tightening additions. Currently the
 * only tightening is evidence on `verify` for profiles whose catalog does not
 * already require it (quick) when effective `requiresEvidence` is true, and
 * verdict on `verify` for quick when effective `requiresVerdict` is true
 * (quick has no independent-review stage, so `verify` is the enforcement
 * point). Standard/high-risk catalog already covers their enforcement stages,
 * so overrides add nothing there. Absent config returns the catalog exactly
 * (legacy preservation).
 */
export function effectiveRequiredArtifacts(
  id: WorkflowProfileId,
  stage: WorkflowStage,
  overrides: WorkflowConfigOverrides = {},
): { profile: WorkflowProfileId; stage: WorkflowStage; artifacts: ArtifactKind[] } {
  const base = requiredArtifacts(id, stage);
  const effective = resolveProfileRequirements(id, overrides);
  const catalog = getProfile(id);
  const extra: ArtifactKind[] = [];
  if (stage === "verify") {
    if (effective.requiresEvidence && !base.artifacts.includes("evidence")) {
      extra.push("evidence");
    }
    // Quick-only tightening: quick has no independent-review stage, so a
    // configured verifier requirement is enforced at verify advancement.
    if (id === "quick" && effective.requiresVerdict && !base.artifacts.includes("verdict")) {
      extra.push("verdict");
    }
  }
  void catalog;
  if (extra.length === 0) return { profile: id, stage, artifacts: [...base.artifacts] };
  return { profile: id, stage, artifacts: [...base.artifacts, ...extra].sort() };
}
