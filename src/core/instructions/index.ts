export type { InstructionAnalysisFinding } from "./analysis/index.js";
export {
  analyzeInstructions,
  EXACT_DUPLICATE_THRESHOLD,
  NEAR_DUPLICATE_THRESHOLD,
  normalizeForDuplicateCheck,
  similarity,
} from "./analysis/index.js";
export { extractFrontmatter, normalizeApplyTo } from "./frontmatter.js";
export {
  buildInstructionGraph,
  MANAGED_END_MARKER,
  MANAGED_START_MARKER,
  resolveEffectiveStack,
} from "./graph.js";
export { checksumContent, scanReferences } from "./references.js";
export type {
  BuildGraphOptions,
  DiscoveryDiagnostic,
  EffectiveStack,
  EffectiveStackInfo,
  InstructionGraph,
  InstructionNode,
  InstructionStatus,
  ProvenanceEntry,
  ProviderId,
  SecurityFlag,
} from "./types.js";
export {
  INSTRUCTION_GRAPH_SCHEMA_VERSION,
  INSTRUCTION_STATUSES,
  InstructionNodeSchema,
  InstructionNodeSchemaV2,
  PROVIDERS,
  ProvenanceEntrySchema,
  SECURITY_FLAGS,
} from "./types.js";
