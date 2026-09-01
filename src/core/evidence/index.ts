export { EvidenceStore, EvidenceStoreError } from "./store.js";
export { criteriaFromTaskDoc, syncRegistry } from "./sync.js";
export {
  type AcceptanceCriterion,
  CRITERION_ID_PATTERN,
  EVIDENCE_PROBLEM_CODES,
  EVIDENCE_SCHEMA_ID,
  EVIDENCE_TYPES,
  type EvidenceEntry,
  type EvidenceProblem,
  type EvidenceRegistry,
  EvidenceRegistrySchema,
  type EvidenceType,
  type EvidenceValidationResult,
} from "./types.js";
export { type EvidenceRequirements, validateEvidence } from "./validate.js";

/**
 * Convenience loader matching the workflow gate's artifact resolution: returns
 * null when no registry exists (never throws for the absence case).
 */
export async function loadEvidenceRegistry(
  rootPath: string,
  taskId: string,
): Promise<import("./types.js").EvidenceRegistry | null> {
  const { resolveRepositoryRoot } = await import("../filesystem/root.js");
  const resolved = await resolveRepositoryRoot(rootPath);
  if (!resolved.ok) return null;
  const { EvidenceStore } = await import("./store.js");
  return new EvidenceStore(resolved.root).load(taskId);
}
