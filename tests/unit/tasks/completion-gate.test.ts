import { execFileSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { EvidenceStore } from "../../../src/core/evidence/index.js";
import { syncRegistry } from "../../../src/core/evidence/sync.js";
import { resolveRepositoryRoot } from "../../../src/core/filesystem/root.js";
import { serialize, TaskStore } from "../../../src/core/tasks/index.js";
import { computeStateBinding } from "../../../src/core/verification/binding.js";
import { VerdictStore } from "../../../src/core/verification/store.js";
import { WorkflowStore } from "../../../src/core/workflow/index.js";

let rootPath = "";
const today = "2026-08-31";

beforeAll(async () => {
  rootPath = await mkdtemp(path.join(tmpdir(), "ackit-gate-"));
  execFileSync("git", ["-C", rootPath, "init", "-q"], { stdio: "ignore" });
  execFileSync("git", ["-C", rootPath, "config", "user.email", "t@example.com"], {
    stdio: "ignore",
  });
  execFileSync("git", ["-C", rootPath, "config", "user.name", "t"], { stdio: "ignore" });
  await writeFile(path.join(rootPath, "README.md"), "# gate fixture\n", "utf8");
  execFileSync("git", ["-C", rootPath, "add", "."], { stdio: "ignore" });
  execFileSync("git", ["-C", rootPath, "commit", "-q", "-m", "init"], { stdio: "ignore" });
});

afterAll(async () => {
  await rm(rootPath, { recursive: true, force: true });
});

async function resolvedRoot() {
  const resolved = await resolveRepositoryRoot(rootPath);
  if (!resolved.ok) throw new Error(resolved.diagnostic.message);
  return resolved.root;
}

/**
 * Author a task whose acceptance criteria are CHECKED and whose completion
 * notes are REAL — so the only gate dimension under test is the workflow gate.
 * Blocks the previous test's active task first (single-active rule).
 */
async function makeCheckedTask(profile: "quick" | "standard"): Promise<string> {
  const store = new TaskStore(rootPath);
  // Single-active rule: block any previously left-active task deterministically.
  for (const doc of await store.list(false)) {
    if (doc.meta.status === "active") {
      const abs = path.join(rootPath, "docs", "tasks", "active", path.basename(doc.relativePath));
      const raw = await import("node:fs/promises").then((fsp) => fsp.readFile(abs, "utf8"));
      await import("node:fs/promises").then((fsp) =>
        fsp.writeFile(abs, raw.replace(/^status:\s*.*$/m, "status: blocked"), "utf8"),
      );
    }
  }
  const created = await store.create("gate fixture");
  const taskId = created.meta.id;
  const found = await store.find(taskId);
  if (found === null) throw new Error("task missing");
  const docAbs = path.join(
    rootPath,
    "docs",
    "tasks",
    "active",
    path.basename(created.relativePath),
  );
  const body = [
    "## Acceptance criteria",
    "",
    "- [x] Criterion one done.",
    "- [x] Criterion two done.",
    "",
    "## Completion notes",
    "",
    "All criteria implemented; evidence recorded below.",
  ].join("\n");
  await writeFile(docAbs, serialize(found.doc.meta, body), "utf8");
  await store.start(taskId);
  const workflowStore = new WorkflowStore(await resolvedRoot());
  await workflowStore.setProfile(taskId, profile);
  // Advance through the profile's stages (checked tasks need no artifacts for
  // quick; standard needs intent+task at intent, plan at plan, evidence at verify).
  if (profile === "standard") {
    // Provide the required artifacts by authoring frontmatter refs.
    const docWithRefs = await store.find(taskId);
    if (docWithRefs === null) throw new Error("task missing");
    const intentDoc = [
      "---",
      'schemaId: "ackit.intent.v1"',
      'id: "INTENT-0001"',
      'title: "gate intent"',
      "status: accepted",
      `createdAt: "${today}"`,
      'problem: "p"',
      'desiredOutcome: "d"',
      "---",
    ].join("\n");
    const { mkdir, writeFile: wf } = await import("node:fs/promises");
    await mkdir(path.join(rootPath, "docs", "intent"), { recursive: true });
    await wf(path.join(rootPath, "docs", "intent", "INTENT-0001-gate.md"), intentDoc, "utf8");
    await mkdir(path.join(rootPath, "docs", "plans"), { recursive: true });
    await wf(path.join(rootPath, "docs", "plans", "gate.md"), "# plan\n", "utf8");
    const metaWithRefs = {
      ...docWithRefs.doc.meta,
      intentRef: "INTENT-0001",
      planRef: "docs/plans/gate.md",
    };
    await writeFile(docAbs, serialize(metaWithRefs, docWithRefs.doc.body), "utf8");
    // intent → plan → tasks → implement (evidence gate fires at verify).
    await workflowStore.advanceTo(taskId, "plan");
    await workflowStore.advanceTo(taskId, "tasks");
    await workflowStore.advanceTo(taskId, "implement");
  }
  return taskId;
}

async function evidenceComplete(taskId: string): Promise<void> {
  const store = new TaskStore(rootPath);
  const doc = await store.find(taskId);
  if (doc === null) throw new Error("task missing");
  const evidenceStore = new EvidenceStore(await resolvedRoot());
  const registry = syncRegistry(doc.doc, null, today);
  for (const criterion of registry.criteria) {
    criterion.status = "verified";
    criterion.evidence = [{ type: "test", ref: "pnpm vitest run (green)", recordedAt: today }];
  }
  await evidenceStore.save(taskId, registry);
}

async function registerVerdict(taskId: string, verdict: string): Promise<void> {
  const verdicts = new VerdictStore(rootPath);
  const registry = await new EvidenceStore(await resolvedRoot()).load(taskId);
  // Fresh-context verdicts carry the CURRENT bundle digest as reviewed proof
  // (TASK-0080), so gate success paths exercise independent verdicts.
  const binding = await computeStateBinding(rootPath, taskId);
  await verdicts.register(
    taskId,
    {
      schemaId: "ackit.verdict.v1",
      verdict,
      verifier: { agent: "fresh-verifier/1.0", context: "fresh", issuedAt: today },
      findings:
        verdict === "REWORK_REQUIRED"
          ? [
              {
                severity: "blocking",
                criterion: "AC-001",
                code: "REQUIRED_RUNTIME_EVIDENCE_MISSING",
                message: "runtime evidence missing",
              },
            ]
          : [],
      checkedCriteria: ["AC-001", "AC-002"],
      summary: "s",
    },
    { evidenceRegistry: registry, binding, reviewedBundleDigest: binding.bundleDigest },
  );
}

describe("workflow completion gate (ADR-0026 §5/§16, TASK-0053)", () => {
  it("MANDATED SCENARIO — evidence gate: implementation exists → mandatory evidence missing → completion denied", async () => {
    const taskId = await makeCheckedTask("standard");
    const store = new TaskStore(rootPath);
    // Advance to verify (needs evidence artifact) — evidence registry does not
    // exist yet; force the stage via the workflow store's gate-checked advance
    // is NOT used here; we set the stage directly to prove the COMPLETION gate.
    const workflowStore = new WorkflowStore(await resolvedRoot());
    // Try completing: expect MISSING_REQUIRED_ARTIFACT (no registry).
    await expect(store.complete(taskId)).rejects.toThrow(/MISSING_REQUIRED_ARTIFACT/);
    // Registry exists but evidence incomplete → criteria unverified.
    const doc = await store.find(taskId);
    if (doc === null) throw new Error("task missing");
    const evidenceStore = new EvidenceStore(await resolvedRoot());
    await evidenceStore.save(taskId, syncRegistry(doc.doc, null, today));
    await expect(store.complete(taskId)).rejects.toThrow(
      /CRITERION_UNVERIFIED|REQUIRED_EVIDENCE_MISSING/,
    );
    void workflowStore;
  });

  it("MANDATED SCENARIO — verifier: verdict REWORK_REQUIRED → completion denied", async () => {
    const taskId = await makeCheckedTask("standard");
    const store = new TaskStore(rootPath);
    await evidenceComplete(taskId);
    await registerVerdict(taskId, "REWORK_REQUIRED");
    await expect(store.complete(taskId)).rejects.toThrow(/VERDICT_BLOCKING/);
  });

  it("MANDATED SCENARIO — stage/loop: fail attempt blocks; pass + PASS verdict allows completion", async () => {
    const taskId = await makeCheckedTask("standard");
    const store = new TaskStore(rootPath);
    const workflowStore = new WorkflowStore(await resolvedRoot());
    // Record a failed verification attempt → stage rewinds to implement.
    await workflowStore.recordVerificationAttempt(taskId, "fail");
    await expect(store.complete(taskId)).rejects.toThrow(
      /VERIFICATION_ATTEMPT_FAILED|WORKFLOW_STAGE_INVALID/,
    );
    // Fix loop: record pass, advance to verify, register evidence + PASS verdict.
    await workflowStore.recordVerificationAttempt(taskId, "pass");
    const wf = await workflowStore.load(taskId);
    if (wf === null) throw new Error("workflow state missing");
    // Advance implement → verify (evidence registry must exist by now for the
    // workflow advance gate; evidenceComplete satisfies it).
    await evidenceComplete(taskId);
    await workflowStore.advanceTo(taskId, "verify");
    await registerVerdict(taskId, "PASS");
    const result = await store.complete(taskId);
    expect(result.forced).toBe(false);
    expect(result.warnings).toEqual([]);
  });

  it("MANDATED SCENARIO — quick profile: no evidence registry or verdict required", async () => {
    const taskId = await makeCheckedTask("quick");
    const store = new TaskStore(rootPath);
    const workflowStore = new WorkflowStore(await resolvedRoot());
    // Advance task → implement → verify; quick requires no planning artifacts.
    await workflowStore.advanceTo(taskId, "implement");
    await workflowStore.advanceTo(taskId, "verify");
    const result = await store.complete(taskId);
    expect(result.forced).toBe(false);
    expect(result.warnings).toEqual([]);
  });

  it("legacy tasks keep the exact pre-expansion behavior (no workflow gate)", async () => {
    const store = new TaskStore(rootPath);
    // Block any previously left-active task (single-active rule).
    for (const doc of await store.list(false)) {
      if (doc.meta.status === "active") {
        const abs = path.join(rootPath, "docs", "tasks", "active", path.basename(doc.relativePath));
        const fsp = await import("node:fs/promises");
        const raw = await fsp.readFile(abs, "utf8");
        await fsp.writeFile(abs, raw.replace(/^status:\s*.*$/m, "status: blocked"), "utf8");
      }
    }
    const created = await store.create("legacy gate fixture");
    const taskId = created.meta.id;
    const found = await store.find(taskId);
    if (found === null) throw new Error("task missing");
    const docAbs = path.join(
      rootPath,
      "docs",
      "tasks",
      "active",
      path.basename(created.relativePath),
    );
    const body = [
      "## Acceptance criteria",
      "",
      "- [x] Done.",
      "",
      "## Completion notes",
      "",
      "Legacy task completed with notes.",
    ].join("\n");
    await writeFile(docAbs, serialize(found.doc.meta, body), "utf8");
    await store.start(taskId);
    // No workflow state file → completes without evidence/verdict blockers.
    const result = await store.complete(taskId);
    expect(result.forced).toBe(false);
    expect(result.warnings).toEqual([]);
  });

  it("--force still overrides workflow blockers with recorded warnings", async () => {
    const taskId = await makeCheckedTask("standard");
    const store = new TaskStore(rootPath);
    const result = await store.complete(taskId, { force: true });
    expect(result.forced).toBe(true);
    expect(result.warnings.some((w) => w.includes("--force overrode"))).toBe(true);
    expect(result.warnings.some((w) => w.includes("MISSING_REQUIRED_ARTIFACT"))).toBe(true);
  });

  it("NEGATIVE (audit TASK-0064): missing verdict ALONE denies completion (evidence complete, stage valid)", async () => {
    const taskId = await makeCheckedTask("standard");
    const store = new TaskStore(rootPath);
    const workflowStore = new WorkflowStore(await resolvedRoot());
    await evidenceComplete(taskId);
    await workflowStore.advanceTo(taskId, "verify");
    // No verdict registered → the ONLY blocker must be the missing verdict.
    let blockers: string[] = [];
    await expect(store.complete(taskId)).rejects.toThrow();
    try {
      await store.complete(taskId);
    } catch (error) {
      blockers = (error as Error).message.split(";").map((s) => s.trim());
    }
    expect(blockers.some((b) => b.startsWith("MISSING_VERIFIER_VERDICT"))).toBe(true);
    expect(blockers.some((b) => b.startsWith("MISSING_REQUIRED_ARTIFACT"))).toBe(false);
    expect(blockers.some((b) => b.startsWith("CRITERION_UNVERIFIED"))).toBe(false);
    expect(blockers.some((b) => b.startsWith("WORKFLOW_STAGE_INVALID"))).toBe(false);
  });

  it("NEGATIVE (audit TASK-0064): blocking drift ALONE denies completion", async () => {
    const taskId = await makeCheckedTask("standard");
    const store = new TaskStore(rootPath);
    const workflowStore = new WorkflowStore(await resolvedRoot());
    await evidenceComplete(taskId);
    await registerVerdict(taskId, "PASS");
    await workflowStore.advanceTo(taskId, "verify");
    // Create an untracked file OUTSIDE the task's declared scope → drift
    // ACCEPTANCE_CRITERIA_UNVERIFIED is not it (evidence is complete);
    // UNPLANNED_FILE_CHANGE is a warning for standard, so make the drift
    // blocker the TASK_DEPENDENCY one instead: depend on a pending task.
    const other = await store.create("unmet dependency fixture");
    const doc = await store.find(taskId);
    if (doc === null) throw new Error("task missing");
    const metaWithDep = {
      ...doc.doc.meta,
      dependencies: [other.meta.id],
    };
    const docAbs = path.join(
      rootPath,
      "docs",
      "tasks",
      "active",
      path.basename(doc.doc.relativePath),
    );
    await writeFile(docAbs, serialize(metaWithDep, doc.doc.body), "utf8");
    let blockers: string[] = [];
    await expect(store.complete(taskId)).rejects.toThrow();
    try {
      await store.complete(taskId);
    } catch (error) {
      blockers = (error as Error).message.split(";").map((s) => s.trim());
    }
    expect(blockers.some((b) => b.startsWith("TASK_DEPENDENCY_NOT_SATISFIED"))).toBe(true);
    expect(blockers.some((b) => b.startsWith("MISSING_VERIFIER_VERDICT"))).toBe(false);
  });
});

describe("review-policy completion-gate integration (ADR-0028 §2, TASK-0064)", () => {
  it("a review policy requiring an uncovered dimension blocks a PASS verdict via VERDICT_BLOCKING", async () => {
    // Configure a review policy in ackit.yml requiring the security dimension.
    const { writeFile: wf } = await import("node:fs/promises");
    await wf(
      path.join(rootPath, "ackit.yml"),
      ["schemaVersion: 1", "review:", "  required:", "    - security"].join("\n"),
      "utf8",
    );
    const taskId = await makeCheckedTask("standard");
    const store = new TaskStore(rootPath);
    const workflowStore = new WorkflowStore(await resolvedRoot());
    await evidenceComplete(taskId);
    await workflowStore.advanceTo(taskId, "verify");
    // PASS verdict whose findings carry NO security-dimension codes.
    await registerVerdict(taskId, "PASS");
    let blockers: string[] = [];
    await expect(store.complete(taskId)).rejects.toThrow();
    try {
      await store.complete(taskId);
    } catch (error) {
      blockers = (error as Error).message.split(";").map((s) => s.trim());
    }
    const reviewBlocker = blockers.find((b) => b.includes("REVIEW-DIMENSION-MISSING"));
    expect(reviewBlocker).toBeDefined();
    expect(reviewBlocker?.includes("VERDICT_BLOCKING")).toBe(true);

    // Remove the review policy → the verdict bound under the old config is
    // stale by design (config is a bound class); a fresh bundle/verdict
    // restores eligibility with no regression for unconfigured repositories.
    await wf(path.join(rootPath, "ackit.yml"), "schemaVersion: 1\n", "utf8");
    const freshRegistry = await new EvidenceStore(await resolvedRoot()).load(taskId);
    const freshBinding = await computeStateBinding(rootPath, taskId);
    // Fresh re-verdict = NEW judged content (distinct summary): replaying the
    // byte-identical first verdict would be VERDICT-REPLAY-REJECTED.
    await new VerdictStore(rootPath).register(
      taskId,
      {
        schemaId: "ackit.verdict.v1",
        verdict: "PASS",
        verifier: { agent: "fresh-verifier/1.0", context: "fresh", issuedAt: today },
        findings: [],
        checkedCriteria: ["AC-001", "AC-002"],
        summary: "re-verified after review policy removal",
      },
      {
        evidenceRegistry: freshRegistry,
        binding: freshBinding,
        reviewedBundleDigest: freshBinding.bundleDigest,
      },
    );
    const result = await store.complete(taskId);
    expect(result.forced).toBe(false);
  });

  it("blockingSeverity enforcement: a warning finding blocks when blockingSeverity includes medium; info does not", async () => {
    const { writeFile: wf } = await import("node:fs/promises");
    await wf(
      path.join(rootPath, "ackit.yml"),
      ["schemaVersion: 1", "review:", "  blockingSeverity:", "    - medium"].join("\n"),
      "utf8",
    );
    const taskId = await makeCheckedTask("standard");
    const store = new TaskStore(rootPath);
    const workflowStore = new WorkflowStore(await resolvedRoot());
    await evidenceComplete(taskId);
    await workflowStore.advanceTo(taskId, "verify");
    const verdicts = new VerdictStore(rootPath);
    const registry = await new EvidenceStore(await resolvedRoot()).load(taskId);
    // severity "info" is BELOW the medium threshold → completes fine.
    const infoBinding = await computeStateBinding(rootPath, taskId);
    await verdicts.register(
      taskId,
      {
        schemaId: "ackit.verdict.v1",
        verdict: "PASS_WITH_WARNINGS",
        verifier: { agent: "t/1.0", context: "fresh", issuedAt: today },
        findings: [{ severity: "info", code: "DOC_STALE_NOTE", message: "doc note is stale" }],
        checkedCriteria: ["AC-001", "AC-002"],
        summary: "s",
      },
      {
        evidenceRegistry: registry,
        binding: infoBinding,
        reviewedBundleDigest: infoBinding.bundleDigest,
      },
    );
    const ok = await store.complete(taskId);
    expect(ok.forced).toBe(false);

    // severity "warning" maps to medium → REVIEW-BLOCKING-SEVERITY fires.
    const taskId2 = await makeCheckedTask("standard");
    const workflowStore2 = new WorkflowStore(await resolvedRoot());
    await evidenceComplete(taskId2);
    await workflowStore2.advanceTo(taskId2, "verify");
    const registry2 = await new EvidenceStore(await resolvedRoot()).load(taskId2);
    const warnBinding = await computeStateBinding(rootPath, taskId2);
    await verdicts.register(
      taskId2,
      {
        schemaId: "ackit.verdict.v1",
        verdict: "PASS_WITH_WARNINGS",
        verifier: { agent: "t/1.0", context: "fresh", issuedAt: today },
        findings: [
          { severity: "warning", code: "CORRECTNESS_GAP", message: "correctness gap noted" },
        ],
        checkedCriteria: ["AC-001", "AC-002"],
        summary: "s",
      },
      {
        evidenceRegistry: registry2,
        binding: warnBinding,
        reviewedBundleDigest: warnBinding.bundleDigest,
      },
    );
    let blockers: string[] = [];
    await expect(store.complete(taskId2)).rejects.toThrow();
    try {
      await store.complete(taskId2);
    } catch (error) {
      blockers = (error as Error).message.split(";").map((s) => s.trim());
    }
    expect(
      blockers.some(
        (b) => b.includes("REVIEW-BLOCKING-SEVERITY") && b.includes("VERDICT_BLOCKING"),
      ),
    ).toBe(true);

    // Cleanup: remove the review policy for subsequent tests.
    await wf(path.join(rootPath, "ackit.yml"), "schemaVersion: 1\n", "utf8");
  });

  it("TASK-0080 — same-process PASS verdict cannot silently satisfy independence (VERDICT-INDEPENDENCE-UNPROVEN)", async () => {
    const taskId = await makeCheckedTask("standard");
    const store = new TaskStore(rootPath);
    const workflowStore = new WorkflowStore(await resolvedRoot());
    await evidenceComplete(taskId);
    await workflowStore.advanceTo(taskId, "verify");
    // Same-context verdict: fresh and bound, but with no reviewed bundle.
    const verdicts = new VerdictStore(rootPath);
    const registry = await new EvidenceStore(await resolvedRoot()).load(taskId);
    const registered = await verdicts.register(
      taskId,
      {
        schemaId: "ackit.verdict.v1",
        verdict: "PASS",
        verifier: { agent: "implementer/1.0", context: "same", issuedAt: today },
        findings: [],
        checkedCriteria: ["AC-001", "AC-002"],
        summary: "self-review",
      },
      { evidenceRegistry: registry, binding: await computeStateBinding(rootPath, taskId) },
    );
    expect(registered.reviewedBundleDigest).toBeNull();
    await expect(store.complete(taskId)).rejects.toThrow(/VERDICT-INDEPENDENCE-UNPROVEN/);
    // A fresh independent re-verdict (new content + bundle proof) restores
    // eligibility — the refusal is about proof, not punishment.
    const proof = await computeStateBinding(rootPath, taskId);
    await verdicts.register(
      taskId,
      {
        schemaId: "ackit.verdict.v1",
        verdict: "PASS",
        verifier: { agent: "fresh-verifier/2.0", context: "fresh", issuedAt: today },
        findings: [],
        checkedCriteria: ["AC-001", "AC-002"],
        summary: "independent re-review with bundle proof",
      },
      { evidenceRegistry: registry, binding: proof, reviewedBundleDigest: proof.bundleDigest },
    );
    const result = await store.complete(taskId);
    expect(result.forced).toBe(false);
  });
});
