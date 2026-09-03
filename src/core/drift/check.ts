import picomatch from "picomatch";
import type { Checkpoint } from "../checkpoint/types.js";
import type { EvidenceRegistry } from "../evidence/types.js";
import type { TaskDoc } from "../tasks/types.js";
import { extractSection } from "../tasks/types.js";

/**
 * Deterministic workflow drift detection (ADR-0025 §6 / expansion §9).
 * Machine-checkable findings ONLY — no semantic claims: "the code violates the
 * spirit of the spec" belongs to the independent verifier, never here.
 */
export const DRIFT_FINDING_CODES = [
  "UNPLANNED_FILE_CHANGE",
  "MISSING_REQUIRED_ARTIFACT",
  "WORKFLOW_STAGE_INVALID",
  "ACCEPTANCE_CRITERIA_UNVERIFIED",
  "MISSING_VERIFIER_VERDICT",
  "STALE_CHECKPOINT",
  "PLAN_REFERENCE_MISSING",
  "TASK_DEPENDENCY_NOT_SATISFIED",
] as const;
export type DriftFindingCode = (typeof DRIFT_FINDING_CODES)[number];

export interface DriftFinding {
  code: DriftFindingCode;
  severity: "blocking" | "warning";
  taskId: string;
  detail: string;
}

export interface DriftInput {
  taskId: string;
  taskDoc: TaskDoc;
  /** Workflow state (profile/stage) when the task is workflow-enabled. */
  workflow: { profile: "quick" | "standard" | "high-risk"; stage: string } | null;
  /** Required artifacts for the current stage (from the profile catalog). */
  requiredArtifacts: readonly string[];
  /** Artifacts that exist (resolved presence set). */
  existingArtifacts: readonly string[];
  /** Reference paths that exist on disk (for PLAN_REFERENCE_MISSING). */
  referencePathsExist: readonly string[];
  /** Evidence registry when present (null = none). */
  evidence: EvidenceRegistry | null;
  /** Latest registered verdict when present (null = none). */
  latestVerdict: { verdict: string } | null;
  /** Latest checkpoint when present (null = none). */
  checkpoint: Checkpoint | null;
  /** Checkpoint staleness problems (from the TASK-0048 validator). */
  checkpointProblems: readonly { code: string; message: string }[];
  /** Current git changed/untracked files (repo-relative POSIX). */
  changedFiles: readonly string[];
  /** Dependency statuses: dependency task id → completed?. */
  dependencies: readonly { id: string; completed: boolean }[];
  /**
   * Effective verifier requirement override (TASK-0067): when provided, the
   * drift evaluator uses it instead of the built-in `profile !== "quick"`
   * default. Absence preserves exact v0.3.0 behavior (legacy repos).
   */
  requiresVerdict?: boolean | undefined;
}

/** Deterministic exclusions: state/docs churn is never drift. */
const DRIFT_EXCLUDED_PREFIXES = [".ackit/"] as const;

function isExcluded(relativePath: string): boolean {
  return DRIFT_EXCLUDED_PREFIXES.some((prefix) => relativePath.startsWith(prefix));
}

/** Declared affected-area globs from the task's `## Affected files` section. */
export function declaredScopeGlobs(taskDoc: TaskDoc): string[] {
  const section = extractSection(taskDoc.body, "Affected files") ?? "";
  return section
    .split("\n")
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter((line) => line.length > 0 && !line.startsWith("("));
}

const STAGES_BY_PROFILE: Record<string, readonly string[]> = {
  quick: ["task", "implement", "verify"],
  standard: ["intent", "plan", "tasks", "implement", "verify", "review"],
  "high-risk": [
    "intent",
    "spec",
    "plan",
    "tasks",
    "implement",
    "verify",
    "independent-review",
    "release-evidence",
  ],
};

/**
 * Detect drift for one task. Findings are ordered deterministically
 * (code → taskId → detail) with fixed per-code severities (documented):
 * blocking findings gate completion (`ackit drift check --ci` exit 1);
 * warnings are advisory.
 */
