/**
 * Portable verification-bound handoff tests (TASK-0082).
 *
 * Round-trip (export → import → resume equivalence), stale-handoff
 * refusal with TASK-0079 codes, v1 compatibility, determinism, and
 * redaction — all against the extended checkpoint subsystem in place
 * (no duplicate handoff machinery).
 */
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  buildHandoff,
  HANDOFF_PROBLEM_CODES,
  HANDOFF_SCHEMA_ID_V2,
  HandoffError,
  parseHandoffFile,
  validateHandoff,
} from "../../../src/core/checkpoint/handoff.js";
import { CheckpointStore } from "../../../src/core/checkpoint/index.js";
import { renderHandoffPack } from "../../../src/core/checkpoint/resume.js";
import { EvidenceStore } from "../../../src/core/evidence/index.js";
import { syncRegistry } from "../../../src/core/evidence/sync.js";
import type { RepositoryRoot } from "../../../src/core/filesystem/root.js";
import { resolveRepositoryRoot } from "../../../src/core/filesystem/root.js";
import { IntentStore } from "../../../src/core/intent/index.js";
import { serialize, TaskStore } from "../../../src/core/tasks/index.js";
import { computeStateBinding } from "../../../src/core/verification/binding.js";
import { VerdictStore } from "../../../src/core/verification/store.js";
import { VERDICT_PROBLEM_CODES } from "../../../src/core/verification/verdict.js";
import { WorkflowStore } from "../../../src/core/workflow/index.js";

let rootPath = "";
let root: RepositoryRoot;
const DATE = "2026-08-31";

beforeAll(async () => {
  rootPath = await mkdtemp(path.join(tmpdir(), "ackit-handoff-"));
  execFileSync("git", ["-C", rootPath, "init", "-q"], { stdio: "ignore" });
  execFileSync("git", ["-C", rootPath, "config", "user.email", "t@example.com"], {
    stdio: "ignore",
  });
  execFileSync("git", ["-C", rootPath, "config", "user.name", "t"], { stdio: "ignore" });
  await writeFile(path.join(rootPath, "README.md"), "# handoff fixture\n", "utf8");
  await writeFile(path.join(rootPath, "src-impl.js"), "export const x = 1;\n", "utf8");
  execFileSync("git", ["-C", rootPath, "add", "."], { stdio: "ignore" });
  execFileSync("git", ["-C", rootPath, "commit", "-q", "-m", "init"], { stdio: "ignore" });
  const resolved = await resolveRepositoryRoot(rootPath);
  if (!resolved.ok) throw new Error(resolved.diagnostic.message);
  root = resolved.root;
});

afterAll(async () => {
  await rm(rootPath, { recursive: true, force: true });
});

async function blockOthers(): Promise<void> {
  const store = new TaskStore(rootPath);
  for (const doc of await store.list(false)) {
    if (doc.meta.status === "active") {
      const abs = path.join(rootPath, "docs", "tasks", "active", path.basename(doc.relativePath));
      const raw = await readFile(abs, "utf8");
      await writeFile(abs, raw.replace(/^status:\s*.*$/m, "status: blocked"), "utf8");
    }
  }
}

interface HandoffFixture {
  taskId: string;
  checkpointId: string;
}

/** Verified standard task with a checkpoint (objective optionally customized). */
async function makeHandoffTask(objective = "run the next step"): Promise<HandoffFixture> {
  await blockOthers();
  const store = new TaskStore(rootPath);
  const created = await store.create("handoff fixture");
  const taskId = created.meta.id;
  const num = taskId.slice("TASK-".length);
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
    "- [x] Handoff thing done.",
    "- [x] Second handoff thing done.",
    "",
    "## Completion notes",
    "",
    "Handoff things implemented; evidence recorded below.",
  ].join("\n");
  const { mkdir } = await import("node:fs/promises");
  await mkdir(path.join(rootPath, "docs", "plans"), { recursive: true });
  await writeFile(path.join(rootPath, "docs", "plans", `handoff-${num}.md`), "# plan\n", "utf8");
  await writeFile(
    docAbs,
    serialize({ ...found.doc.meta, planRef: `docs/plans/handoff-${num}.md` }, body),
    "utf8",
  );
  await store.start(taskId);
  const doc = await store.find(taskId);
  if (doc === null) throw new Error("task missing after authoring");
  const evidenceStore = new EvidenceStore(root);
  const registry = syncRegistry(doc.doc, null, DATE);
  for (const criterion of registry.criteria) {
    criterion.status = "verified";
    criterion.evidence = [{ type: "test", ref: "pnpm vitest run (green)", recordedAt: DATE }];
  }
  await evidenceStore.save(taskId, registry);
  const workflowStore = new WorkflowStore(root);
  await workflowStore.setProfile(taskId, "standard");
  await workflowStore.advanceTo(taskId, "plan");
  await workflowStore.advanceTo(taskId, "tasks");
  await workflowStore.advanceTo(taskId, "implement");
  await workflowStore.advanceTo(taskId, "verify");
  const binding = await computeStateBinding(rootPath, taskId);
  await new VerdictStore(rootPath).register(
    taskId,
    {
      schemaId: "ackit.verdict.v1",
      verdict: "PASS",
      verifier: { agent: "handoff-fixture/1.0", context: "fresh", issuedAt: DATE },
      findings: [],
      checkedCriteria: ["AC-001", "AC-002"],
      summary: "handoff fixture review",
    },
    { evidenceRegistry: registry, binding, reviewedBundleDigest: binding.bundleDigest },
  );
  const checkpoint = await new CheckpointStore(root, rootPath).create(
    taskId,
    (await store.find(taskId))?.doc ?? doc.doc,
    { profile: "standard", stage: "verify" },
    { objective, command: `ackit task complete ${taskId}` },
  );
  return { taskId, checkpointId: checkpoint.id };
}

