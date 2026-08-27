export type CategoryId =
  | "instructions"
  | "security"
  | "contextEfficiency"
  | "taskHygiene"
  | "skills"
  | "policy";

export type Severity = "critical" | "high" | "medium" | "low" | "info";

export interface Evidence {
  relativePath: string;
  line?: number;
  excerpt?: string;
}

export interface Deduction {
  id: string;
  category: CategoryId;
  points: number;
  severity: Severity;
  reason: string;
  evidence: Evidence;
  remediation?: string;
  fingerprint?: string;
}

export interface CategoryReport {
  id: CategoryId;
  label: string;
  weight: number;
  effectiveWeight: number;
  status: "ok" | "n/a";
  score: number | null;
  maxPoints: number;
  deductions: Deduction[];
  reason?: string;
}

export interface ReadinessInputs {
  graph: import("../instructions/types.js").InstructionGraph;
  pack: import("../context/pack.js").PackResult | PackManifestWrapper;
  scan: import("../scanner/types.js").ScanResult;
  skills:
    | import("../skills/types.js").SkillRecord[]
    | import("../skills/types.js").SkillIssue[]
    | SkillCatalogInput;
  policy:
    | import("../policy/types.js").EffectivePolicy
    | { findings: import("../scanner/types.js").Finding[] }
    | null
    | undefined;
  tasks: TaskHealth;
}

export interface PackManifestWrapper {
  manifest?: import("../context/pack.js").PackManifestEntry[];
  totalIncludedTokens?: number;
  maxTokens?: number;
}

export interface SkillCatalogInput {
  skills?: import("../skills/types.js").SkillRecord[];
  issues?: import("../skills/types.js").SkillIssue[];
}

export interface TaskHealth {
  dirExists: boolean;
  activeTasks?: number;
  schemaIssues?: number;
  staleReferences?: number;
  blockedTasks?: number;
  duplicateIds?: number;
  totalTasks?: number;
  diagnostics?: string[];
}

export interface ReadinessOptions {
  weights?: Partial<Record<CategoryId, number>>;
  strict?: boolean;
  failBelow?: number;
}

export interface ThresholdReport {
  requested: number;
  source: string;
  passed: boolean;
}

export interface BaselineReport {
  baselineScore: number;
  delta: number;
  baselineVersion: string;
  baselineInputsHash: string;
}

export interface ScoreReport {
  version: "ackit.readiness.v1";
  engineVersion: string;
  overall: number;
  categories: CategoryReport[];
  deductions: Deduction[];
  inputsHash: string;
  threshold?: ThresholdReport;
  baseline?: BaselineReport;
}
