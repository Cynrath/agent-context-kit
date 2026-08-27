export { collectAllDeductions } from "./deductions/index.js";
export { ENGINE_VERSION, scoreRepository } from "./engine.js";
export { canonicalInputsHash, hashForReport } from "./hash.js";
export type {
  BaselineReport,
  CategoryId,
  CategoryReport,
  Deduction,
  Evidence,
  ReadinessInputs,
  ReadinessOptions,
  ScoreReport,
  Severity,
  TaskHealth,
  ThresholdReport,
} from "./types.js";
export { CATEGORY_ORDER, DEFAULT_WEIGHTS, SEVERITY_POINTS } from "./weights.js";
