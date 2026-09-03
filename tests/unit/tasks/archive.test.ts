import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { TaskStore } from "../../../src/core/tasks/store.js";

const repos: string[] = [];

afterAll(async () => {
  for (const repo of repos) await rm(repo, { recursive: true, force: true });
});

async function freshStore(): Promise<{ store: TaskStore; repo: string }> {
  const repo = await mkdtemp(path.join(tmpdir(), "ackit-taskarchive-"));
  repos.push(repo);
  return { store: new TaskStore(repo), repo };
}

function docAbs(repo: string, relativePath: string): string {
  return path.join(repo, ...relativePath.split("/"));
}

/** Tick every acceptance box and replace the placeholder notes. */
async function satisfyGate(repo: string, relativePath: string): Promise<void> {
  const file = docAbs(repo, relativePath);
  const raw = await readFile(file, "utf8");
  await writeFile(
    file,
    raw.replace(/\[ \]/g, "[x]").replace("(placeholder)", "verified in test"),
    "utf8",
  );
}

async function createCompleted(store: TaskStore, repo: string, title: string, deps: string[] = []) {
  const created = await store.create(title, deps);
  await store.start(created.meta.id);
  await satisfyGate(repo, created.relativePath);
  await store.complete(created.meta.id);
  const found = await store.find(created.meta.id);
  if (found === null) throw new Error(`setup failed for ${created.meta.id}`);
  return found.doc;
}

describe("task archive hygiene (TASK-0074)", () => {
  it("archived completed tasks remain readable/showable by id", async () => {
    const { store, repo } = await freshStore();
    const doc = await createCompleted(store, repo, "readable after archive");
    const target = await store.archive(doc.meta.id);
    expect(target).toContain("docs/tasks/archive/");

    const found = await store.find(doc.meta.id);
    expect(found).not.toBeNull();
    expect(found?.archived).toBe(true);
    expect(found?.doc.meta.status).toBe("completed");
    expect(found?.doc.meta.title).toBe("readable after archive");
    expect(found?.doc.relativePath).toContain("docs/tasks/archive/");
  });

  it("list(false) excludes archived docs; list(true) includes them", async () => {
    const { store, repo } = await freshStore();
    const doc = await createCompleted(store, repo, "listed in archive only");
    const activeBefore = await store.list(false);
    expect(activeBefore.some((d) => d.meta.id === doc.meta.id)).toBe(true);
    await store.archive(doc.meta.id);
    const activeAfter = await store.list(false);
    expect(activeAfter.some((d) => d.meta.id === doc.meta.id)).toBe(false);
    const all = await store.list(true);
    expect(all.some((d) => d.meta.id === doc.meta.id)).toBe(true);
  });

  it("dependency lookup survives archive (archived dep satisfies the gate)", async () => {
    const { store, repo } = await freshStore();
    const dep = await createCompleted(store, repo, "archived dependency");
    await store.archive(dep.meta.id);
    const main = await store.create("depends on archived", [dep.meta.id]);
    await store.start(main.meta.id);
    await satisfyGate(repo, main.relativePath);
    await expect(store.complete(main.meta.id)).resolves.toBeDefined();
    const report = await store.doctor();
    // Main is completed-in-active by design here; only dependency-resolution
    // problems would indicate a regression.
    expect(report.problems.filter((p) => p.includes("does not exist"))).toEqual([]);
  });

  it("evidence and verdict lookups are id-keyed and survive archive", async () => {
    const { store, repo } = await freshStore();
    const doc = await createCompleted(store, repo, "evidence survives archive");
    const { resolveRepositoryRoot } = await import("../../../src/core/filesystem/root.js");
    const resolved = await resolveRepositoryRoot(repo);
    if (!resolved.ok) throw new Error(resolved.diagnostic.message);
    const { EvidenceStore } = await import("../../../src/core/evidence/index.js");
    const evidence = new EvidenceStore(resolved.root);
    await evidence.save(doc.meta.id, {
      schemaId: "ackit.evidence.v2",
      taskId: doc.meta.id,
      criteria: [],
      updatedAt: "2026-09-03",
    });
    await store.archive(doc.meta.id);
    const loaded = await evidence.load(doc.meta.id);
    expect(loaded?.taskId).toBe(doc.meta.id);

    const { VerdictStore } = await import("../../../src/core/verification/index.js");
    const verdicts = new VerdictStore(repo);
    // No verdicts recorded, but the id-keyed lookup path itself must not
    // depend on the task doc location.
    await expect(verdicts.list(doc.meta.id)).resolves.toEqual([]);
    const found = await store.find(doc.meta.id);
    expect(found?.archived).toBe(true);
  });

  it("invalid archive transitions are refused; archived re-archive is idempotent", async () => {
    const { store, repo } = await freshStore();
    const done = await createCompleted(store, repo, "idempotent archive");
    const first = await store.archive(done.meta.id);
    const second = await store.archive(done.meta.id);
    expect(second).toBe(first);
    await expect(store.archive("TASK-9999")).rejects.toThrow(/unknown task/);

    const pending = await store.create("never started");
    await expect(store.archive(pending.meta.id)).rejects.toThrow(/only completed tasks/);

    await store.start(pending.meta.id);
    await expect(store.archive(pending.meta.id)).rejects.toThrow(/only completed tasks/);
  });

  it("archived completed tasks are not treated as open work", async () => {
    const { store, repo } = await freshStore();
    const doc = await createCompleted(store, repo, "not open work");
    await store.archive(doc.meta.id);
    const open = (await store.list(false)).filter((d) =>
      ["pending", "active", "blocked"].includes(d.meta.status),
    );
    expect(open.some((d) => d.meta.id === doc.meta.id)).toBe(false);
    await expect(store.start(doc.meta.id)).rejects.toThrow();
    await expect(store.complete(doc.meta.id)).rejects.toThrow();
  });

  it("doctor reports TASK-COMPLETED-IN-ACTIVE until the task is archived", async () => {
    const { store, repo } = await freshStore();
    const doc = await createCompleted(store, repo, "completed in active");
    const dirty = await store.doctor();
    expect(dirty.ok).toBe(false);
    expect(
      dirty.problems.some((p) => p.includes("TASK-COMPLETED-IN-ACTIVE") && p.includes(doc.meta.id)),
    ).toBe(true);
    await store.archive(doc.meta.id);
    const clean = await store.doctor();
    expect(clean.problems.filter((p) => p.includes(doc.meta.id))).toEqual([]);
    expect(clean.ok).toBe(true);
  });

  it("archiveCompleted moves only completed tasks; deterministic and idempotent", async () => {
    const { store, repo } = await freshStore();
    const keepPending = await store.create("bulk keep pending");
    const moveA = await createCompleted(store, repo, "bulk move A");
    const moveB = await createCompleted(store, repo, "bulk move B");
    const keepActive = await store.create("bulk keep active");
    await store.start(keepActive.meta.id);

    const dry = await store.archiveCompleted(true);
    expect(dry.wouldArchive).toContain(moveA.meta.id);
    expect(dry.wouldArchive).toContain(moveB.meta.id);
    expect(dry.archived).toEqual([]);
    // Dry run moves nothing.
    expect((await store.find(moveA.meta.id))?.archived).toBe(false);

    const first = await store.archiveCompleted(false);
    expect(first.archived).toEqual([moveA.meta.id, moveB.meta.id].sort());
    expect((await store.find(keepPending.meta.id))?.archived).toBe(false);
    expect((await store.find(keepActive.meta.id))?.archived).toBe(false);

    const second = await store.archiveCompleted(false);
    expect(second.archived).toEqual([]);
  });
});
