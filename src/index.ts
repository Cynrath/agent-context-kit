/**
 * ACKit public programmatic API (REQ-API-001, REQ-V020-J-001).
 *
 * This module is the ONLY supported import surface for external consumers.
 * Everything not re-exported here is internal and may change without notice;
 * the exported symbol set is contract-tested (tests/contract/api-surface) so
 * accidental additions/removals are caught before they become breaking.
 */
export type { AckitErrorCode } from "./api/errors.js";
export { AckitError } from "./api/errors.js";
export { scanRepository } from "./api/scan-repository.js";
export {
  CheckpointStore,
  renderHandoffPack,
  renderResumeContext,
} from "./core/checkpoint/index.js";
export type { Checkpoint, NextAction } from "./core/checkpoint/types.js";
export { loadAckitConfig } from "./core/config/load.js";
export type { AckitConfig } from "./core/config/schema.js";
export type { AnalyzeOptions, OptimizeSuggestion } from "./core/context/optimize.js";
export { analyzeOptimize } from "./core/context/optimize.js";
export type { PackManifestEntry, PackResult } from "./core/context/pack.js";
export { buildContextPack } from "./core/context/pack.js";
export type { DriftFinding, DriftFindingCode } from "./core/drift/check.js";
export { detectWorkflowDrift } from "./core/drift/index.js";
export { EvidenceStore, validateEvidence } from "./core/evidence/index.js";
export type { EvidenceRegistry, EvidenceType } from "./core/evidence/types.js";
export { buildInstructionGraph, resolveEffectiveStack } from "./core/instructions/graph.js";
export type {
  BuildGraphOptions,
  EffectiveStackInfo,
  InstructionGraph,
  InstructionNode,
  ProvenanceEntry,
  ProviderId,
} from "./core/instructions/types.js";
export { IntentStore, intentFingerprint, normalizeIntent } from "./core/intent/index.js";
export type { IntentDoc, IntentMeta } from "./core/intent/types.js";
export { resolveAutonomy, resolveReview } from "./core/policy/index.js";
export { evaluateRulePacks } from "./core/policy/packs/evaluate.js";
export { loadRulePacks } from "./core/policy/packs/load.js";
export type { EffectiveRulePack, RulePackV1, RuleV1 } from "./core/policy/packs/types.js";
export type { ResolvedAutonomy, TierDecision } from "./core/policy/tiers.js";
export { detectProfiles, loadBuiltInProfiles, resolveProfile } from "./core/profiles/index.js";
export { ProfileSchema } from "./core/profiles/schema.js";
export type {
  Profile,
  ProfileDiagnostic,
  ProfileId,
  ProfileProvider,
  ResolvedProfile,
} from "./core/profiles/types.js";
export {
  ENGINE_VERSION as READINESS_ENGINE_VERSION,
  scoreRepository,
} from "./core/readiness/index.js";
export type {
  CategoryId,
  CategoryReport,
  Deduction,
  ReadinessInputs,
  ReadinessOptions,
  ScoreReport,
  Severity as ReadinessSeverity,
} from "./core/readiness/types.js";
export { listRoles, loadRole } from "./core/roles/index.js";
export type { RoleContract } from "./core/roles/types.js";
export type {
  Finding,
  ScanCategory,
  ScanDiagnostic,
  ScanResult,
  ScanRule,
  Severity,
} from "./core/scanner/types.js";
export type { SkillIssue, SkillRecord } from "./core/skills/types.js";
export { validateSkills } from "./core/skills/validate.js";
export { TaskStore } from "./core/tasks/store.js";
// ---------------------------------------------------------------------------
// Workflow expansion SDK surface (TASK-0059, ADR-0025..0028): focused, typed
// additions to the frozen allowlist — contract-tested. AbortSignal support
// where IO-bound; no process.exit; internal modules stay internal.
// ---------------------------------------------------------------------------
export type { TaskDoc, TaskMeta } from "./core/tasks/types.js";
export {
  buildVerificationBundle,
  VerdictStore,
} from "./core/verification/index.js";
export type { Verdict } from "./core/verification/verdict.js";
export {
  BUILTIN_PROFILES,
  listWorkflowProfiles,
  requiredArtifacts,
  WorkflowStore,
} from "./core/workflow/index.js";
export type { WorkflowStateLoaded } from "./core/workflow/store.js";
