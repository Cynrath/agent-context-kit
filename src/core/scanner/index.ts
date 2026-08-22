export { runScan, type ScanPipelineOptions } from "./pipeline.js";
export { computeFingerprint, redactEvidence } from "./redact.js";
export { defaultRegistry } from "./registry.js";
export {
  BUILTIN_RULES,
  buildBuiltinRegistry,
  builtinRegistry,
  SUPPRESSION_ADVISORY_ID,
} from "./rules/catalog.js";
export { RuleRegistry } from "./rules.js";
export type {
  Finding,
  FindingDraft,
  ScanCategory,
  ScanDiagnostic,
  ScanResult,
  ScanRule,
  ScanRuleContext,
  Severity,
} from "./types.js";
export { FindingSchema, SCAN_CATEGORIES, SEVERITY_ORDER, severityAtLeast } from "./types.js";
