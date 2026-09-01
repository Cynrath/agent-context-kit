import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  EVIDENCE_PROBLEM_CODES,
  type EvidenceRegistry,
  EvidenceStore,
  type EvidenceType,
  validateEvidence,
} from "../../../src/core/evidence/index.js";
import { criteriaFromTaskDoc, syncRegistry } from "../../../src/core/evidence/sync.js";
import { resolveRepositoryRoot } from "../../../src/core/filesystem/root.js";
import type { TaskDoc } from "../../../src/core/tasks/index.js";
import { TaskStore } from "../../../src/core/tasks/index.js";

let rootPath = "";

beforeAll(async () => {
  rootPath = await mkdtemp(path.join(tmpdir(), "ackit-evidence-"));
});

afterAll(async () => {
  await rm(rootPath, { recursive: true, force: true });
});

function registryWith(overrides: Partial<EvidenceRegistry> = {}): EvidenceRegistry {
  return {
    schemaId: "ackit.evidence.v2",
    taskId: "TASK-0001",
    criteria: [],
    updatedAt: "2026-08-31",
    ...overrides,
  };
}

describe("criteria sync (task doc is the source of truth)", () => {
  it("derives criteria in document order; checkbox state is NOT copied", async () => {
    const store = new TaskStore(rootPath);
    const created = await store.create("sync fixture");
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
      "## Acceptance criteria",
      "",
      "- [x] First criterion done in code.",
      "- [ ] Second criterion pending.",
      "",
      "## Completion notes",
      "",
      "(placeholder)",
    ].join("\n");
    const found = (await store.find(created.meta.id))?.doc as TaskDoc;
    const { serialize } = await import("../../../src/core/tasks/index.js");
    await writeFile(docAbs, `${serialize(found.meta, body)}${raw.slice(frontmatterEnd) ? "" : ""}`);
    void frontmatterEnd;
    const doc = (await store.find(created.meta.id))?.doc as TaskDoc;
    const criteria = criteriaFromTaskDoc(doc);
    expect(criteria.map((c) => c.id)).toEqual(["AC-001", "AC-002"]);
    // Implementation exists ≠ criterion verified: even the checked item starts
    // unverified in the registry.
    expect(criteria.every((c) => c.status === "unverified")).toBe(true);
  });

  it("sync preserves recorded evidence for unchanged requirements", () => {
    const taskDoc = {
      meta: {
        id: "TASK-0002",
        title: "t",
        status: "pending",
        schemaVersion: 2,
        dependencies: [],
        createdAt: "2026-08-31",
        completedAt: null,
      },
      relativePath: "docs/tasks/active/TASK-0002-x.md",
      body: "## Acceptance criteria\n\n- [ ] Criterion A.\n- [ ] Criterion B.\n",
    } as unknown as TaskDoc;
    const existing = registryWith({
      taskId: "TASK-0002",
      criteria: [
        {
          id: "AC-001",
          requirement: "Criterion A.",
          status: "verified",
          evidence: [{ type: "test", ref: "pnpm test (234 passed)", recordedAt: "2026-08-30" }],
        },
        {
          id: "AC-002",
          requirement: "OLD requirement text",
          status: "verified",
          evidence: [{ type: "test", ref: "old", recordedAt: "2026-08-30" }],
        },
      ],
    });
    const synced = syncRegistry(taskDoc, existing, "2026-08-31");
    const a = synced.criteria.find((c) => c.requirement === "Criterion A.");
    const b = synced.criteria.find((c) => c.requirement === "Criterion B.");
    expect(a?.status).toBe("verified");
    expect(a?.evidence).toHaveLength(1);
    expect(b?.status).toBe("unverified"); // changed requirement invalidates evidence
    expect(b?.evidence).toHaveLength(0);
  });
});

