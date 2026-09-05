/**
 * Cross-process handoff resume proof (TASK-0082, test step 4).
 *
 * Export in one OS process, import + resume in another (real `node
 * dist/cli/index.js` spawns, zero shared memory): acceptance travels on
 * digests recomputed from disk, and post-export state movement refuses
 * with the TASK-0079 stable code in the fresh process.
 */
import { execFile as execFileCallback, execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CheckpointStore } from "../../../src/core/checkpoint/index.js";
import { EvidenceStore } from "../../../src/core/evidence/index.js";
import { syncRegistry } from "../../../src/core/evidence/sync.js";
import type { RepositoryRoot } from "../../../src/core/filesystem/root.js";
import { resolveRepositoryRoot } from "../../../src/core/filesystem/root.js";
import { serialize, TaskStore } from "../../../src/core/tasks/index.js";

const execFile = promisify(execFileCallback);
const DATE = "2026-08-31";

let rootPath = "";
let root: RepositoryRoot;
let cliEntry = "";

beforeAll(async () => {
  rootPath = await mkdtemp(path.join(tmpdir(), "ackit-handoff-xproc-"));
  execFileSync("git", ["-C", rootPath, "init", "-q"], { stdio: "ignore" });
  execFileSync("git", ["-C", rootPath, "config", "user.email", "t@example.com"], {
    stdio: "ignore",
  });
  execFileSync("git", ["-C", rootPath, "config", "user.name", "t"], { stdio: "ignore" });
  await writeFile(path.join(rootPath, "README.md"), "# handoff cross-process fixture\n", "utf8");
  await writeFile(path.join(rootPath, "src-impl.js"), "export const x = 1;\n", "utf8");
  execFileSync("git", ["-C", rootPath, "add", "."], { stdio: "ignore" });
  execFileSync("git", ["-C", rootPath, "commit", "-q", "-m", "init"], { stdio: "ignore" });
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
      { timeout: 60_000, maxBuffer: 8 * 1024 * 1024 },
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

/** Implementer-side setup (in-process); every handoff step uses subprocesses. */
async function makeCheckpointedTask(objective: string): Promise<string> {
  const store = new TaskStore(rootPath);
  for (const doc of await store.list(false)) {
    if (doc.meta.status === "active") {
      const abs = path.join(rootPath, "docs", "tasks", "active", path.basename(doc.relativePath));
      const raw = await readFile(abs, "utf8");
      await writeFile(abs, raw.replace(/^status:\s*.*$/m, "status: blocked"), "utf8");
    }
  }
  const created = await store.create("handoff cross-process fixture");
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
  await writeFile(
    docAbs,
    serialize(
      found.doc.meta,
      [
        "## Acceptance criteria",
        "",
        "- [x] Xproc handoff done.",
        "",
        "## Completion notes",
        "",
        "Done.",
      ].join("\n"),
    ),
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
  const live = await store.find(taskId);
  if (live === null) throw new Error("task missing before checkpoint");
  await new CheckpointStore(root, rootPath).create(
    taskId,
    live.doc,
    { profile: "quick" },
    { objective },
  );
  await mkdir(path.join(rootPath, ".ackit", "reviews"), { recursive: true });
  return taskId;
}

describe("cross-process handoff resume (TASK-0082)", () => {
  it("export (proc A) → import (proc B) resumes; moved state refuses in proc C", async () => {
    const taskId = await makeCheckpointedTask("continue across processes");
    const num = taskId.slice("TASK-".length);

    // Process A: export the bound handoff.
    const exported = await spawnCli([
      "checkpoint",
      "export",
      taskId,
      "--format",
      "json",
      "--out",
      `.ackit/reviews/xproc-${num}.json`,
    ]);
    expect(exported.code).toBe(0);
    const fileRaw = await readFile(
      path.join(rootPath, ".ackit", "reviews", `xproc-${num}.json`),
      "utf8",
    );
    expect(fileRaw).toContain('"ackit.handoff.v2"');

    // Process B: a fresh process validates + resumes from disk state.
    const imported = await spawnCli(["checkpoint", "import", `.ackit/reviews/xproc-${num}.json`]);
    expect(imported.code).toBe(0);
    expect(imported.stdout).toContain(`${taskId}: handoff CP-0001 fresh`);
    expect(imported.stdout).toContain("continue across processes");

    // Resume equivalence across the process boundary: the receiving
    // process renders the same resume the exporter embedded.
    const resumed = await spawnCli(["task", "resume", taskId]);
    expect(resumed.code).toBe(0);
    for (const line of ["continue across processes", taskId]) {
      expect(imported.stdout).toContain(line);
      expect(resumed.stdout).toContain(line);
    }

    // State moves on; process C refuses the stale handoff explicitly.
    const probe = path.join(rootPath, `src-xproc-${num}.js`);
    await writeFile(probe, "export const moved = true;\n", "utf8");
    try {
      const stale = await spawnCli(["checkpoint", "import", `.ackit/reviews/xproc-${num}.json`]);
      expect(stale.code).toBe(1);
      expect(stale.stderr).toContain("verdict-state-stale");
    } finally {
      await rm(probe, { force: true });
    }
  }, 180_000);
});
