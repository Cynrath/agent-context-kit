/**
 * ACKit public programmatic API (REQ-API-001, REQ-V020-J-001).
 *
 * This module is the ONLY supported import surface for external consumers.
 * Everything not re-exported here is internal and may change without notice;
 * the exported symbol set is contract-tested (tests/contract/api-surface) so
 * accidental additions/removals are caught before they become breaking.
 *
 * v0.2.0 reserved extension points (not yet implemented in this task):
 *   // - scoreRepository (TASK-0008)
 *   // - evaluateRulePack (TASK-0012)
 *   // - provider-aware BuildGraphOptions extensions (TASK-0011)
 */
export type { AckitErrorCode } from "./api/errors.js";
export { AckitError } from "./api/errors.js";
export { scanRepository } from "./api/scan-repository.js";
export { loadAckitConfig } from "./core/config/load.js";
export type { AckitConfig } from "./core/config/schema.js";
export type { PackManifestEntry, PackResult } from "./core/context/pack.js";
export { buildContextPack } from "./core/context/pack.js";
export { buildInstructionGraph, resolveEffectiveStack } from "./core/instructions/graph.js";
export type {
  BuildGraphOptions,
  EffectiveStackInfo,
  InstructionGraph,
  InstructionNode,
  ProvenanceEntry,
  ProviderId,
} from "./core/instructions/types.js";
export { evaluateRulePacks } from "./core/policy/packs/evaluate.js";
export { loadRulePacks } from "./core/policy/packs/load.js";
export type { EffectiveRulePack, RulePackV1, RuleV1 } from "./core/policy/packs/types.js";
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
export { analyzeOptimize } from "./core/context/optimize.js";
export type { AnalyzeOptions, OptimizeSuggestion } from "./core/context/optimize.js";
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