describe("validateEvidence (deterministic completeness)", () => {
  const baseCriterion = (
    id: string,
    status: "verified" | "unverified",
    evidence: { type: EvidenceType; ref: string }[],
  ) => ({
    id,
    requirement: `requirement ${id}`,
    status,
    evidence: evidence.map((e) => ({ ...e, recordedAt: "2026-08-31" })),
  });

  it("ok when every criterion is verified with qualifying evidence", () => {
    const registry = registryWith({
      criteria: [
        baseCriterion("AC-001", "verified", [{ type: "test", ref: "pnpm test" }]),
        baseCriterion("AC-002", "verified", [{ type: "build", ref: "pnpm build" }]),
      ],
    });
    const result = validateEvidence(registry);
    expect(result.ok).toBe(true);
  });

  it("MANDATED SCENARIO: implementation exists → mandatory evidence missing → denied", () => {
    // Criterion marked verified but only manual evidence → insufficient.
    const registry = registryWith({
      criteria: [baseCriterion("AC-001", "verified", [{ type: "manual", ref: "eyeballed it" }])],
    });
    const result = validateEvidence(registry);
    expect(result.ok).toBe(false);
    expect(
      result.problems.some((p) => p.code === EVIDENCE_PROBLEM_CODES.requiredEvidenceMissing),
    ).toBe(true);
    // Unverified criterion → CRITERION_UNVERIFIED.
    const registry2 = registryWith({
      criteria: [baseCriterion("AC-001", "unverified", [])],
    });
    const result2 = validateEvidence(registry2);
    expect(
      result2.problems.some((p) => p.code === EVIDENCE_PROBLEM_CODES.criterionUnverified),
    ).toBe(true);
    expect(
      result2.problems.some((p) => p.code === EVIDENCE_PROBLEM_CODES.requiredEvidenceMissing),
    ).toBe(true);
  });

  it("manual evidence allowed when explicitly configured", () => {
    const registry = registryWith({
      criteria: [baseCriterion("AC-001", "verified", [{ type: "manual", ref: "checked by hand" }])],
    });
    const result = validateEvidence(registry, { allowedTypes: ["manual"] });
    expect(result.ok).toBe(true);
  });

  it("rejects secret-shaped evidence refs (T17/T26)", () => {
    const registry = registryWith({
      criteria: [
        baseCriterion("AC-001", "verified", [
          { type: "test", ref: "ran with AKIAIOSFODNN7EXAMPLE" },
        ]),
      ],
    });
    const result = validateEvidence(registry);
    expect(result.problems.some((p) => p.code === EVIDENCE_PROBLEM_CODES.secretRef)).toBe(true);
  });

  it("problems sorted deterministically (criterion then code)", () => {
    const registry = registryWith({
      criteria: [
        baseCriterion("AC-002", "unverified", []),
        baseCriterion("AC-001", "unverified", []),
      ],
    });
    const a = validateEvidence(registry);
    const b = validateEvidence(registry);
    expect(a.problems).toEqual(b.problems);
    expect(a.problems[0]?.criterionId).toBe("AC-001");
  });
});

describe("EvidenceStore (ackit.evidence.v2)", () => {
  it("round-trips registries with strict validation; forged criteria rejected", async () => {
    const resolved = await resolveRepositoryRoot(rootPath);
    if (!resolved.ok) throw new Error(resolved.diagnostic.message);
    const store = new EvidenceStore(resolved.root);
    const registry = registryWith({
      taskId: "TASK-0003",
      criteria: [
        {
          id: "AC-001",
          requirement: "Criterion.",
          status: "unverified",
          evidence: [],
        },
      ],
    });
    await store.save("TASK-0003", registry);
    const loaded = await store.load("TASK-0003");
    expect(loaded?.criteria).toHaveLength(1);

    await expect(
      store.verify("TASK-0003", "AC-999", { type: "test", ref: "x" }),
    ).rejects.toMatchObject({ code: "EVIDENCE-CRITERION-UNKNOWN" });

    await expect(
      store.verify("../../escape", "AC-001", { type: "test", ref: "x" }),
    ).rejects.toMatchObject({ code: "EVIDENCE-TASK-ID-INVALID" });

    const verified = await store.verify("TASK-0003", "AC-001", {
      type: "test",
      ref: "pnpm vitest run (12 passed)",
    });
    expect(verified.criteria[0]?.status).toBe("verified");
    expect(verified.criteria[0]?.evidence).toHaveLength(1);
  });

  it("tampered registry files are rejected on load (T17)", async () => {
    const resolved = await resolveRepositoryRoot(rootPath);
    if (!resolved.ok) throw new Error(resolved.diagnostic.message);
    const store = new EvidenceStore(resolved.root);
    const file = path.join(rootPath, ".ackit", "workflow", "TASK-0004", "evidence.yaml");
    const { mkdir, writeFile: wf } = await import("node:fs/promises");
    await mkdir(path.dirname(file), { recursive: true });
    await wf(file, "schemaId: 'ackit.evidence.v2'\ntaskId: 'TASK-0004'\ninjected: true\n", "utf8");
    await expect(store.load("TASK-0004")).rejects.toMatchObject({
      code: "EVIDENCE-REGISTRY-INVALID",
    });
  });
});
