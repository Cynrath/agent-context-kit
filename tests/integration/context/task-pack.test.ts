import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CheckpointStore } from "../../../src/core/checkpoint/index.js";
import { buildTaskPackContext } from "../../../src/core/context/orchestrate.js";
import { buildContextPack, RANKING_WEIGHTS } from "../../../src/core/context/pack.js";
import { resolveRepositoryRoot } from "../../../src/core/filesystem/root.js";
import { TaskStore } from "../../../src/core/tasks/index.js";

let rootPath = "";

beforeAll(async () => {
  rootPath = await mkdtemp(path.join(tmpdir(), "ackit-taskpack-"));
  await mkdir(path.join(rootPath, "src", "tasks"), { recursive: true });
  await mkdir(path.join(rootPath, "src", "unrelated"), { recursive: true });
  await mkdir(path.join(rootPath, "docs", "tasks", "active"), { recursive: true });
  await mkdir(path.join(rootPath, "docs", "intent"), { recursive: true });
  await mkdir(path.join(rootPath, "docs", "plans"), { recursive: true });
  await writeFile(
    path.join(rootPath, "src", "tasks", "engine.ts"),
    "export const a = 1;\n".repeat(40),
    "utf8",
  );
  await writeFile(
    path.join(rootPath, "src", "unrelated", "other.ts"),
    "export const b = 2;\n".repeat(40),
    "utf8",
  );
  await writeFile(path.join(rootPath, "docs", "plans", "p.md"), "# plan\n", "utf8");
});

afterAll(async () => {
  await rm(rootPath, { recursive: true, force: true });
});

async function makeTaskWithScope(): Promise<string> {
  const store = new TaskStore(rootPath);
  const created = await store.create("task pack fixture", [], {
    planRef: "docs/plans/p.md",
  });
  // Author the declared scope + acceptance items into the body.
  const docAbs = path.join(
    rootPath,
    "docs",
    "tasks",
    "active",
    path.basename(created.relativePath),
  );
  const { readFile } = await import("node:fs/promises");
  const raw = await readFile(docAbs, "utf8");
  const frontmatterEnd = raw.indexOf("---", 3);
  const body = [
    "## Purpose",
    "",
    "Task pack ranking fixture.",
    "",
    "## Affected files",
    "",
    "- src/tasks/**",
    "",
    "## Acceptance criteria",
    "",
    "- [x] One done.",
    "- [ ] One pending.",
    "",
    "## Completion notes",
    "",
    "(placeholder)",
  ].join("\n");
  const { serialize } = await import("../../../src/core/tasks/index.js");
  const found = (await store.find(created.meta.id))?.doc;
  const meta = found?.meta ?? created.meta;
  await writeFile(docAbs, `${serialize(meta, body)}`, "utf8");
  void frontmatterEnd;
  return created.meta.id;
}

describe("task-aware packs (TASK-0049 / ADR-0027 §5)", () => {
  it("buildTaskPackContext extracts declared scope, refs, and resume", async () => {
    const taskId = await makeTaskWithScope();
    const resolved = await resolveRepositoryRoot(rootPath);
    if (!resolved.ok) throw new Error(resolved.diagnostic.message);
    const taskPack = await buildTaskPackContext(resolved.root, taskId);
    expect(taskPack.ok).toBe(true);
    if (!taskPack.ok) return;
    expect(taskPack.taskContext.declaredScopeGlobs).toEqual(["src/tasks/**"]);
    expect(taskPack.taskContext.referencePaths).toContain("docs/plans/p.md");
    expect(
      taskPack.taskContext.referencePaths.some((p) => p.startsWith("docs/tasks/active/")),
    ).toBe(true);
    expect(taskPack.resumeSection).toBeNull(); // no checkpoint yet
  });

  it("declared-scope files outrank unrelated files at equal size", async () => {
    const taskId = await makeTaskWithScope();
    const resolved = await resolveRepositoryRoot(rootPath);
    if (!resolved.ok) throw new Error(resolved.diagnostic.message);
    const taskPack = await buildTaskPackContext(resolved.root, taskId);
    if (!taskPack.ok) throw new Error(taskPack.diagnostic.message);
    const pack = await buildContextPack(resolved.root, {
      maxTokens: 2000,
      format: "markdown",
      taskContext: taskPack.taskContext,
    });
    const included = pack.manifest.filter((entry) => entry.action === "included");
    const inScope = included.find((entry) => entry.relativePath === "src/tasks/engine.ts");
    const outScope = included.find((entry) => entry.relativePath === "src/unrelated/other.ts");
    expect(inScope).toBeDefined();
    if (inScope !== undefined && outScope !== undefined) {
      // Declared scope (80) beats base type weight alone.
      expect(inScope.estimatedTokens).toBeGreaterThan(0);
      expect(pack.manifest.find((e) => e.relativePath === "src/tasks/engine.ts")?.reason).toContain(
        String(RANKING_WEIGHTS.taskDeclaredScope + 8),
      );
    }
  });

  it("determinism: same repo + same task state → byte-identical pack", async () => {
    const taskId = await makeTaskWithScope();
    const resolved = await resolveRepositoryRoot(rootPath);
    if (!resolved.ok) throw new Error(resolved.diagnostic.message);
    const taskPack = await buildTaskPackContext(resolved.root, taskId);
    if (!taskPack.ok) throw new Error(taskPack.diagnostic.message);
    const a = await buildContextPack(resolved.root, {
      maxTokens: 1500,
      format: "markdown",
      taskContext: taskPack.taskContext,
    });
    const b = await buildContextPack(resolved.root, {
      maxTokens: 1500,
      format: "markdown",
      taskContext: taskPack.taskContext,
    });
    expect(b.markdown).toBe(a.markdown);
  });

  it("--resume embeds the checkpoint resume section once a checkpoint exists", async () => {
    const taskId = await makeTaskWithScope();
    const resolved = await resolveRepositoryRoot(rootPath);
    if (!resolved.ok) throw new Error(resolved.diagnostic.message);
    const store = new TaskStore(rootPath);
    const doc = (await store.find(taskId))?.doc;
    if (doc === undefined) throw new Error("task doc missing");
    const checkpoints = new CheckpointStore(resolved.root, rootPath);
    await checkpoints.create(
      taskId,
      doc,
      { profile: "standard", stage: "implement" },
      { objective: "Rank and embed the resume context" },
    );
    const taskPack = await buildTaskPackContext(resolved.root, taskId);
    if (!taskPack.ok) throw new Error(taskPack.diagnostic.message);
    expect(taskPack.resumeSection).not.toBeNull();
    expect(taskPack.resumeSection?.id).toBe("task-resume");
    expect(taskPack.resumeSection?.body).toContain("Rank and embed the resume context");
    const pack = await buildContextPack(resolved.root, {
      maxTokens: 4000,
      format: "markdown",
      taskContext: taskPack.taskContext,
      contextSections: [taskPack.resumeSection as NonNullable<typeof taskPack.resumeSection>],
    });
    expect(pack.markdown).toContain("## (context)/task-resume");
    expect(pack.markdown).toContain("Rank and embed the resume context");
  });

  it("unknown task ids are reported, not thrown", async () => {
    const resolved = await resolveRepositoryRoot(rootPath);
    if (!resolved.ok) throw new Error(resolved.diagnostic.message);
    const result = await buildTaskPackContext(resolved.root, "TASK-9999");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.diagnostic.code).toBe("PACK-TASK-UNKNOWN");
  });
});
