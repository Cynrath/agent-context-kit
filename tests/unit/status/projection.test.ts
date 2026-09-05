/**
 * Canonical status projection tests (TASK-0081, ADR-0032).
 *
 * Fixture states → exact rendered output / JSON structure; read-only proof
 * (recursive content snapshot + git porcelain before/after); staleness
 * display wired to the TASK-0079/0080 stable codes (surfaced, never
 * redefined); no second engine (blockers are byte-compared against the
 * completion gate's own preview).
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runCli } from "../../../src/cli/index.js";
import { CheckpointStore } from "../../../src/core/checkpoint/index.js";
import { EvidenceStore } from "../../../src/core/evidence/index.js";
import { syncRegistry } from "../../../src/core/evidence/sync.js";
import type { RepositoryRoot } from "../../../src/core/filesystem/root.js";
import { resolveRepositoryRoot } from "../../../src/core/filesystem/root.js";
import {
  buildStatusReport,
  renderStatusReport,
  STATUS_SCHEMA_ID,
} from "../../../src/core/status/projection.js";
import { serialize, TaskStore } from "../../../src/core/tasks/index.js";
import { computeStateBinding } from "../../../src/core/verification/binding.js";
import { VerdictStore } from "../../../src/core/verification/store.js";
import { VERDICT_PROBLEM_CODES } from "../../../src/core/verification/verdict.js";
import { WorkflowStore } from "../../../src/core/workflow/index.js";

let rootPath = "";
let root: RepositoryRoot;
const DATE = "2026-08-31";

beforeAll(async () => {
  rootPath = await mkdtemp(path.join(tmpdir(), "ackit-status-"));
  execFileSync("git", ["-C", rootPath, "init", "-q"], { stdio: "ignore" });
  execFileSync("git", ["-C", rootPath, "config", "user.email", "t@example.com"], {
    stdio: "ignore",
  });
  execFileSync("git", ["-C", rootPath, "config", "user.name", "t"], { stdio: "ignore" });
  await writeFile(path.join(rootPath, "README.md"), "# status fixture\n", "utf8");
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

/** Legacy task (no workflow state) with unchecked criteria + placeholder notes. */
async function makeLegacyTask(): Promise<string> {
  await blockOthers();
  const store = new TaskStore(rootPath);
  const created = await store.create("legacy status fixture");
  const found = await store.find(created.meta.id);
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
    "- [ ] First thing.",
    "- [ ] Second thing.",
    "",
    "## Completion notes",
    "",
    "(placeholder)",
  ].join("\n");
  await writeFile(docAbs, serialize(found.doc.meta, body), "utf8");
  await store.start(created.meta.id);
  return created.meta.id;
}

/** Standard-profile task at a chosen stage, with verified evidence. */
async function makeWorkflowTask(stage: "implement" | "verify" = "verify"): Promise<string> {
  await blockOthers();
  const store = new TaskStore(rootPath);
  const created = await store.create("workflow status fixture");
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
    "- [x] First thing done.",
    "- [x] Second thing done.",
    "",
    "## Completion notes",
    "",
    "Both criteria implemented; evidence recorded below.",
  ].join("\n");
  const { mkdir } = await import("node:fs/promises");
  await mkdir(path.join(rootPath, "docs", "plans"), { recursive: true });
  await writeFile(path.join(rootPath, "docs", "plans", `status-${num}.md`), "# plan\n", "utf8");
  await writeFile(
    docAbs,
    serialize({ ...found.doc.meta, planRef: `docs/plans/status-${num}.md` }, body),
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
  if (stage === "verify") await workflowStore.advanceTo(taskId, "verify");
  return taskId;
}

async function registerVerdict(
  taskId: string,
  options: { context: "fresh" | "same"; proof: boolean; summary?: string },
): Promise<void> {
  const verdicts = new VerdictStore(rootPath);
  const registry = await new EvidenceStore(root).load(taskId);
  const binding = await computeStateBinding(rootPath, taskId);
  await verdicts.register(
    taskId,
    {
      schemaId: "ackit.verdict.v1",
      verdict: "PASS",
      verifier: {
        agent: "status-fixture/1.0",
        context: options.context,
        issuedAt: DATE,
      },
      findings: [],
      checkedCriteria: ["AC-001", "AC-002"],
      summary: options.summary ?? "status fixture review",
    },
    {
      evidenceRegistry: registry,
      binding,
      ...(options.proof ? { reviewedBundleDigest: binding.bundleDigest } : {}),
    },
  );
}

