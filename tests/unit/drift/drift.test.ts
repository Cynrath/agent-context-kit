import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  type DriftInput,
  declaredScopeGlobs,
  detectWorkflowDrift,
} from "../../../src/core/drift/index.js";
import type { TaskDoc } from "../../../src/core/tasks/index.js";

let rootPath = "";

beforeAll(async () => {
  rootPath = await mkdtemp(path.join(tmpdir(), "ackit-drift-"));
});

afterAll(async () => {
  await rm(rootPath, { recursive: true, force: true });
});

function taskDoc(overrides: Partial<TaskDoc> = {}): TaskDoc {
  return {
    meta: {
      id: "TASK-0001",
      title: "drift fixture",
      status: "active",
      schemaVersion: 2,
      dependencies: [],
      createdAt: "2026-08-31",
      completedAt: null,
      ...((overrides.meta ?? {}) as object),
    },
    relativePath: "docs/tasks/active/TASK-0001-drift-fixture.md",
    body: "## Acceptance criteria\n\n- [ ] A.\n",
    ...overrides,
  } as TaskDoc;
}

function input(overrides: Partial<DriftInput> = {}): DriftInput {
  return {
    taskId: "TASK-0001",
    taskDoc: taskDoc(),
    workflow: null,
    requiredArtifacts: [],
    existingArtifacts: ["task"],
    referencePathsExist: [],
    evidence: null,
    latestVerdict: null,
    checkpoint: null,
    checkpointProblems: [],
    changedFiles: [],
    dependencies: [],
    ...overrides,
  };
}

