/**
 * Handoff CLI integration (TASK-0082): `checkpoint export --format json`,
 * `checkpoint import` accept/refusal paths, v1-markdown default stability,
 * traversal guards, and read-only import behavior (porcelain clean).
 */
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runCli } from "../../../src/cli/index.js";
import { CheckpointStore } from "../../../src/core/checkpoint/index.js";
import { EvidenceStore } from "../../../src/core/evidence/index.js";
import { syncRegistry } from "../../../src/core/evidence/sync.js";
import { resolveRepositoryRoot } from "../../../src/core/filesystem/root.js";
import { serialize, TaskStore } from "../../../src/core/tasks/index.js";
import { EXIT_CODES } from "../../../src/shared/exit-codes.js";

let rootPath = "";
const DATE = "2026-08-31";

beforeAll(async () => {
  rootPath = await mkdtemp(path.join(tmpdir(), "ackit-handoff-cli-"));
  execFileSync("git", ["-C", rootPath, "init", "-q"], { stdio: "ignore" });
  execFileSync("git", ["-C", rootPath, "config", "user.email", "t@example.com"], {
    stdio: "ignore",
  });
  execFileSync("git", ["-C", rootPath, "config", "user.name", "t"], { stdio: "ignore" });
  await writeFile(path.join(rootPath, "README.md"), "# handoff cli fixture\n", "utf8");
  execFileSync("git", ["-C", rootPath, "add", "."], { stdio: "ignore" });
  execFileSync("git", ["-C", rootPath, "commit", "-q", "-m", "init"], { stdio: "ignore" });
});

afterAll(async () => {
  await rm(rootPath, { recursive: true, force: true });
});

async function cli(args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  const chunks: string[] = [];
  const errChunks: string[] = [];
  const originalWrite = process.stdout.write;
  const originalErr = process.stderr.write;
  process.stdout.write = ((chunk: string) => {
    chunks.push(String(chunk));
    return true;
  }) as typeof process.stdout.write;
  process.stderr.write = ((chunk: string) => {
    errChunks.push(String(chunk));
    return true;
  }) as typeof process.stderr.write;
  try {
    const code = await runCli(["node", "ackit", "--root", rootPath, ...args]);
    return { code, stdout: chunks.join(""), stderr: errChunks.join("") };
  } finally {
    process.stdout.write = originalWrite;
    process.stderr.write = originalErr;
  }
}

function porcelain(): string {
  return execFileSync("git", ["-C", rootPath, "status", "--porcelain"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

async function makeCheckpointedTask(objective: string): Promise<string> {
  const store = new TaskStore(rootPath);
  for (const doc of await store.list(false)) {
    if (doc.meta.status === "active") {
      const abs = path.join(rootPath, "docs", "tasks", "active", path.basename(doc.relativePath));
      const raw = await readFile(abs, "utf8");
      await writeFile(abs, raw.replace(/^status:\s*.*$/m, "status: blocked"), "utf8");
    }
  }
  const created = await store.create("handoff cli fixture");
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
        "- [x] Cli handoff done.",
        "",
        "## Completion notes",
        "",
        "Done.",
      ].join("\n"),
    ),
    "utf8",
  );
  await store.start(taskId);
  const resolved = await resolveRepositoryRoot(rootPath);
  if (!resolved.ok) throw new Error(resolved.diagnostic.message);
  const doc = await store.find(taskId);
  if (doc === null) throw new Error("task missing after authoring");
  const evidenceStore = new EvidenceStore(resolved.root);
  const registry = syncRegistry(doc.doc, null, DATE);
  for (const criterion of registry.criteria) {
    criterion.status = "verified";
    criterion.evidence = [{ type: "test", ref: "pnpm vitest run (green)", recordedAt: DATE }];
  }
  await evidenceStore.save(taskId, registry);
  const live = await store.find(taskId);
  if (live === null) throw new Error("task missing before checkpoint");
  await new CheckpointStore(resolved.root, rootPath).create(
    taskId,
    live.doc,
    { profile: "quick" },
    { objective },
  );
  return taskId;
}

