import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  INTENT_SCHEMA_ID,
  type IntentMeta,
  IntentMetaSchema,
  IntentStore,
  intentFingerprint,
  normalizeIntent,
} from "../../../src/core/intent/index.js";

let rootPath = "";

beforeAll(async () => {
  rootPath = await mkdtemp(path.join(tmpdir(), "ackit-intent-"));
});

afterAll(async () => {
  await rm(rootPath, { recursive: true, force: true });
});

function meta(overrides: Partial<IntentMeta> = {}): IntentMeta {
  return IntentMetaSchema.parse({
    id: "INTENT-0001",
    title: "intent fixture",
    status: "accepted",
    createdAt: "2026-08-31",
    source: "user request #1",
    problem: "the   build   is   slow",
    desiredOutcome: "build finishes under 60s",
    constraints: [" keep api stable ", "keep api stable"],
    nonGoals: ["no rewrite of the compiler"],
    affectedSystems: [" build ", "ci"],
    acceptanceCriteria: [
      { id: "AC-002", requirement: "build under 60s" },
      { id: "AC-001", requirement: "no behavior change" },
    ],
    openQuestions: ["which jobs are slowest?"],
    risks: ["cache invalidation complexity"],
    ...overrides,
  });
}

describe("intent schema (ackit.intent.v1)", () => {
  it("rejects unknown fields (strict, THREAT_MODEL T16)", () => {
    const result = IntentMetaSchema.safeParse({ ...meta(), injected: "pwned" });
    expect(result.success).toBe(false);
  });

  it("accepts the normalized shape with defaults", () => {
    const parsed = IntentMetaSchema.parse({
      id: "INTENT-0002",
      title: "t",
      createdAt: "2026-08-31",
      problem: "p",
      desiredOutcome: "d",
    });
    expect(parsed.status).toBe("draft");
    expect(parsed.constraints).toEqual([]);
  });

  it("rejects malformed criterion ids and non-ISO dates", () => {
    expect(
      IntentMetaSchema.safeParse({
        ...meta(),
        acceptanceCriteria: [{ id: "X-1", requirement: "r" }],
      }).success,
    ).toBe(false);
    expect(IntentMetaSchema.safeParse({ ...meta(), createdAt: "2026-13-45" }).success).toBe(false);
  });
});

describe("intent normalization + fingerprint", () => {
  it("normalizes deterministically: whitespace collapsed, lists deduped+sorted, criteria id-ordered", () => {
    const normalized = normalizeIntent(meta());
    expect(normalized.problem).toBe("the build is slow");
    expect(normalized.constraints).toEqual(["keep api stable"]);
    expect(normalized.affectedSystems).toEqual(["build", "ci"]);
    expect(normalized.acceptanceCriteria.map((c) => c.id)).toEqual(["AC-001", "AC-002"]);
  });

  it("fingerprint is stable across formatting differences and machine paths", () => {
    const a = intentFingerprint(meta());
    const b = intentFingerprint(
      meta({
        problem: "the build\nis   slow",
        constraints: ["keep api stable"],
      }),
    );
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("fingerprint changes when semantic content changes", () => {
    const a = intentFingerprint(meta());
    const b = intentFingerprint(meta({ desiredOutcome: "different outcome" }));
    expect(a).not.toBe(b);
  });
});

describe("IntentStore (docs-first)", () => {
  it("creates scaffolds with allocated ids and round-trips them", async () => {
    const store = new IntentStore(rootPath);
    const created = await store.create("first intent");
    expect(created.meta.id).toBe("INTENT-0001");
    const found = await store.find("INTENT-0001");
    expect(found).not.toBeNull();
    expect(found?.doc.meta.title).toBe("first intent");
    const second = await store.create("second intent");
    expect(second.meta.id).toBe("INTENT-0002");
    const list = await store.list();
    expect(list.map((doc) => doc.meta.id)).toEqual(["INTENT-0001", "INTENT-0002"]);
  });

  it("lists tolerate unparsable docs; validate reports them explicitly", async () => {
    const store = new IntentStore(rootPath);
    const badPath = path.join(rootPath, "docs", "intent", "INTENT-0099-broken.md");
    await writeFile(badPath, "---\nid: BROKEN\n---\nbody\n", "utf8");
    const list = await store.list();
    expect(list.some((doc) => doc.meta.id === "INTENT-0099")).toBe(false);
    const found = await store.find("INTENT-0099");
    expect(found).toBeNull(); // strict validation keeps unparsable docs out of the API
  });

  it("refuses traversal-shaped ids (no path construction)", async () => {
    const store = new IntentStore(rootPath);
    const found = await store.find("../../escape");
    expect(found).toBeNull();
  });

  it("validate reports duplicate criterion ids with stable codes", async () => {
    const store = new IntentStore(rootPath);
    const dupPath = path.join(rootPath, "docs", "intent", "INTENT-0098-dup.md");
    const frontmatter = [
      "---",
      `schemaId: "${INTENT_SCHEMA_ID}"`,
      'id: "INTENT-0098"',
      'title: "dup"',
      "status: accepted",
      'createdAt: "2026-08-31"',
      'problem: "p"',
      'desiredOutcome: "d"',
      "acceptanceCriteria:",
      '  - id: "AC-001"\n    requirement: "r1"',
      '  - id: "AC-001"\n    requirement: "r2"',
      "---",
    ].join("\n");
    await writeFile(dupPath, `${frontmatter}\n`, "utf8");
    const report = await store.validate("INTENT-0098");
    expect(report.ok).toBe(false);
    expect(report.problems.some((p) => p.code === "INTENT-CRITERION-DUPLICATE")).toBe(true);
    const all = await store.validate();
    expect(all.ok).toBe(false);
  });

  it("rejects secret-shaped intent content with the canonical gate (T26)", async () => {
    const store = new IntentStore(rootPath);
    const secretPath = path.join(rootPath, "docs", "intent", "INTENT-0097-secret.md");
    const frontmatter = [
      "---",
      `schemaId: "${INTENT_SCHEMA_ID}"`,
      'id: "INTENT-0097"',
      'title: "leaky"',
      "status: draft",
      'createdAt: "2026-08-31"',
      'source: "creds pasted from config"',
      'problem: "uses AKIAIOSFODNN7EXAMPLE as example"',
      'desiredOutcome: "d"',
      "---",
    ].join("\n");
    await writeFile(secretPath, `${frontmatter}\n`, "utf8");
    const report = await store.validate("INTENT-0097");
    expect(report.ok).toBe(false);
    expect(report.problems.some((p) => p.code === "INTENT-SECRET-CONTENT")).toBe(true);
  });
});