describe("detectWorkflowDrift (deterministic findings, §9)", () => {
  it("MANDATED SCENARIO: task declares src/a/** → change src/security/x.ts → UNPLANNED_FILE_CHANGE", () => {
    const doc = taskDoc({
      body: "## Affected files\n\n- src/a/**\n- tests/a/**\n\n## Acceptance criteria\n\n- [ ] A.\n",
    });
    const findings = detectWorkflowDrift(
      input({ taskDoc: doc, changedFiles: ["src/security/x.ts", "src/a/ok.ts"] }),
    );
    const unplanned = findings.filter((f) => f.code === "UNPLANNED_FILE_CHANGE");
    expect(unplanned).toHaveLength(1);
    expect(unplanned[0]?.detail).toContain("src/security/x.ts");
  });

  it("task updated to declare the new area first does NOT yield the finding", () => {
    const doc = taskDoc({
      body: "## Affected files\n\n- src/a/**\n- src/security/**\n\n## Acceptance criteria\n\n- [ ] A.\n",
    });
    const findings = detectWorkflowDrift(
      input({ taskDoc: doc, changedFiles: ["src/security/x.ts"] }),
    );
    expect(findings.filter((f) => f.code === "UNPLANNED_FILE_CHANGE")).toHaveLength(0);
  });

  it("high-risk profile escalates UNPLANNED_FILE_CHANGE to blocking; standard stays warning", () => {
    const doc = taskDoc({
      body: "## Affected files\n\n- src/a/**\n\n## Acceptance criteria\n\n- [ ] A.\n",
    });
    const highRisk = detectWorkflowDrift(
      input({
        taskDoc: doc,
        changedFiles: ["src/security/x.ts"],
        workflow: { profile: "high-risk", stage: "implement" },
      }),
    );
    expect(highRisk.find((f) => f.code === "UNPLANNED_FILE_CHANGE")?.severity).toBe("blocking");
    const standard = detectWorkflowDrift(
      input({
        taskDoc: doc,
        changedFiles: ["src/security/x.ts"],
        workflow: { profile: "standard", stage: "implement" },
      }),
    );
    expect(standard.find((f) => f.code === "UNPLANNED_FILE_CHANGE")?.severity).toBe("warning");
  });

  it("excludes .ackit/ state and task docs from unplanned-change checks", () => {
    const doc = taskDoc({
      body: "## Affected files\n\n- src/a/**\n\n## Acceptance criteria\n\n- [ ] A.\n",
    });
    const findings = detectWorkflowDrift(
      input({
        taskDoc: doc,
        changedFiles: [".ackit/workflow/TASK-0001/state.yaml", "docs/tasks/active/other.md"],
      }),
    );
    expect(findings.filter((f) => f.code === "UNPLANNED_FILE_CHANGE")).toHaveLength(0);
  });

  it("MISSING_REQUIRED_ARTIFACT for each absent required artifact (blocking)", () => {
    const findings = detectWorkflowDrift(
      input({
        requiredArtifacts: ["intent", "plan", "evidence"],
        existingArtifacts: ["task", "intent"],
      }),
    );
    const missing = findings.filter((f) => f.code === "MISSING_REQUIRED_ARTIFACT");
    expect(missing.map((f) => f.detail)).toContain("required artifact 'plan' does not exist");
    expect(missing.map((f) => f.detail)).toContain("required artifact 'evidence' does not exist");
    expect(missing.every((f) => f.severity === "blocking")).toBe(true);
  });

  it("ACCEPTANCE_CRITERIA_UNVERIFIED for unverified registry criteria", () => {
    const findings = detectWorkflowDrift(
      input({
        evidence: {
          schemaId: "ackit.evidence.v2",
          taskId: "TASK-0001",
          updatedAt: "2026-08-31",
          criteria: [
            { id: "AC-001", requirement: "r1", status: "verified", evidence: [] },
            { id: "AC-002", requirement: "r2", status: "unverified", evidence: [] },
          ],
        },
      }),
    );
    const unverified = findings.filter((f) => f.code === "ACCEPTANCE_CRITERIA_UNVERIFIED");
    expect(unverified).toHaveLength(1);
    expect(unverified[0]?.detail).toContain("AC-002");
  });

  it("MISSING_VERIFIER_VERDICT for non-quick profiles without a verdict; quick exempt", () => {
    const standard = detectWorkflowDrift(
      input({ workflow: { profile: "standard", stage: "verify" } }),
    );
    expect(standard.some((f) => f.code === "MISSING_VERIFIER_VERDICT")).toBe(true);
    const quick = detectWorkflowDrift(input({ workflow: { profile: "quick", stage: "verify" } }));
    expect(quick.some((f) => f.code === "MISSING_VERIFIER_VERDICT")).toBe(false);
    const passed = detectWorkflowDrift(
      input({
        workflow: { profile: "standard", stage: "verify" },
        latestVerdict: { verdict: "PASS" },
      }),
    );
    expect(passed.some((f) => f.code === "MISSING_VERIFIER_VERDICT")).toBe(false);
  });

  it("STALE_CHECKPOINT passthrough as warning; PLAN_REFERENCE_MISSING as warning", () => {
    const findings = detectWorkflowDrift(
      input({
        taskDoc: taskDoc({
          meta: { planRef: "docs/plans/missing.md" } as TaskDoc["meta"],
        }),
        checkpointProblems: [{ code: "STALE_CHECKPOINT", message: "recorded head not reachable" }],
      }),
    );
    expect(findings.some((f) => f.code === "STALE_CHECKPOINT" && f.severity === "warning")).toBe(
      true,
    );
    expect(findings.some((f) => f.code === "PLAN_REFERENCE_MISSING")).toBe(true);
  });

  it("TASK_DEPENDENCY_NOT_SATISFIED for incomplete dependencies (blocking)", () => {
    const findings = detectWorkflowDrift(
      input({ dependencies: [{ id: "TASK-0009", completed: false }] }),
    );
    const dep = findings.filter((f) => f.code === "TASK_DEPENDENCY_NOT_SATISFIED");
    expect(dep).toHaveLength(1);
    expect(dep[0]?.severity).toBe("blocking");
  });

  it("WORKFLOW_STAGE_INVALID for a stage outside the profile set", () => {
    const findings = detectWorkflowDrift(
      input({ workflow: { profile: "quick", stage: "release-evidence" } }),
    );
    expect(findings.some((f) => f.code === "WORKFLOW_STAGE_INVALID")).toBe(true);
  });

  it("deterministic ordering: same inputs → identical findings array", () => {
    const doc = taskDoc({
      body: "## Affected files\n\n- src/a/**\n\n## Acceptance criteria\n\n- [ ] A.\n",
    });
    const base = input({
      taskDoc: doc,
      changedFiles: ["src/security/x.ts", "src/a/ok.ts"],
      dependencies: [{ id: "TASK-0002", completed: false }],
    });
    const a = detectWorkflowDrift(base);
    const b = detectWorkflowDrift(base);
    expect(a).toEqual(b);
  });

  it("declaredScopeGlobs extracts the affected-files section", () => {
    const globs = declaredScopeGlobs(
      taskDoc({ body: "## Affected files\n\n- src/a/**\n- tests/a/**\n" }),
    );
    expect(globs).toEqual(["src/a/**", "tests/a/**"]);
  });
});