describe("handoff CLI (TASK-0082)", () => {
  it("export --format json → import accepts with resume equivalence, porcelain clean", async () => {
    const taskId = await makeCheckpointedTask("ship the cli handoff");
    await mkdir(path.join(rootPath, ".ackit", "reviews"), { recursive: true });
    const exported = await cli([
      "checkpoint",
      "export",
      taskId,
      "--format",
      "json",
      "--out",
      ".ackit/reviews/handoff.json",
    ]);
    expect(exported.code).toBe(EXIT_CODES.ok);
    expect(exported.stdout).toContain("handoff written to .ackit/reviews/handoff.json");
    const raw = await readFile(path.join(rootPath, ".ackit", "reviews", "handoff.json"), "utf8");
    expect(raw).toContain('"ackit.handoff.v2"');

    const before = porcelain();
    const imported = await cli(["checkpoint", "import", ".ackit/reviews/handoff.json"]);
    expect(imported.code).toBe(EXIT_CODES.ok);
    expect(imported.stdout).toContain(`${taskId}: handoff CP-0001 fresh`);
    expect(imported.stdout).toContain("ship the cli handoff");

    const json = await cli(["--json", "checkpoint", "import", ".ackit/reviews/handoff.json"]);
    expect(json.code).toBe(EXIT_CODES.ok);
    const report = JSON.parse(json.stdout) as { task: string; fresh: boolean; resume: string };
    expect(report).toMatchObject({ task: taskId, fresh: true });
    expect(report.resume).toContain("ship the cli handoff");
    // Import is read-only: porcelain identical (export wrote under .ackit/).
    expect(porcelain()).toBe(before);
  });

  it("stale handoff refused (exit 1, TASK-0079 code); v1 markdown refused with migration code", async () => {
    const taskId = await makeCheckpointedTask("stale the handoff");
    await mkdir(path.join(rootPath, ".ackit", "reviews"), { recursive: true });
    const num = taskId.slice("TASK-".length);
    await cli([
      "checkpoint",
      "export",
      taskId,
      "--format",
      "json",
      "--out",
      `.ackit/reviews/stale-${num}.json`,
    ]);
    const probe = path.join(rootPath, `src-handoff-cli-${num}.js`);
    await writeFile(probe, "export const stale = true;\n", "utf8");
    try {
      const refused = await cli(["checkpoint", "import", `.ackit/reviews/stale-${num}.json`]);
      expect(refused.code).toBe(EXIT_CODES.thresholdExceeded);
      expect(refused.stderr).toContain("verdict-state-stale");
    } finally {
      await rm(probe, { force: true });
    }
    // v1 markdown pack: identified, refused with the migration code (exit 2).
    await cli(["checkpoint", "export", taskId, "--out", `.ackit/reviews/v1-${num}.md`]);
    const v1 = await cli(["checkpoint", "import", `.ackit/reviews/v1-${num}.md`]);
    expect(v1.code).toBe(EXIT_CODES.usage);
    expect(v1.stderr).toContain("handoff-v1-unbound");
  });

  it("default export stays the v1 markdown pack; traversal + garbage refused", async () => {
    const taskId = await makeCheckpointedTask("default pack stays v1");
    const packed = await cli(["checkpoint", "export", taskId]);
    expect(packed.code).toBe(EXIT_CODES.ok);
    expect(packed.stdout).toContain("# ACKit Handoff Pack");
    expect(packed.stdout).not.toContain("ackit.handoff.v2");

    const traversal = await cli(["checkpoint", "import", "../escape.json"]);
    expect(traversal.code).toBe(EXIT_CODES.securityBoundary);
    const missing = await cli(["checkpoint", "import", ".ackit/reviews/nope.json"]);
    expect(missing.code).toBe(EXIT_CODES.usage);
    await writeFile(path.join(rootPath, ".ackit", "reviews", "garbage.json"), "nope", "utf8");
    const garbage = await cli(["checkpoint", "import", ".ackit/reviews/garbage.json"]);
    expect(garbage.code).toBe(EXIT_CODES.usage);
    expect(garbage.stderr).toContain("handoff-invalid");
    const badFormat = await cli(["checkpoint", "export", taskId, "--format", "yaml"]);
    expect(badFormat.code).toBe(EXIT_CODES.usage);
  });
});
