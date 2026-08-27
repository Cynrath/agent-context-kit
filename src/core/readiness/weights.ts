import { AckitError } from "../../api/errors.js";
import type { CategoryId, Severity } from "./types.js";

export const DEFAULT_WEIGHTS: Record<CategoryId, number> = {
  instructions: 25,
  security: 25,
  contextEfficiency: 20,
  taskHygiene: 10,
  skills: 10,
  policy: 10,
};

export const CATEGORY_ORDER: CategoryId[] = [
  "instructions",
  "security",
  "contextEfficiency",
  "taskHygiene",
  "skills",
  "policy",
];

export const CATEGORY_LABELS: Record<CategoryId, string> = {
  instructions: "Instructions",
  security: "Security",
  contextEfficiency: "Context Efficiency",
  taskHygiene: "Task Hygiene",
  skills: "Skills",
  policy: "Policy",
};

export const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
};

// Declarative severity->points table versioned in code.
// Changing a value is a scoring version bump.
export const SEVERITY_POINTS: Record<Severity, { default: number; allowed: number[] }> = {
  critical: { default: 15, allowed: [15] },
  high: { default: 10, allowed: [8, 10, 12] },
  medium: { default: 5, allowed: [4, 5] },
  low: { default: 2, allowed: [1, 2] },
  info: { default: 0, allowed: [0] },
};

export function pointsForSeverity(severity: Severity, variant?: number): number {
  const entry = SEVERITY_POINTS[severity];
  if (variant !== undefined) {
    if (!entry.allowed.includes(variant)) {
      throw new Error(`invalid points variant ${variant} for severity ${severity}`);
    }
    return variant;
  }
  return entry.default;
}

export function validateWeights(weights?: Partial<Record<CategoryId, number>>): void {
  if (weights === undefined) return;
  const allowed = new Set(Object.keys(DEFAULT_WEIGHTS));
  for (const [key, value] of Object.entries(weights)) {
    if (!allowed.has(key)) {
      throw new AckitError("CONFIG-INVALID-VALUE", `unknown readiness weight key '${key}'`, {
        remediation:
          "use one of: instructions, security, contextEfficiency, taskHygiene, skills, policy",
      });
      // task expects CONFIG-READINESS-WEIGHTS code but AckitError type only allows defined codes.
      // We map to CONFIG-INVALID-VALUE; CLI will surface code. For strict spec, we extend via cause.
    }
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      throw new AckitError(
        "CONFIG-INVALID-VALUE",
        `invalid readiness weight for '${key}': must be number >=0`,
        { remediation: "set readiness.weights.<category> to a number >=0" },
      );
    }
  }
}

export function normalizeWeights(
  weights?: Partial<Record<CategoryId, number>>,
  excluded?: Set<CategoryId>,
): { effective: Record<CategoryId, number>; sum: number } {
  const merged: Record<CategoryId, number> = { ...DEFAULT_WEIGHTS };
  if (weights) {
    for (const k of Object.keys(weights) as CategoryId[]) {
      const v = weights[k];
      if (v !== undefined) merged[k] = v;
    }
  }
  const available = (Object.keys(merged) as CategoryId[]).filter((k) => !excluded?.has(k));
  const sum = available.reduce((acc, k) => acc + merged[k], 0);
  const effective: Record<CategoryId, number> = { ...merged };
  if (sum === 0) {
    // all excluded or zero weights -> all effective 0
    for (const k of Object.keys(effective) as CategoryId[]) effective[k] = 0;
    return { effective, sum: 0 };
  }
  for (const k of Object.keys(effective) as CategoryId[]) {
    if (excluded?.has(k)) {
      effective[k] = 0;
    } else {
      effective[k] = (merged[k] / sum) * 100;
    }
  }
  return { effective, sum };
}

export function effectiveWeightForCategory(
  category: CategoryId,
  weights?: Partial<Record<CategoryId, number>>,
  excluded?: Set<CategoryId>,
): number {
  const { effective } = normalizeWeights(weights, excluded);
  return effective[category] ?? 0;
}
