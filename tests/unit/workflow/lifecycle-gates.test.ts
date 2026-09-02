import { describe, expect, it } from "vitest";
import {
  BUILTIN_LIFECYCLE_GATES,
  LIFECYCLE_POINTS,
  LifecycleGateSchema,
  resolveLifecycleGates,
} from "../../../src/core/workflow/index.js";

describe("declarative lifecycle gates (ADR-0028 §3, TASK-0055)", () => {
  it("the frozen eight-point list is exactly the documented set", () => {
    expect(LIFECYCLE_POINTS).toEqual([
      "sessionStart",
      "taskStart",
      "preTaskComplete",
      "verification",
      "preCommit",
      "release",
      "error",
      "sessionEnd",
    ]);
  });

  it("NO-EXECUTION GUARANTEE (T24): command/script/run fields cannot parse", () => {
    for (const forbidden of ["command", "script", "run", "exec", "shell", "cmd"]) {
      const result = LifecycleGateSchema.safeParse({
        point: "preTaskComplete",
        [forbidden]: "echo pwned",
      });
      expect(result.success, `field '${forbidden}' must not parse`).toBe(false);
    }
    // Declarative fields all parse.
    expect(
      LifecycleGateSchema.safeParse({
        point: "preTaskComplete",
        requireArtifacts: ["task", "evidence"],
        requireEvidenceVerified: true,
        requireVerdict: true,
        requireCleanDrift: true,
        message: "gate",
      }).success,
    ).toBe(true);
  });

  it("built-ins cover all eight points deterministically", () => {
    expect(BUILTIN_LIFECYCLE_GATES.map((gate) => gate.point).sort()).toEqual(
      [...LIFECYCLE_POINTS].sort(),
    );
    // preTaskComplete is the hard boundary mirroring the completion gate.
    const preComplete = BUILTIN_LIFECYCLE_GATES.find((g) => g.point === "preTaskComplete");
    expect(preComplete?.requireArtifacts).toEqual(["task", "evidence", "verdict"]);
    expect(preComplete?.requireEvidenceVerified).toBe(true);
    expect(preComplete?.requireVerdict).toBe(true);
    expect(preComplete?.requireCleanDrift).toBe(true);
  });

  it("config layers can only ADD requirements — never weaken built-ins", () => {
    const { gates } = resolveLifecycleGates([
      [
        {
          point: "preTaskComplete",
          // Attempted weakening: fewer artifacts, booleans false — ignored.
          requireArtifacts: ["task"],
          requireEvidenceVerified: false,
          requireVerdict: false,
          requireCleanDrift: false,
        },
        { point: "sessionStart", requireArtifacts: ["intent"] }, // strengthening
      ],
    ]);
    const preComplete = gates.find((g) => g.point === "preTaskComplete");
    expect(preComplete?.requireArtifacts).toEqual(["evidence", "task", "verdict"]); // union kept
    expect(preComplete?.requireEvidenceVerified).toBe(true); // OR kept
    expect(preComplete?.requireVerdict).toBe(true);
    expect(preComplete?.requireCleanDrift).toBe(true);
    const sessionStart = gates.find((g) => g.point === "sessionStart");
    expect(sessionStart?.requireArtifacts).toEqual(["intent", "task"]); // additive
  });

  it("invalid layers are ignored with diagnostics; unknown points reported", () => {
    const { gates, diagnostics } = resolveLifecycleGates([
      { not: "an array" },
      [{ point: "preToolUse", requireArtifacts: ["task"] }], // not a lifecycle point → schema-rejected
      [{ point: "release", injected: true }],
    ]);
    expect(gates).toHaveLength(8);
    expect(diagnostics.some((d) => d.includes("not an array"))).toBe(true);
    // preToolUse is a provider-only interception point: it cannot even parse
    // (enum rejection) — the deterministic core structurally excludes it.
    expect(diagnostics.some((d) => d.includes("invalid gate ignored"))).toBe(true);
    expect(diagnostics.some((d) => d.includes("preToolUse") && d.includes("unknown point"))).toBe(
      false,
    );
  });

  it("resolution is deterministic: same layers → identical sorted gates", () => {
    const layers = [[{ point: "release", requireArtifacts: ["evidence", "verdict"] }]];
    const a = resolveLifecycleGates(layers);
    const b = resolveLifecycleGates(layers);
    expect(a.gates).toEqual(b.gates);
    expect(a.gates.map((g) => g.point)).toEqual([...a.gates.map((g) => g.point)].sort());
    // Artifacts sorted within each gate.
    const release = a.gates.find((g) => g.point === "release");
    expect(release?.requireArtifacts).toEqual(["evidence", "verdict"]);
  });
});
