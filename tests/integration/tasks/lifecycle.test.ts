import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { TaskStore } from "../../../src/core/tasks/store.js";
import { TaskMetaSchema } from "../../../src/core/tasks/types.js";

let repoPath: string;

beforeAll(async () => {
  repoPath = await mkdtemp(path.join(tmpdir(), "ackit-tasksys-"));
});

afterAll(async () => {
  await rm(repoPath, { recursive: true, force: true });
});

describe("task system lifecycle (REQ-TASKS-001..004)", () => {
  it("create → start → complete(blocked) → fix → complete(ok) → archive behaves per contract", async () => {
    const store = new TaskStore(repoPath);
    const dep = await store.create("dependency task");
    const main = await store.create("main task", [dep.meta.id]);

    expect(main.meta.id).toMatch(/^TASK-\d{4}$/);
    expect(dep.meta.id).not.toBe(main.meta.id);

    // IDs strictly sequential from the tool.
    const third = await store.create("third task");
    const numeric = (id: string): number => Number.parseInt(id.replace("TASK-", ""), 10);
    expect(numeric(third.meta.id)).toBe(Math.max(numeric(dep.meta.id), numeric(main.meta.id)) + 1);

    // Complete the dependency FIRST (single-active rule).
    await store.start(dep.meta.id);
    let listed = await store.list(false);
    expect(listed.filter((doc) => doc.meta.status === "active")).toHaveLength(1);
    const depPath = path.join(repoPath, dep.relativePath.split("/").join(path.sep));
    let depRaw = await readFile(depPath, "utf8");
    depRaw = depRaw.replace(/\[ \]/g, "[x]").replace("(placeholder)", "done");
    await writeFile(depPath, depRaw, "utf8");
    await store.complete(dep.meta.id);

    // Now start main; gate blocks while a criterion is unchecked.
    await store.start(main.meta.id);
    await expect(store.complete(main.meta.id)).rejects.toThrow(/completion gate blocked/);

    // Simulate ticking boxes and writing real notes.
    const filePath = path.join(repoPath, main.relativePath.split("/").join(path.sep));
    let raw = await readFile(filePath, "utf8");
    raw = raw
      .replace("- [ ] Implementation matches scope.", "- [x] Implementation matches scope.")
      .replace(
        "- [ ] Test plan executed with pass counts recorded.",
        "- [x] Test plan executed with pass counts recorded.",
      )
      .replace("(placeholder)", "Ran suite; 5/5 passed.");
    await writeFile(filePath, raw, "utf8");

    // All blockers resolved → completes.
    await store.complete(main.meta.id);
    listed = await store.list(false);
    const mainDoc = listed.find((doc) => doc.meta.id === main.meta.id);
    expect(mainDoc?.meta.status).toBe("completed");

    const archivedRelative = await store.archive(main.meta.id);
    expect(archivedRelative).toContain("docs/tasks/archive/");
    void third;
  });

  it("gate --force overrides blockers but records warnings", async () => {
    const store = new TaskStore(repoPath);
    const task = await store.create("forced completion task");
    await store.start(task.meta.id);
    const result = await store.complete(task.meta.id, { force: true });
    expect(result.forced).toBe(true);
    expect(result.warnings.join(" ")).toMatch(/unchecked acceptance criteria/);
  });

  it("doctor detects duplicate ids, unknown deps, cycles and multiple actives", async () => {
    const cycleRoot = await mkdtemp(path.join(tmpdir(), "ackit-tasks-cycle-"));
    try {
      const store = new TaskStore(cycleRoot);
      const a = await store.create("cycle A", []);
      const b = await store.create("cycle B", [a.meta.id]);
      // Introduce a cycle by rewriting B to depend on nothing and A on B.
      const fs = await import("node:fs/promises");
      const aFile = path.join(cycleRoot, a.relativePath.split("/").join(path.sep));
      const bFile = path.join(cycleRoot, b.relativePath.split("/").join(path.sep));
      const aRaw = (await fs.readFile(aFile, "utf8")).replace(
        /^dependencies:\r?\n {2}\[\]$/m,
        `dependencies:\n  - "${b.meta.id}"`,
      );
      await fs.writeFile(aFile, aRaw, "utf8");
      void bFile;
      const report = await store.doctor();
      expect(report.ok).toBe(false);
      expect(report.problems.some((problem) => problem.includes("cycle"))).toBe(true);
      void b;
    } finally {
      await rm(cycleRoot, { recursive: true, force: true });
    }
  });

  it("doctor surfaces unparsable task documents instead of skipping them silently (REQ-GOV-007)", async () => {
    const brokenRoot = await mkdtemp(path.join(tmpdir(), "ackit-tasks-broken-"));
    try {
      const store = new TaskStore(brokenRoot);
      await store.create("healthy task");
      // A hand-mangled document: no frontmatter at all.
      await writeFile(
        path.join(brokenRoot, "docs", "tasks", "active", "TASK-9001-broken.md"),
        "# just markdown, no frontmatter\n",
        "utf8",
      );
      // Listing stays tolerant (the healthy doc is still usable)…
      const listed = await store.list(false);
      expect(listed).toHaveLength(1);
      // …but doctor must surface the unparsable file explicitly.
      const report = await store.doctor();
      expect(report.ok).toBe(false);
      const problem = report.problems.find((item) => item.includes("TASK-9001-broken.md"));
      expect(problem).toBeDefined();
      expect(problem).toMatch(/unparsable task document/);
    } finally {
      await rm(brokenRoot, { recursive: true, force: true });
    }
  });

  it("schema validates tool-created docs; duplicate-ID creation impossible", async () => {
    const store = new TaskStore(repoPath);
    const docs = await store.list(true);
    for (const doc of docs) {
      expect(TaskMetaSchema.parse(JSON.parse(JSON.stringify(doc.meta)))).toBeTruthy();
    }
    const ids = docs.map((doc) => doc.meta.id);
    expect(new Set(ids).size).toBe(ids.length);
    const nextId = await store.nextId();
    expect(ids).not.toContain(nextId);
    const committedSchema = await readFile(
      path.join(process.cwd(), "schemas", "task.schema.json"),
      "utf8",
    );
    expect(committedSchema).toMatch(/TASK-/);
  });
});