export function detectWorkflowDrift(input: DriftInput): DriftFinding[] {
  const findings: DriftFinding[] = [];

  // UNPLANNED_FILE_CHANGE: implementation touches files outside the declared
  // scope (only when the task declares a scope — no declaration, no claim).
  const globs = declaredScopeGlobs(input.taskDoc);
  if (globs.length > 0) {
    const match = picomatch(globs, { dot: true });
    for (const file of input.changedFiles) {
      if (isExcluded(file) || file.startsWith("docs/tasks/")) continue;
      if (!match(file)) {
        findings.push({
          code: "UNPLANNED_FILE_CHANGE",
          severity:
            input.workflow !== null && input.workflow.profile === "high-risk"
              ? "blocking"
              : "warning",
          taskId: input.taskId,
          detail: `changed file '${file}' is outside the declared affected areas (${globs.join(", ")}) — update the task's Affected files section before expanding scope`,
        });
      }
    }
  }

  // MISSING_REQUIRED_ARTIFACT: workflow-required artifacts that do not exist.
  for (const artifact of input.requiredArtifacts) {
    if (!input.existingArtifacts.includes(artifact)) {
      findings.push({
        code: "MISSING_REQUIRED_ARTIFACT",
        severity: "blocking",
        taskId: input.taskId,
        detail: `required artifact '${artifact}' does not exist`,
      });
    }
  }

  // ACCEPTANCE_CRITERIA_UNVERIFIED: registry criteria not verified (only when
  // a registry exists — absence is MISSING_REQUIRED_ARTIFACT's business).
  if (input.evidence !== null) {
    for (const criterion of input.evidence.criteria) {
      if (criterion.status !== "verified") {
        findings.push({
          code: "ACCEPTANCE_CRITERIA_UNVERIFIED",
          severity: "blocking",
          taskId: input.taskId,
          detail: `${criterion.id}: '${criterion.requirement}' is not verified`,
        });
      }
    }
  }

  // MISSING_VERIFIER_VERDICT: effective profile requires a verdict but none
  // registered. TASK-0067: explicit `requiresVerdict` input wins; absence
  // falls back to the built-in `profile !== "quick"` default (legacy).
  const requiresVerdict =
    input.requiresVerdict ?? (input.workflow !== null && input.workflow.profile !== "quick");
  if (requiresVerdict && input.latestVerdict === null) {
    findings.push({
      code: "MISSING_VERIFIER_VERDICT",
      severity: "blocking",
      taskId: input.taskId,
      detail: `profile '${input.workflow?.profile}' requires an independent verifier verdict; none is registered`,
    });
  }

  // STALE_CHECKPOINT: passthrough of the TASK-0048 staleness problems.
  for (const problem of input.checkpointProblems) {
    if (problem.code === "STALE_CHECKPOINT") {
      findings.push({
        code: "STALE_CHECKPOINT",
        severity: "warning",
        taskId: input.taskId,
        detail: problem.message,
      });
    }
  }

  // PLAN_REFERENCE_MISSING: declared refs that do not resolve on disk.
  const metaExtra = input.taskDoc.meta as {
    intentRef?: string | undefined;
    specRefs?: string[] | undefined;
    decisionRefs?: string[] | undefined;
    planRef?: string | undefined;
  };
  const refPaths = [
    ...(metaExtra.specRefs ?? []),
    ...(metaExtra.decisionRefs ?? []),
    ...(metaExtra.planRef !== undefined ? [metaExtra.planRef] : []),
  ];
  for (const ref of refPaths) {
    if (!input.referencePathsExist.includes(ref)) {
      findings.push({
        code: "PLAN_REFERENCE_MISSING",
        severity: "warning",
        taskId: input.taskId,
        detail: `referenced document '${ref}' does not exist`,
      });
    }
  }

  // TASK_DEPENDENCY_NOT_SATISFIED: dependencies not completed.
  for (const dependency of input.dependencies) {
    if (!dependency.completed) {
      findings.push({
        code: "TASK_DEPENDENCY_NOT_SATISFIED",
        severity: "blocking",
        taskId: input.taskId,
        detail: `dependency '${dependency.id}' is not completed`,
      });
    }
  }

  // WORKFLOW_STAGE_INVALID: stage not in its profile's canonical set.
  if (input.workflow !== null && input.workflow.stage.length > 0) {
    const stageValid =
      STAGES_BY_PROFILE[input.workflow.profile]?.includes(input.workflow.stage) === true;
    if (!stageValid) {
      findings.push({
        code: "WORKFLOW_STAGE_INVALID",
        severity: "blocking",
        taskId: input.taskId,
        detail: `stage '${input.workflow.stage}' is not part of profile '${input.workflow.profile}'`,
      });
    }
  }

  findings.sort(
    (a, b) =>
      a.code.localeCompare(b.code) ||
      a.taskId.localeCompare(b.taskId) ||
      a.detail.localeCompare(b.detail),
  );
  return findings;
}
