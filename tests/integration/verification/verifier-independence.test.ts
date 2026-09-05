/**
 * Cross-process verifier-independence fixture (TASK-0080, ADR-0031).
 *
 * The verifier role is executed in SEPARATE OS processes (real `node
 * dist/cli/index.js` spawns — no shared memory, no imported stores): one
 * process builds the bundle, another registers the verdict. Digest equality
 * across processes is the trust anchor; the store/CLI recompute everything
 * from disk on every invocation.
 *
 * Requires `dist/` built (`pnpm build` before `pnpm test`, per repo gates).
 */
import { execFile as execFileCallback, execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { EvidenceStore } from "../../../src/core/evidence/index.js";
import { syncRegistry } from "../../../src/core/evidence/sync.js";
import type { RepositoryRoot } from "../../../src/core/filesystem/root.js";
import { resolveRepositoryRoot } from "../../../src/core/filesystem/root.js";
import { IntentStore } from "../../../src/core/intent/index.js";
import { serialize, TaskStore } from "../../../src/core/tasks/index.js";
import { WorkflowStore } from "../../../src/core/workflow/index.js";

const execFile = promisify(execFileCallback);
const FIXED_DATE = "2026-08-31";
const FIXED_GIT_DATE = "2026-08-31T00:00:00+00:00";

let rootPath = "";
let root: RepositoryRoot;
let cliEntry = "";

beforeAll(async () => {
  rootPath = await mkdtemp(path.join(tmpdir(), "ackit-verifier-indep-"));
  execFileSync("git", ["-C", rootPath, "init", "-q"], { stdio: "ignore" });
  execFileSync("git", ["-C", rootPath, "config", "user.email", "t@example.com"], {
    stdio: "ignore",
  });
  execFileSync("git", ["-C", rootPath, "config", "user.name", "t"], { stdio: "ignore" });
  await writeFile(path.join(rootPath, "README.md"), "# verifier independence fixture\n", "utf8");
  await writeFile(path.join(rootPath, "src-impl.js"), "export const x = 1;\n", "utf8");
  execFileSync("git", ["-C", rootPath, "add", "."], { stdio: "ignore" });
  execFileSync("git", ["-C", rootPath, "commit", "-q", "-m", "init"], {
    stdio: "ignore",
    env: { ...process.env, GIT_AUTHOR_DATE: FIXED_GIT_DATE, GIT_COMMITTER_DATE: FIXED_GIT_DATE },
  });
  const resolved = await resolveRepositoryRoot(rootPath);
  if (!resolved.ok) throw new Error(resolved.diagnostic.message);
  root = resolved.root;
  cliEntry = path.resolve(import.meta.dirname, "..", "..", "..", "dist", "cli", "index.js");
});

afterAll(async () => {
  await rm(rootPath, { recursive: true, force: true });
});

interface SpawnResult {
  code: number;
  stdout: string;
  stderr: string;
}

/** Run the built CLI in a FRESH process (never an in-process import). */
async function spawnCli(args: string[]): Promise<SpawnResult> {
  try {
    const { stdout, stderr } = await execFile(
      process.execPath,
      [cliEntry, "--root", rootPath, ...args],
      {
        timeout: 60_000,
        maxBuffer: 8 * 1024 * 1024,
      },
    );
    return { code: 0, stdout, stderr };
  } catch (error) {
    const failure = error as { code?: number; stdout?: string; stderr?: string };
    return {
      code: typeof failure.code === "number" ? failure.code : 1,
      stdout: failure.stdout ?? "",
      stderr: failure.stderr ?? "",
    };
  }
}

/**
 * Standard-profile task with verified evidence at the verify stage.
 * Setup runs in-process (the IMPLEMENTER side); every verifier-side action
 * in these tests runs in a separate process via spawnCli.
 */
async function makeVerifiableTask(
  criteria: [string, string] = ["Criterion one.", "Criterion two."],
): Promise<string> {
  const store = new TaskStore(rootPath);
  for (const doc of await store.list(false)) {
    if (doc.meta.status === "active") {
      const abs = path.join(rootPath, "docs", "tasks", "active", path.basename(doc.relativePath));
      const raw = await readFile(abs, "utf8");
      await writeFile(abs, raw.replace(/^status:\s*.*$/m, "status: blocked"), "utf8");
    }
  }
  const created = await store.create("verifier independence fixture");
  const taskId = created.meta.id;
  const num = taskId.slice("TASK-".length);
  const intentId = await new IntentStore(rootPath).nextId();
  await mkdir(path.join(rootPath, "docs", "intent"), { recursive: true });
  await writeFile(
    path.join(rootPath, "docs", "intent", `${intentId}-indep-${num}.md`),
    [
      "---",
      'schemaId: "ackit.intent.v1"',
      `id: "${intentId}"`,
      `title: "independence intent ${num}"`,
      "status: accepted",
      `createdAt: "${FIXED_DATE}"`,
      `problem: "independence problem ${num}"`,
      `desiredOutcome: "independence outcome ${num}"`,
      "constraints: []",
      "nonGoals: []",
      "affectedSystems: []",
      "acceptanceCriteria: []",
      "openQuestions: []",
      "risks: []",
      "---",
      "",
      "Body.",
      "",
    ].join("\n"),
    "utf8",
  );
  const planRef = `docs/plans/indep-${num}.md`;
  await mkdir(path.join(rootPath, "docs", "plans"), { recursive: true });
  await writeFile(path.join(rootPath, "docs", "plans", `indep-${num}.md`), "# plan\n", "utf8");
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
    `- [x] ${criteria[0]}`,
    `- [x] ${criteria[1]}`,
    "",
    "## Completion notes",
    "",
    "Implemented; evidence recorded below.",
  ].join("\n");
  await writeFile(
    docAbs,
    serialize({ ...found.doc.meta, intentRef: intentId, planRef }, body),
    "utf8",
  );
  await store.start(taskId);
  const doc = await store.find(taskId);
  if (doc === null) throw new Error("task missing after authoring");
  const evidenceStore = new EvidenceStore(root);
  const registry = syncRegistry(doc.doc, null, FIXED_DATE);
  for (const criterion of registry.criteria) {
    criterion.status = "verified";
    criterion.evidence = [{ type: "test", ref: "pnpm vitest run (green)", recordedAt: FIXED_DATE }];
  }
  await evidenceStore.save(taskId, registry);
  const workflowStore = new WorkflowStore(root);
  await workflowStore.setProfile(taskId, "standard");
  await workflowStore.advanceTo(taskId, "plan");
  await workflowStore.advanceTo(taskId, "tasks");
  await workflowStore.advanceTo(taskId, "implement");
  await workflowStore.advanceTo(taskId, "verify");
  return taskId;
}