describe("handoff round-trip (TASK-0082)", () => {
  it("export → parse → validate: fresh with resume equivalence", async () => {
    const { taskId, checkpointId } = await makeHandoffTask();
    const built = await buildHandoff(rootPath, taskId);
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const parsed = parseHandoffFile(built.handoff.json);
    expect(parsed.schemaVersion).toBe(HANDOFF_SCHEMA_ID_V2);
    expect(parsed.task.id).toBe(taskId);
    expect(parsed.checkpoint.id).toBe(checkpointId);
    // Full binding list present.
    expect(parsed.verification.bundleDigest).toMatch(/^[0-9a-f]{64}$/);
    expect(parsed.verification.verdict).toMatchObject({ independent: true, fresh: true });
    expect(parsed.redaction).toMatchObject({
      secrets: "asserted-absent",
      absolutePaths: "scrubbed",
    });
    expect(parsed.instructions.audience).toBe("provider-neutral");
    expect(parsed.instructions.steps.join("\n")).toContain(taskId);
    expect(Array.isArray(parsed.status.next)).toBe(true);
    const validated = await validateHandoff(rootPath, parsed);
    expect(validated.changed).toEqual([]);
    // Resume equivalence: import renders the validated embedded pack.
    expect(validated.resume).toBe(built.handoff.markdown);
    expect(validated.resume).toContain("run the next step");
  });

  it("embedded markdown equals the v1 pack render (reader compatibility)", async () => {
    const { taskId } = await makeHandoffTask();
    const built = await buildHandoff(rootPath, taskId);
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const store = new TaskStore(rootPath);
    const found = await store.find(taskId);
    if (found === null) throw new Error("task missing");
    const checkpoint = await new CheckpointStore(root, rootPath).latest(taskId);
    if (checkpoint === null) throw new Error("checkpoint missing");
    const intents = new IntentStore(rootPath);
    const intent =
      checkpoint.intentRef !== undefined ? await intents.find(checkpoint.intentRef) : null;
    const direct = renderHandoffPack(
      checkpoint,
      {
        id: found.doc.meta.id,
        title: found.doc.meta.title,
        status: found.doc.meta.status,
        body: found.doc.body,
        relativePath: found.doc.relativePath,
      },
      intent !== null
        ? {
            id: intent.doc.meta.id,
            title: intent.doc.meta.title,
            problem: intent.doc.meta.problem,
            desiredOutcome: intent.doc.meta.desiredOutcome,
          }
        : null,
    );
    // No scrub targets in this fixture → byte-identical to v1 output.
    expect(built.handoff.markdown).toBe(direct);
  });

  it("stale handoff refused with the TASK-0079 stable code + changed classes", async () => {
    const { taskId } = await makeHandoffTask();
    const built = await buildHandoff(rootPath, taskId);
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const parsed = parseHandoffFile(built.handoff.json);
    const probe = path.join(rootPath, `src-handoff-stale-${taskId.slice(5)}.js`);
    await writeFile(probe, "export const stale = true;\n", "utf8");
    try {
      await expect(validateHandoff(rootPath, parsed)).rejects.toMatchObject({
        code: VERDICT_PROBLEM_CODES.stateStale,
      });
      try {
        await validateHandoff(rootPath, parsed);
      } catch (error) {
        expect((error as Error).message).toContain("sourceState");
      }
    } finally {
      await rm(probe, { force: true });
    }
    // Fresh export after the dust settles validates again.
    const rebuilt = await buildHandoff(rootPath, taskId);
    expect(rebuilt.ok).toBe(true);
    if (!rebuilt.ok) return;
    const revalidated = await validateHandoff(rootPath, parseHandoffFile(rebuilt.handoff.json));
    expect(revalidated.changed).toEqual([]);
  });

  it("tampered digests fail closed (no trust on read)", async () => {
    const { taskId } = await makeHandoffTask();
    const built = await buildHandoff(rootPath, taskId);
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    // Flipped bundle reference with matching state: corrupt, not stale.
    const tampered = JSON.parse(built.handoff.json) as Record<string, unknown>;
    const verification = tampered["verification"] as Record<string, unknown>;
    verification["bundleDigest"] = "0".repeat(64);
    await expect(
      validateHandoff(rootPath, parseHandoffFile(JSON.stringify(tampered))),
    ).rejects.toMatchObject({ code: HANDOFF_PROBLEM_CODES.invalid });
    // Flipped state component: genuinely stale with the 0079 code.
    const stale = JSON.parse(built.handoff.json) as Record<string, unknown>;
    const staleVerification = stale["verification"] as Record<string, unknown>;
    const components = staleVerification["components"] as Record<string, unknown>;
    components["sourceState"] = "0".repeat(64);
    await expect(
      validateHandoff(rootPath, parseHandoffFile(JSON.stringify(stale))),
    ).rejects.toMatchObject({ code: VERDICT_PROBLEM_CODES.stateStale });
  });

  it("unknown handoff task refused (copied state must match locally)", async () => {
    const { taskId } = await makeHandoffTask();
    const built = await buildHandoff(rootPath, taskId);
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const moved = JSON.parse(built.handoff.json) as Record<string, unknown>;
    (moved["task"] as Record<string, unknown>)["id"] = "TASK-9999";
    await expect(
      validateHandoff(rootPath, parseHandoffFile(JSON.stringify(moved))),
    ).rejects.toMatchObject({
      code: HANDOFF_PROBLEM_CODES.taskUnknown,
    });
  });

  it("v1 markdown is identified and refused with a migration code; garbage is invalid", async () => {
    const { taskId } = await makeHandoffTask();
    const built = await buildHandoff(rootPath, taskId);
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(() => parseHandoffFile(built.handoff.markdown)).toThrowError(
      expect.objectContaining({ code: HANDOFF_PROBLEM_CODES.v1Unbound } as unknown as Error),
    );
    try {
      parseHandoffFile(built.handoff.markdown);
    } catch (error) {
      expect(error).toBeInstanceOf(HandoffError);
      expect((error as HandoffError).message).toContain("--format json");
    }
    expect(() => parseHandoffFile("this is not json")).toThrowError(
      expect.objectContaining({ code: HANDOFF_PROBLEM_CODES.invalid } as unknown as Error),
    );
    expect(() => parseHandoffFile(JSON.stringify({ schemaVersion: "nope" }))).toThrowError(
      expect.objectContaining({ code: HANDOFF_PROBLEM_CODES.invalid } as unknown as Error),
    );
  });

  it("determinism: same state exports byte-identical handoffs", async () => {
    const { taskId } = await makeHandoffTask();
    const first = await buildHandoff(rootPath, taskId);
    const second = await buildHandoff(rootPath, taskId);
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(second.handoff.json).toBe(first.handoff.json);
    expect(second.handoff.markdown).toBe(first.handoff.markdown);
  });

  it("redaction: absolute paths scrubbed with a manifest count; secrets fail closed", async () => {
    const { taskId } = await makeHandoffTask("review the build at /home/operator/work/ackit");
    const built = await buildHandoff(rootPath, taskId);
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const parsed = parseHandoffFile(built.handoff.json);
    expect(parsed.redaction.scrubbedCount).toBeGreaterThan(0);
    expect(built.handoff.json).not.toContain("/home/operator/work/ackit");
    expect(built.handoff.markdown).not.toContain("/home/operator/work/ackit");
    expect(built.handoff.markdown).toContain("<local-path>");
    // Synthetic secret-shaped content fails closed (fail, never leak).
    const evil = await makeHandoffTask();
    const store = new TaskStore(rootPath);
    const doc = await store.find(evil.taskId);
    if (doc === null) throw new Error("task missing");
    const docAbs = path.join(
      rootPath,
      "docs",
      "tasks",
      "active",
      path.basename(doc.doc.relativePath),
    );
    const raw = await readFile(docAbs, "utf8");
    await writeFile(docAbs, `${raw}\nKey: AKIAIOSFODNN7EXAMPLE\n`, "utf8");
    const refused = await buildHandoff(rootPath, evil.taskId);
    expect(refused.ok).toBe(false);
    if (!refused.ok) expect(refused.diagnostic.code).toBe(HANDOFF_PROBLEM_CODES.invalid);
  });

  it("handoff without a verdict still binds state (pre-verification resume)", async () => {
    await blockOthers();
    const store = new TaskStore(rootPath);
    const created = await store.create("unverified handoff fixture");
    const taskId = created.meta.id;
    const found = await store.find(taskId);
    if (found === null) throw new Error("task missing");
    await store.start(taskId);
    const live = await store.find(taskId);
    if (live === null) throw new Error("task missing after start");
    await new CheckpointStore(root, rootPath).create(
      taskId,
      live.doc,
      { profile: "quick" },
      { objective: "first implementation pass" },
    );
    const built = await buildHandoff(rootPath, taskId);
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const parsed = parseHandoffFile(built.handoff.json);
    expect(parsed.verification.verdict).toBeNull();
    expect(parsed.verification.bundleDigest).toMatch(/^[0-9a-f]{64}$/);
    const validated = await validateHandoff(rootPath, parsed);
    expect(validated.changed).toEqual([]);
  });

  it("unknown export tasks fail closed without emitting", async () => {
    const missing = await buildHandoff(rootPath, "TASK-9999");
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.diagnostic.code).toBe(HANDOFF_PROBLEM_CODES.taskUnknown);
  });
});
