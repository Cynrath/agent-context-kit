import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { TaskMeta } from "../../../src/core/tasks/index.js";
import { serialize, TaskMetaSchema, TaskStore } from "../../../src/core/tasks/index.js";

let rootPath = "";

beforeAll(async () => {
  rootPath = await mkdtemp(path.join(tmpdir(), "ackit-taskrefs-"));
  await mkdir(path.join(rootPath, "docs", "tasks", "active"), { recursive: true });
  await mkdir(path.join(rootPath, "docs", "intent"), { recursive: true });
  await mkdir(path.join(rootPath, "docs", "specs"), { recursive: true });
});

afterAll(async () => {
  await rm(rootPath, { recursive: true, force: true });
});

describe("task frontmatter additive refs (ADR-0025 §5)", () => {
  it("parses legacy frontmatter identically (no migration)", () => {
    const legacy = TaskMetaSchema.parse({
      id: "TASK-0001",
      title: "legacy task",
      status: "completed",
      schemaVersion: 2,
      dependencies: [],
      createdAt: "2026-01-01",
      completedAt: "2026-01-02",
    });
    expect(legacy.intentRef).toBeUndefined();
    expect(legacy.specRefs).toBeUndefined();
    expect(legacy.planRef).toBeUndefined();
  });

  it("accepts the new optional refs", () => {
    const parsed = TaskMetaSchema.parse({
      id: "TASK-0002",
      title: "with refs",
      schemaVersion: 2,
      dependencies: [],
      createdAt: "2026-01-01",
      intentRef: "INTENT-0001",
      specRefs: ["docs/specs/adr.md"],
      decisionRefs: ["docs/decisions/d1.md"],
      planRef: "docs/plans/p.md",
    });
    expect(parsed.intentRef).toBe("INTENT-0001");
    expect(parsed.specRefs).toEqual(["docs/specs/adr.md"]);
  });

  it("rejects traversal/absolute/backslash reference paths (T19)", () => {
    const base = {
      id: "TASK-0003",
      title: "bad refs",
      schemaVersion: 2,
      dependencies: [],
      createdAt: "2026-01-01",
    };
    expect(TaskMetaSchema.safeParse({ ...base, planRef: "../escape.md" }).success).toBe(false);
    expect(TaskMetaSchema.safeParse({ ...base, planRef: "/etc/passwd" }).success).toBe(false);
    expect(TaskMetaSchema.safeParse({ ...base, planRef: "C:\\temp\\x.md" }).success).toBe(false);
    expect(TaskMetaSchema.safeParse({ ...base, intentRef: "TASK-0001" }).success).toBe(false);
    expect(
      TaskMetaSchema.safeParse({ ...base, specRefs: Array.from({ length: 9 }, () => "a.md") })
        .success,
    ).toBe(false);
  });

  it("serialize is byte-identical for ref-less tasks (backward compat)", () => {
    const meta: TaskMeta = TaskMetaSchema.parse({
      id: "TASK-0004",
      title: "refless",
      status: "pending",
      schemaVersion: 2,
      dependencies: ["TASK-0001"],
      createdAt: "2026-01-01",
      completedAt: null,
    });
    const expected = [
      "---",
      'id: "TASK-0004"',
      'title: "refless"',
      "status: pending",
      "schemaVersion: 2",
      "dependencies:",
      '  - "TASK-0001"',
      'createdAt: "2026-01-01"',
      "completedAt: null",
      "---",
      "",
      "body",
    ].join("\n");
    expect(serialize(meta, "body")).toBe(expected);
  });

  it("serialize writes refs only when present", () => {
    const meta: TaskMeta = TaskMetaSchema.parse({
      id: "TASK-0005",
      title: "with refs",
      status: "pending",
      schemaVersion: 2,
      dependencies: [],
      createdAt: "2026-01-01",
      intentRef: "INTENT-0001",
      specRefs: ["docs/specs/s.md"],
      planRef: "docs/plans/p.md",
    });
    const out = serialize(meta, "body");
    expect(out).toContain('intentRef: "INTENT-0001"');
    expect(out).toContain('specRefs:\n  - "docs/specs/s.md"');
    expect(out).toContain('planRef: "docs/plans/p.md"');
  });
});

describe("TaskStore doctor reference validation (ADR-0025 §5)", () => {
  it("create writes refs; doctor flags missing refs with stable codes", async () => {
    const store = new TaskStore(rootPath);
    const created = await store.create("with intent ref", [], {
      intentRef: "INTENT-0001",
      specRefs: ["docs/specs/missing.md"],
    });
    expect(created.meta.intentRef).toBe("INTENT-0001");
    const report = await store.doctor();
    expect(report.ok).toBe(false);
    expect(
      report.problems.some(
        (p) => p.includes("TASK-REF-MISSING") && p.includes("intentRef 'INTENT-0001'"),
      ),
    ).toBe(true);
    expect(
      report.problems.some(
        (p) => p.includes("TASK-REF-MISSING") && p.includes("docs/specs/missing.md"),
      ),
    ).toBe(true);
  });

  it("doctor is green when all refs resolve", async () => {
    const store = new TaskStore(rootPath);
    const intentDoc = [
      "---",
      'schemaId: "ackit.intent.v1"',
      'id: "INTENT-0001"',
      'title: "intent exists"',
      "status: accepted",
      'createdAt: "2026-08-31"',
      'problem: "p"',
      'desiredOutcome: "d"',
      "---",
    ].join("\n");
    await writeFile(
      path.join(rootPath, "docs", "intent", "INTENT-0001-exists.md"),
      intentDoc,
      "utf8",
    );
    await writeFile(path.join(rootPath, "docs", "specs", "s.md"), "# spec\n", "utf8");
    await store.create("fully referenced", [], {
      intentRef: "INTENT-0001",
      specRefs: ["docs/specs/s.md"],
    });
    const report = await store.doctor();
    // Only the missing-ref task from the previous test may still be failing.
    const problemsForReferenced = report.problems.filter(
      (p) => p.includes("fully referenced") || p.includes("TASK-REF-MISSING: TASK-0007"),
    );
    expect(problemsForReferenced).toEqual([]);
  });

  it("new task body includes the AGENTS.md planning sections", async () => {
    const store = new TaskStore(rootPath);
    const created = await store.create("sections fixture");
    expect(created.body).toContain("## Required tests");
    expect(created.body).toContain("## Affected files");
    expect(created.body).toContain("## Rollback plan");
    expect(created.body).toContain("## Completion notes");
  });
});
