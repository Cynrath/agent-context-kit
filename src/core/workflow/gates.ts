import { z } from "zod";

/**
 * Declarative lifecycle gates (ADR-0028 §3): requirements at boundaries ACKit
 * reliably owns. The schema CANNOT represent a command — there is no
 * executable-hook field by construction (THREAT_MODEL T24); a fixture with
 * `command`/`script`/`run` keys must FAIL validation (contract test).
 */
export const LIFECYCLE_POINTS = [
  "sessionStart",
  "taskStart",
  "preTaskComplete",
  "verification",
  "preCommit",
  "release",
  "error",
  "sessionEnd",
] as const;
export type LifecyclePoint = (typeof LIFECYCLE_POINTS)[number];

export const LifecycleGateSchema = z.strictObject({
  point: z.enum(LIFECYCLE_POINTS),
  requireArtifacts: z
    .array(z.enum(["intent", "spec", "plan", "task", "evidence", "verdict"]))
    .max(6)
    .optional(),
  requireEvidenceVerified: z.boolean().optional(),
  requireVerdict: z.boolean().optional(),
  requireCleanDrift: z.boolean().optional(),
  message: z.string().trim().max(500).optional(),
});
export type LifecycleGate = z.infer<typeof LifecycleGateSchema>;

/** Per-point resolved gate (merged: profile defaults + config overrides). */
export interface ResolvedLifecycleGates {
  point: LifecyclePoint;
  requireArtifacts: string[];
  requireEvidenceVerified: boolean;
  requireVerdict: boolean;
  requireCleanDrift: boolean;
  message: string | null;
}

/**
 * Built-in gate defaults per lifecycle point (ADR-0028 §3). Hard enforcement
 * surfaces: preTaskComplete mirrors the composed completion gate (TASK-0053);
 * verification (bundle header lists requirements); preCommit (managed git
 * block). Advisory surfaces: sessionStart/taskStart/release/error/sessionEnd.
 */
export const BUILTIN_LIFECYCLE_GATES: readonly LifecycleGate[] = [
  {
    point: "sessionStart",
    requireArtifacts: ["task"],
    message: "an active workflow task should exist with its required planning artifacts",
  },
  {
    point: "taskStart",
    requireArtifacts: ["task"],
    message: "task start reports missing planning artifacts (advisory)",
  },
  {
    point: "preTaskComplete",
    requireArtifacts: ["task", "evidence", "verdict"],
    requireEvidenceVerified: true,
    requireVerdict: true,
    requireCleanDrift: true,
    message: "completion requires verified evidence, a passing verdict, and clean drift",
  },
  {
    point: "verification",
    requireArtifacts: ["task"],
    message: "verification bundles carry the task's declared requirements",
  },
  {
    point: "preCommit",
    requireCleanDrift: true,
    message: "the managed pre-commit block runs drift check on the active workflow task",
  },
  { point: "release", requireArtifacts: ["evidence"], message: "release requires evidence" },
  { point: "error", message: "errors are journaled with context" },
  { point: "sessionEnd", message: "session end is journaled" },
];

/**
 * Merge gate layers deterministically (later layers may only ADD requirements,
 * never remove built-in ones — a config layer cannot weaken the baseline).
 */
export function resolveLifecycleGates(layers: readonly unknown[]): {
  gates: ResolvedLifecycleGates[];
  diagnostics: string[];
} {
  const diagnostics: string[] = [];
  const merged = new Map<LifecyclePoint, ResolvedLifecycleGates>();
  // Start from built-ins.
  for (const gate of BUILTIN_LIFECYCLE_GATES) {
    merged.set(gate.point, {
      point: gate.point,
      requireArtifacts: [...(gate.requireArtifacts ?? [])],
      requireEvidenceVerified: gate.requireEvidenceVerified ?? false,
      requireVerdict: gate.requireVerdict ?? false,
      requireCleanDrift: gate.requireCleanDrift ?? false,
      message: gate.message ?? null,
    });
  }
  // Overlay config layers (additive-only).
  for (const [index, layer] of layers.entries()) {
    if (layer === null || layer === undefined) continue;
    if (!Array.isArray(layer)) {
      diagnostics.push(`lifecycle gate layer ${index} ignored (not an array)`);
      continue;
    }
    for (const candidate of layer) {
      const parsed = LifecycleGateSchema.safeParse(candidate);
      if (!parsed.success) {
        diagnostics.push(
          `lifecycle gate layer ${index}: invalid gate ignored (${parsed.error.issues.length} issue(s))`,
        );
        continue;
      }
      const gate = parsed.data;
      const existing = merged.get(gate.point);
      if (existing === undefined) {
        diagnostics.push(`lifecycle gate layer ${index}: unknown point '${gate.point}'`);
        continue;
      }
      // Additive merge: union artifacts, OR the booleans; never subtract.
      existing.requireArtifacts = [
        ...new Set([...existing.requireArtifacts, ...(gate.requireArtifacts ?? [])]),
      ];
      existing.requireEvidenceVerified =
        existing.requireEvidenceVerified || (gate.requireEvidenceVerified ?? false);
      existing.requireVerdict = existing.requireVerdict || (gate.requireVerdict ?? false);
      existing.requireCleanDrift = existing.requireCleanDrift || (gate.requireCleanDrift ?? false);
      if (gate.message !== undefined) existing.message = gate.message;
    }
  }
  const gates = [...merged.values()].sort((a, b) =>
    a.point < b.point ? -1 : a.point > b.point ? 1 : 0,
  );
  for (const gate of gates) {
    gate.requireArtifacts.sort();
  }
  return { gates, diagnostics };
}