function verdictYaml(
  taskId: string,
  overrides: { context?: string; summary?: string } = {},
): string {
  return [
    'schemaId: "ackit.verdict.v1"',
    `taskId: "${taskId}"`,
    'verdict: "PASS"',
    "verifier:",
    '  agent: "cross-process-verifier/1.0"',
    `  context: "${overrides.context ?? "fresh"}"`,
    `  issuedAt: "${FIXED_DATE}"`,
    "findings: []",
    "checkedCriteria:",
    '  - "AC-001"',
    '  - "AC-002"',
    `summary: "${overrides.summary ?? "reviewed the bundle in a separate process"}"`,
  ].join("\n");
}

describe("cross-process verifier independence (TASK-0080)", () => {
  it("bundle (proc A) → record (proc B) → show → complete, all in separate processes", async () => {
    const taskId = await makeVerifiableTask();
    const num = taskId.slice("TASK-".length);
    const reviews = path.join(rootPath, ".ackit", "reviews");
    await mkdir(reviews, { recursive: true });

    // Process A: the implementer side exports the review bundle (review
    // artifacts live under .ackit/, excluded from state binding —
    // ADR-0031 §5 — so exporting/authoring them never stales the proof).
    const bundled = await spawnCli([
      "verification",
      "bundle",
      taskId,
      "--format",
      "json",
      "--out",
      `.ackit/reviews/indep-bundle-${num}.json`,
    ]);
    expect(bundled.code).toBe(0);
    const bundleRaw = await readFile(path.join(reviews, `indep-bundle-${num}.json`), "utf8");
    const bundleDigest = (JSON.parse(bundleRaw) as { binding: { bundleDigest: string } }).binding
      .bundleDigest;
    expect(bundleDigest).toMatch(/^[0-9a-f]{64}$/);

    // Process B: the fresh verifier (a different process that never saw
    // the implementer's memory) registers its verdict against the bundle.
    await writeFile(path.join(reviews, `indep-verdict-${num}.yaml`), verdictYaml(taskId), "utf8");
    const recorded = await spawnCli([
      "verification",
      "record",
      taskId,
      "--verdict",
      `.ackit/reviews/indep-verdict-${num}.yaml`,
      "--bundle",
      `.ackit/reviews/indep-bundle-${num}.json`,
    ]);
    expect(recorded.code).toBe(0);
    expect(recorded.stdout).toContain("VR-0001 registered (PASS)");

    // Process C: an auditor reads the trust state — independent, exact digest.
    const shown = await spawnCli(["--json", "verification", "show", taskId]);
    expect(shown.code).toBe(0);
    const report = JSON.parse(shown.stdout) as {
      independent: boolean;
      reviewedBundleDigest: string;
      verdict: { binding: { bundleDigest: string } };
    };
    expect(report.independent).toBe(true);
    expect(report.reviewedBundleDigest).toBe(bundleDigest);
    expect(report.verdict.binding.bundleDigest).toBe(bundleDigest);

    // Process D: completion accepts the independently verified task.
    const completed = await spawnCli(["task", "complete", taskId]);
    expect(completed.code).toBe(0);
    expect(completed.stdout).toContain("completed");
  }, 120_000);

  it("stale bundle replayed from another process is refused (VERDICT-BUNDLE-MISMATCH)", async () => {
    const taskId = await makeVerifiableTask();
    const num = taskId.slice("TASK-".length);
    const reviews = path.join(rootPath, ".ackit", "reviews");
    await mkdir(reviews, { recursive: true });
    const bundled = await spawnCli([
      "verification",
      "bundle",
      taskId,
      "--format",
      "json",
      "--out",
      `.ackit/reviews/stale-bundle-${num}.json`,
    ]);
    expect(bundled.code).toBe(0);
    // State moves on after the bundle left the building.
    const probe = path.join(rootPath, `src-stale-${num}.js`);
    await writeFile(probe, "export const stale = true;\n", "utf8");
    try {
      await writeFile(
        path.join(reviews, `stale-verdict-${num}.yaml`),
        verdictYaml(taskId, { summary: "review of an outdated bundle" }),
        "utf8",
      );
      const recorded = await spawnCli([
        "verification",
        "record",
        taskId,
        "--verdict",
        `.ackit/reviews/stale-verdict-${num}.yaml`,
        "--bundle",
        `.ackit/reviews/stale-bundle-${num}.json`,
      ]);
      expect(recorded.code).not.toBe(0);
      expect(recorded.stderr).toContain("verdict-bundle-mismatch");
    } finally {
      await rm(probe, { force: true });
    }
  }, 120_000);

  it("self-issued fresh claim without bundle proof is refused (VERDICT-INDEPENDENCE-UNPROVEN)", async () => {
    const taskId = await makeVerifiableTask();
    const num = taskId.slice("TASK-".length);
    const reviews = path.join(rootPath, ".ackit", "reviews");
    await mkdir(reviews, { recursive: true });
    await writeFile(
      path.join(reviews, `selfissued-${num}.yaml`),
      verdictYaml(taskId, { summary: "trust me, I am fresh" }),
      "utf8",
    );
    const recorded = await spawnCli([
      "verification",
      "record",
      taskId,
      "--verdict",
      `.ackit/reviews/selfissued-${num}.yaml`,
    ]);
    expect(recorded.code).not.toBe(0);
    expect(recorded.stderr).toContain("verdict-independence-unproven");
  }, 120_000);

  it("identical verdict content re-presented is refused as replay (VERDICT-REPLAY-REJECTED)", async () => {
    const taskId = await makeVerifiableTask();
    const num = taskId.slice("TASK-".length);
    const reviews = path.join(rootPath, ".ackit", "reviews");
    await mkdir(reviews, { recursive: true });
    const bundled = await spawnCli([
      "verification",
      "bundle",
      taskId,
      "--format",
      "json",
      "--out",
      `.ackit/reviews/replay-bundle-${num}.json`,
    ]);
    expect(bundled.code).toBe(0);
    await writeFile(
      path.join(reviews, `replay-verdict-${num}.yaml`),
      verdictYaml(taskId, { summary: "first and only review" }),
      "utf8",
    );
    const first = await spawnCli([
      "verification",
      "record",
      taskId,
      "--verdict",
      `.ackit/reviews/replay-verdict-${num}.yaml`,
      "--bundle",
      `.ackit/reviews/replay-bundle-${num}.json`,
    ]);
    expect(first.code).toBe(0);
    // Same files, fresh process, unchanged state — still replay.
    const second = await spawnCli([
      "verification",
      "record",
      taskId,
      "--verdict",
      `.ackit/reviews/replay-verdict-${num}.yaml`,
      "--bundle",
      `.ackit/reviews/replay-bundle-${num}.json`,
    ]);
    expect(second.code).not.toBe(0);
    expect(second.stderr).toContain("verdict-replay-rejected");
  }, 120_000);

  it("same-context verdict registers but cannot satisfy completion (VERDICT-INDEPENDENCE-UNPROVEN)", async () => {
    const taskId = await makeVerifiableTask();
    const num = taskId.slice("TASK-".length);
    const reviews = path.join(rootPath, ".ackit", "reviews");
    await mkdir(reviews, { recursive: true });
    await writeFile(
      path.join(reviews, `samectx-${num}.yaml`),
      verdictYaml(taskId, { context: "same", summary: "implementer self-review" }),
      "utf8",
    );
    const recorded = await spawnCli([
      "verification",
      "record",
      taskId,
      "--verdict",
      `.ackit/reviews/samectx-${num}.yaml`,
    ]);
    expect(recorded.code).toBe(0);
    const shown = await spawnCli(["--json", "verification", "show", taskId]);
    expect(shown.code).toBe(0);
    const report = JSON.parse(shown.stdout) as {
      independent: boolean;
      independenceCode: string;
    };
    expect(report.independent).toBe(false);
    expect(report.independenceCode).toBe("VERDICT-INDEPENDENCE-UNPROVEN");
    // The gate refuses explicitly — never silently satisfied.
    const completed = await spawnCli(["task", "complete", taskId]);
    expect(completed.code).not.toBe(0);
    expect(completed.stderr).toContain("VERDICT-INDEPENDENCE-UNPROVEN");
  }, 120_000);
});