/** Recursive content snapshot of the fixture repo (excluding .git internals). */
async function snapshotTree(): Promise<{ hashes: Map<string, string>; porcelain: string }> {
  const hashes = new Map<string, string>();
  async function walk(dir: string): Promise<void> {
    const { readdir, stat } = await import("node:fs/promises");
    const entries = (await readdir(dir)).sort();
    for (const entry of entries) {
      if (dir === rootPath && entry === ".git") continue;
      const abs = path.join(dir, entry);
      const st = await stat(abs);
      if (st.isDirectory()) {
        await walk(abs);
      } else if (st.isFile()) {
        const bytes = await readFile(abs);
        hashes.set(
          path.relative(rootPath, abs).split(path.sep).join("/"),
          createHash("sha256").update(bytes).digest("hex"),
        );
      }
    }
  }
  await walk(rootPath);
  const porcelain = execFileSync("git", ["-C", rootPath, "status", "--porcelain"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return { hashes, porcelain };
}

describe("status projection fixtures (ADR-0032)", () => {
  it("legacy active task: answers the four questions in human + JSON", async () => {
    const taskId = await makeLegacyTask();
    const report = await buildStatusReport(rootPath, taskId);
    expect(report.schemaVersion).toBe(STATUS_SCHEMA_ID);
    expect(report.resolution).toEqual({ mode: "explicit", taskId });
    expect(report.task).toMatchObject({ id: taskId, status: "active", profile: null });
    // Blockers are the completion gate's own strings.
    expect(report.blockers).toContain("2 unchecked acceptance criteria item(s)");
    expect(report.blockers).toContain("completion notes missing/placeholder");
    const gatePreview = await new TaskStore(rootPath).completionBlockers(taskId);
    expect(report.blockers).toEqual(gatePreview);
    // Staleness section answers "what is stale".
    expect(report.verdict).toBeNull();
    expect(report.checkpoint).toBeNull();
    // Next answers "what next" with runnable commands.
    expect(report.next.map((n) => n.command)).toContain(`ackit evidence sync ${taskId}`);
    // Exact human rendering (no digests involved for legacy tasks — pinned).
    const human = renderStatusReport(report);
    expect(human).toBe(
      [
        `task: ${taskId} — legacy status fixture (explicit)`,
        "status: active",
        "workflow: (no workflow state — legacy task)",
        "dependencies: (none)",
        "",
        "blockers:",
        "- 2 unchecked acceptance criteria item(s)",
        "- completion notes missing/placeholder",
        "",
        "stale:",
        "- verdict: (none registered)",
        "- checkpoint: (none)",
        "",
        "next:",
        `- document acceptance and sync evidence \`ackit evidence sync ${taskId}\` — 2 unchecked acceptance criteria item(s)`,
        "- write real completion notes in the task document — completion notes missing/placeholder",
        "",
      ].join("\n"),
    );
    // JSON contract: stable keys, byte-deterministic across builds.
    const first = JSON.stringify(report);
    const second = JSON.stringify(await buildStatusReport(rootPath, taskId));
    expect(second).toBe(first);
    expect(report.next.length).toBeGreaterThan(0);
  });

  it("workflow task at implement without verdict: stage + missing-verdict surface with stable codes", async () => {
    const taskId = await makeWorkflowTask("implement");
    const report = await buildStatusReport(rootPath, taskId);
    expect(report.task).toMatchObject({ profile: "standard", stage: "implement" });
    expect(report.blockers.some((b) => b.startsWith("MISSING_VERIFIER_VERDICT"))).toBe(true);
    expect(report.blockers.some((b) => b.startsWith("WORKFLOW_STAGE_INVALID"))).toBe(true);
    expect(report.next.map((n) => n.command)).toContain(
      `ackit verification bundle ${taskId} --format json --out .ackit/reviews/bundle.json`,
    );
    expect(report.next.map((n) => n.command)).toContain(
      `ackit workflow advance ${taskId} --to verify`,
    );
    const human = renderStatusReport(report);
    expect(human).toContain("workflow: profile 'standard', stage 'implement'");
    expect(human).toContain("- verdict: (none registered)");
  });

  it("same-context verdict: independence blocker surfaced with the TASK-0080 code, never redefined", async () => {
    const taskId = await makeWorkflowTask("verify");
    await registerVerdict(taskId, { context: "same", proof: false });
    const report = await buildStatusReport(rootPath, taskId);
    expect(report.verdict).toMatchObject({ independent: false });
    expect(report.verdict?.independenceCode).toBe(VERDICT_PROBLEM_CODES.independenceUnproven);
    expect(report.blockers).toContainEqual(
      expect.stringContaining(VERDICT_PROBLEM_CODES.independenceUnproven),
    );
    expect(renderStatusReport(report)).toContain(
      `NOT independent (${VERDICT_PROBLEM_CODES.independenceUnproven})`,
    );
    expect(
      report.next.some((n) => n.reason.includes(VERDICT_PROBLEM_CODES.independenceUnproven)),
    ).toBe(true);
  });

  it("stale independent verdict: TASK-0079 code + changed classes surface", async () => {
    const taskId = await makeWorkflowTask("verify");
    await registerVerdict(taskId, { context: "fresh", proof: true });
    await writeFile(
      path.join(rootPath, `src-status-stale-${taskId.slice(5)}.js`),
      "export const s = 1;\n",
      "utf8",
    );
    try {
      const report = await buildStatusReport(rootPath, taskId);
      expect(report.verdict).toMatchObject({ fresh: false, independent: true });
      expect(report.verdict?.problemCode).toBe(VERDICT_PROBLEM_CODES.stateStale);
      expect(report.verdict?.changed).toContain("sourceState");
      expect(report.blockers).toContainEqual(
        expect.stringContaining(VERDICT_PROBLEM_CODES.stateStale),
      );
      expect(renderStatusReport(report)).toContain("STALE (VERDICT-STATE-STALE: sourceState");
    } finally {
      await rm(path.join(rootPath, `src-status-stale-${taskId.slice(5)}.js`), { force: true });
    }
  });

  it("fully green task: no blockers, next is the complete command", async () => {
    const taskId = await makeWorkflowTask("verify");
    await registerVerdict(taskId, { context: "fresh", proof: true });
    const report = await buildStatusReport(rootPath, taskId);
    expect(report.blockers).toEqual([]);
    expect(report.verdict).toMatchObject({ fresh: true, independent: true });
    expect(report.next).toEqual([
      {
        action: `complete task ${taskId}`,
        command: `ackit task complete ${taskId}`,
        reason: "all completion gates pass",
      },
    ]);
    expect(renderStatusReport(report)).toContain("blockers: (none — completion eligible)");
  });

  it("checkpoint next action is surfaced with its staleness state", async () => {
    const taskId = await makeWorkflowTask("verify");
    const store = new TaskStore(rootPath);
    const found = await store.find(taskId);
    if (found === null) throw new Error("task missing");
    await new CheckpointStore(root, rootPath).create(
      taskId,
      found.doc,
      { profile: "standard" },
      { objective: "run the migration script", command: `ackit task complete ${taskId}` },
    );
    const report = await buildStatusReport(rootPath, taskId);
    expect(report.checkpoint).toMatchObject({
      nextAction: { objective: "run the migration script" },
    });
    expect(report.checkpoint?.stale).toEqual([]);
    expect(report.next.some((n) => n.action.startsWith("recorded next action:"))).toBe(true);
    expect(renderStatusReport(report)).toContain("next action: run the migration script");
  });

  it("resolution: unknown/bad ids throw stable codes; empty/ambiguous resolve explicitly", async () => {
    await expect(buildStatusReport(rootPath, "TASK-9999")).rejects.toMatchObject({
      code: "STATUS-TASK-UNKNOWN",
    });
    await expect(buildStatusReport(rootPath, "../escape")).rejects.toMatchObject({
      code: "STATUS-TASK-ID-INVALID",
    });
    // No active task → explicit none-resolution with a create action.
    await blockOthers();
    const none = await buildStatusReport(rootPath);
    expect(none.resolution).toEqual({ mode: "none" });
    expect(none.task).toBeNull();
    expect(none.next).toEqual([
      {
        action: "create a task",
        command: `ackit task create "<title>"`,
        reason: "no active task to report on",
      },
    ]);
    expect(renderStatusReport(none)).toContain("status: no task to report on");
    // Two active tasks → explicit ambiguity (never a silent pick). The
    // single-active rule forbids start() here, so the second active state
    // is written directly (a state the projection must handle, not create).
    const first = await makeLegacyTask();
    const secondStore = new TaskStore(rootPath);
    const second = await secondStore.create("second active");
    const secondAbs = path.join(
      rootPath,
      "docs",
      "tasks",
      "active",
      path.basename(second.relativePath),
    );
    const secondRaw = await readFile(secondAbs, "utf8");
    await writeFile(secondAbs, secondRaw.replace(/^status:\s*.*$/m, "status: active"), "utf8");
    const ambiguous = await buildStatusReport(rootPath);
    expect(ambiguous.resolution).toEqual({
      mode: "ambiguous",
      candidates: [first, second.meta.id].sort(),
    });
    expect(ambiguous.next[0]?.command).toBe("ackit status <TASK-ID>");
    await blockOthers();
  });
});

describe("status read-only proof (ADR-0032)", () => {
  it("projection + rendering + CLI leave zero filesystem/git trace", async () => {
    const taskId = await makeWorkflowTask("verify");
    await registerVerdict(taskId, { context: "fresh", proof: true });
    const before = await snapshotTree();
    const first = await buildStatusReport(rootPath, taskId);
    const second = await buildStatusReport(rootPath, taskId);
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
    expect(renderStatusReport(second)).toBe(renderStatusReport(first));
    // The CLI surface itself (human + JSON) is read-only too.
    const chunks: string[] = [];
    const originalWrite = process.stdout.write;
    process.stdout.write = ((chunk: string) => {
      chunks.push(String(chunk));
      return true;
    }) as typeof process.stdout.write;
    try {
      const { EXIT_CODES } = await import("../../../src/shared/exit-codes.js");
      expect(await runCli(["node", "ackit", "--root", rootPath, "status", taskId])).toBe(
        EXIT_CODES.ok,
      );
      expect(await runCli(["node", "ackit", "--root", rootPath, "--json", "status", taskId])).toBe(
        EXIT_CODES.ok,
      );
    } finally {
      process.stdout.write = originalWrite;
    }
    const after = await snapshotTree();
    expect(after.porcelain).toBe(before.porcelain);
    expect([...after.hashes.entries()]).toEqual([...before.hashes.entries()]);
    await blockOthers();
  });
});
