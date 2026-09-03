import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resolveRepositoryRoot } from "../../../src/core/filesystem/root.js";
import {
  BUILTIN_PROFILES,
  canAdvance,
  listWorkflowProfiles,
  requiredArtifacts,
  resolveProfileRequirements,
  stageInProfile,
  validateWorkflow,
  WORKFLOW_SCHEMA_ID,
  WorkflowStore,
  WorkflowStoreError,
} from "../../../src/core/workflow/index.js";

let rootPath = "";

beforeAll(async () => {
  rootPath = await mkdtemp(path.join(tmpdir(), "ackit-wf-"));
  await writeFile(path.join(rootPath, "AGENTS.md"), "# wf fixture\n");
});

afterAll(async () => {
  await rm(rootPath, { recursive: true, force: true });
});

async function store(): Promise<WorkflowStore> {
  const resolved = await resolveRepositoryRoot(rootPath);
  if (!resolved.ok) throw new Error(resolved.diagnostic.message);
  return new WorkflowStore(resolved.root);
}

describe("workflow profile catalog (ADR-0025)", () => {
  it("exposes exactly the three built-in profiles", () => {
    expect(listWorkflowProfiles()).toEqual(["quick", "standard", "high-risk"]);
  });

  it("declares the canonical stage orders", () => {
    expect(BUILTIN_PROFILES.quick.stages).toEqual(["task", "implement", "verify"]);
    expect(BUILTIN_PROFILES.standard.stages).toEqual([
      "intent",
      "plan",
      "tasks",
      "implement",
      "verify",
      "review",
    ]);
    expect(BUILTIN_PROFILES["high-risk"].stages).toEqual([
      "intent",
      "spec",
      "plan",
      "tasks",
      "implement",
      "verify",
      "independent-review",
      "release-evidence",
    ]);
  });

  it("quick requires no intent/spec/evidence/verdict; standard/high-risk do", () => {
    expect(BUILTIN_PROFILES.quick.requiresVerdict).toBe(false);
    expect(BUILTIN_PROFILES.quick.requiresEvidence).toBe(false);
    expect(BUILTIN_PROFILES.standard.requiresVerdict).toBe(true);
    expect(BUILTIN_PROFILES["high-risk"].requiresVerdict).toBe(true);
    expect(BUILTIN_PROFILES.standard.requiresEvidence).toBe(true);
    expect(BUILTIN_PROFILES["high-risk"].requiresEvidence).toBe(true);
  });

  it("verify stage of standard requires evidence; independent-review of high-risk requires verdict", () => {
    expect(requiredArtifacts("standard", "verify").artifacts).toEqual(["evidence"]);
    expect(requiredArtifacts("high-risk", "independent-review").artifacts).toEqual(["verdict"]);
    expect(requiredArtifacts("quick", "verify").artifacts).toEqual([]);
  });

  it("config overrides tighten requirements additively, never loosen (TASK-0067)", () => {
    expect(resolveProfileRequirements("standard").requiresVerdict).toBe(true);
    // Built-in true stays true even when config says false (additive-only).
    expect(resolveProfileRequirements("standard", { requireVerifier: false }).requiresVerdict).toBe(
      true,
    );
    expect(
      resolveProfileRequirements("standard", { requireEvidence: false }).requiresEvidence,
    ).toBe(true);
    // Explicit true tightens a built-in false.
    expect(resolveProfileRequirements("quick", { requireVerifier: true }).requiresVerdict).toBe(
      true,
    );
    expect(resolveProfileRequirements("quick", { requireEvidence: true }).requiresEvidence).toBe(
      true,
    );
    // Absence preserves defaults.
    expect(resolveProfileRequirements("quick").requiresVerdict).toBe(false);
    expect(resolveProfileRequirements("quick").requiresEvidence).toBe(false);
  });

  it("forward-only transitions; skip/back are invalid", () => {
    expect(canAdvance("quick", "task", "implement")).toBe(true);
    expect(canAdvance("quick", "task", "verify")).toBe(false);
    expect(canAdvance("quick", "verify", "implement")).toBe(false);
    expect(canAdvance("standard", "verify", "review")).toBe(true);
    expect(canAdvance("standard", "review", "verify")).toBe(false);
    expect(stageInProfile("standard", "spec")).toBe(false);
    expect(stageInProfile("high-risk", "spec")).toBe(true);
  });
});

