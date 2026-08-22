/**
 * ACKit public programmatic API (REQ-API-001).
 *
 * This module is the ONLY supported import surface for external consumers.
 * Everything not re-exported here is internal and may change without notice;
 * the exported symbol set is contract-tested (tests/contract/api-surface) so
 * accidental additions/removals are caught before they become breaking.
 */
export { scanRepository } from "./api/scan-repository.js";
export { loadAckitConfig } from "./core/config/load.js";
export type { AckitConfig } from "./core/config/schema.js";
export type { PackManifestEntry, PackResult } from "./core/context/pack.js";
export { buildContextPack } from "./core/context/pack.js";
export { buildInstructionGraph, resolveEffectiveStack } from "./core/instructions/graph.js";
export type { InstructionGraph, InstructionNode, ProviderId } from "./core/instructions/types.js";
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