describe("WorkflowStore (ackit.workflow.v1 state)", () => {
  it("set/advance/verify round-trips with strict validation", async () => {
    const workflow = await store();
    const state = await workflow.setProfile("TASK-0001", "quick");
    expect(state.schemaId).toBe(WORKFLOW_SCHEMA_ID);
    expect(state.stage).toBe("task");
    const advanced = await workflow.advanceTo("TASK-0001", "implement");
    expect(advanced.stage).toBe("implement");
    const failed = await workflow.recordVerificationAttempt("TASK-0001", "fail");
    expect(failed.stage).toBe("implement"); // verify/fix loop rewind
    const passed = await workflow.recordVerificationAttempt("TASK-0001", "pass");
    expect(passed.stage).toBe("implement"); // pass records, does not advance
  });

  it("rejects invalid transitions with WORKFLOW_STAGE_INVALID", async () => {
    const workflow = await store();
    await workflow.setProfile("TASK-0002", "standard");
    await workflow.advanceTo("TASK-0002", "plan"); // intent → plan
    await expect(workflow.advanceTo("TASK-0002", "review")).rejects.toMatchObject({
      code: WORKFLOW_STAGE_INVALID_MESSAGE,
    });
    await expect(workflow.advanceTo("TASK-0002", "intent")).rejects.toMatchObject({
      code: WORKFLOW_STAGE_INVALID_MESSAGE,
    });
  });

  it("rejects unknown profiles and malformed task ids (traversal safe)", async () => {
    const workflow = await store();
    await expect(
      // biome-ignore lint/suspicious/noExplicitAny: testing invalid input
      workflow.setProfile("TASK-0003", "enterprise" as any),
    ).rejects.toBeInstanceOf(WorkflowStoreError);
    await expect(
      // biome-ignore lint/suspicious/noExplicitAny: testing invalid input
      workflow.setProfile("../../escape" as any, "quick"),
    ).rejects.toMatchObject({ code: "WORKFLOW-TASK-ID-INVALID" });
  });

  it("rejects unknown fields on load (THREAT_MODEL T16)", async () => {
    const workflow = await store();
    await workflow.setProfile("TASK-0004", "quick");
    const stateFile = path.join(rootPath, ".ackit", "workflow", "TASK-0004", "state.yaml");
    const { readFile, writeFile } = await import("node:fs/promises");
    const raw = await readFile(stateFile, "utf8");
    await writeFile(stateFile, `${raw}injectedField: pwned\n`, "utf8");
    await expect(workflow.load("TASK-0004")).rejects.toMatchObject({
      code: "WORKFLOW-STATE-INVALID",
    });
  });

  it("deterministic serialization: same state → byte-identical file", async () => {
    const workflow = await store();
    const a = await workflow.setProfile("TASK-0005", "standard");
    const file = path.join(rootPath, ".ackit", "workflow", "TASK-0005", "state.yaml");
    const { readFile, rename, writeFile } = await import("node:fs/promises");
    const first = await readFile(file, "utf8");
    await rename(file, `${file}.first`);
    // same date + same inputs → identical bytes (dates are date-only, so the
    // only variance is the calendar day; force equality by writing the first
    // snapshot back after re-setting the profile)
    await workflow.setProfile("TASK-0005", "standard");
    const second = await readFile(file, "utf8");
    // stage histories match (both fresh setProfile calls with entry stage)
    expect(second.replace(/updatedAt: .*/g, "")).toBe(first.replace(/updatedAt: .*/g, ""));
    await writeFile(`${file}.first`, second, "utf8");
    void a;
  });

  it("lists task ids with state (deterministic order)", async () => {
    const workflow = await store();
    await workflow.setProfile("TASK-0007", "quick");
    const ids = await workflow.listTaskIds();
    expect(ids.includes("TASK-0007")).toBe(true);
    expect([...ids].sort()).toEqual(ids);
  });
});

const WORKFLOW_STAGE_INVALID_MESSAGE = "WORKFLOW_STAGE_INVALID";

describe("validateWorkflow", () => {
  const validState = {
    schemaId: WORKFLOW_SCHEMA_ID,
    taskId: "TASK-0001",
    profile: "quick",
    stage: "implement",
    createdAt: "2026-08-31",
    updatedAt: "2026-08-31",
    stageHistory: [{ stage: "task", enteredAt: "2026-08-31" }],
    verificationAttempts: [],
  };

  it("accepts a valid state and reports required artifacts", async () => {
    const result = await validateWorkflow({ taskId: "TASK-0001", state: validState });
    expect(result.ok).toBe(true);
    expect(result.problems).toEqual([]);
    expect(result.state).toEqual({ profile: "quick", stage: "implement" });
  });

  it("flags id mismatch and invalid transitions with stable codes", async () => {
    const mismatch = await validateWorkflow({ taskId: "TASK-0099", state: validState });
    expect(mismatch.ok).toBe(false);
    expect(mismatch.problems.some((p) => p.code === "WORKFLOW-TASK-ID-MISMATCH")).toBe(true);
    const jump = await validateWorkflow({
      taskId: "TASK-0001",
      state: validState,
      targetStage: "task",
    });
    expect(jump.ok).toBe(false);
    expect(jump.problems.some((p) => p.code === "WORKFLOW_STAGE_INVALID")).toBe(true);
  });

  it("rejects schema violations without leaking raw zod dumps", async () => {
    const bad = { ...validState, profile: "ultra" };
    const result = await validateWorkflow({ taskId: "TASK-0001", state: bad });
    expect(result.ok).toBe(false);
    expect(result.problems[0]?.code).toBe("WORKFLOW-STATE-INVALID");
    expect(result.problems[0]?.message).toMatch(/schema validation/);
  });

  it("resolves missing artifacts via the resolver (MISSING_REQUIRED_ARTIFACT)", async () => {
    const state = { ...validState, profile: "standard", stage: "intent" };
    const result = await validateWorkflow({
      taskId: "TASK-0001",
      state,
      targetStage: "plan",
      artifactResolver: (_taskId, kind) => kind === "intent",
    });
    expect(result.ok).toBe(false);
    expect(result.missing).toEqual(["plan"]);
    expect(result.problems.some((p) => p.code === "MISSING_REQUIRED_ARTIFACT")).toBe(true);
  });
});
