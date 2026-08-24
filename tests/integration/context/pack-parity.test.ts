import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  buildCanonicalContextSections,
  buildContextPack,
  PACK_SCHEMA_VERSION,
} from "../../../src/core/context/index.js";

let rootPath: string;

beforeAll(async () => {
  rootPath = await mkdtemp(path.join(tmpdir(), "ackit-pack-parity-"));
  await writeFile(
    path.join(rootPath, "AGENTS.md"),
    "# parity fixture\nAlways use pnpm as the package manager.\n",
  );
  await writeFile(path.join(rootPath, "README.md"), "# parity\n");
  await mkdir(path.join(rootPath, "src"), { recursive: true });
  await writeFile(
    path.join(rootPath, "src", "util.ts"),
    "export function add(a: number, b: number): number {\n  return a + b;\n}\n",
  );
});

afterAll(async () => {
  await rm(rootPath, { recursive: true, force: true });
});

describe("context pack canonical orchestration and JSON/markdown parity (REQ-CTX-001..004)", () => {
  it("canonical sections carry all five REQ-CTX-001 inputs", async () => {
    const sections = await buildCanonicalContextSections({ canonicalPath: rootPath });
    expect(sections.map((s) => s.id)).toEqual([
      "instruction-graph",
      "active-tasks",
      "skills-catalog",
      "policy-summary",
      "repository-metadata",
    ]);
    for (const section of sections) {
      expect(section.body.length).toBeGreaterThan(0);
    }
  });

  it("JSON output includes real context sections AND file content with metadata", async () => {
    const sections = await buildCanonicalContextSections({ canonicalPath: rootPath });
    const pack = await buildContextPack(
      { canonicalPath: rootPath },
      {
        maxTokens: 50_000,
        format: "json",
        contextSections: sections,
      },
    );
    const parsed = JSON.parse(pack.json) as {
      schemaVersion: string;
      contextSections: Array<{
        id: string;
        content: string;
        estimatedTokens: number;
        sha256: string;
      }>;
      files: Array<{
        relativePath: string;
        content: string;
        estimatedTokens: number;
        sha256: string;
        bytes: number;
      }>;
      manifest: Array<{
        relativePath: string;
        action: string;
        estimatedTokens: number;
        sha256: string;
      }>;
      budget: { maxTokens: number; totalIncludedTokens: number };
    };

    expect(parsed.schemaVersion).toBe(PACK_SCHEMA_VERSION);
    expect(parsed.contextSections.map((s) => s.id)).toEqual([
      "instruction-graph",
      "active-tasks",
      "skills-catalog",
      "policy-summary",
      "repository-metadata",
    ]);
    for (const section of parsed.contextSections) {
      expect(section.content.length).toBeGreaterThan(0);
      expect(section.estimatedTokens).toBeGreaterThan(0);
      expect(section.sha256).toMatch(/^[0-9a-f]{64}$/);
    }
    const util = parsed.files.find((f) => f.relativePath === "src/util.ts");
    expect(util).toBeDefined();
    expect(util?.content).toContain("export function add");
    expect(util?.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(
      parsed.manifest.some((m) => m.relativePath === "src/util.ts" && m.action === "included"),
    ).toBe(true);
    expect(parsed.budget.totalIncludedTokens).toBeLessThanOrEqual(parsed.budget.maxTokens);
  });

  it("markdown and JSON represent the same semantic selection", async () => {
    const sections = await buildCanonicalContextSections({ canonicalPath: rootPath });
    const pack = await buildContextPack(
      { canonicalPath: rootPath },
      {
        maxTokens: 50_000,
        format: "json",
        contextSections: sections,
      },
    );
    const parsed = JSON.parse(pack.json) as {
      contextSections: Array<{ id: string; content: string }>;
      files: Array<{ relativePath: string; content: string }>;
      manifest: Array<{ relativePath: string; action: string }>;
    };
    for (const section of parsed.contextSections) {
      expect(pack.markdown).toContain(`## (context)/${section.id}`);
      expect(pack.markdown).toContain(section.content.trim());
    }
    const includedInJson = parsed.files.map((f) => f.relativePath).sort();
    for (const rel of includedInJson) {
      expect(pack.markdown).toContain(`## ${rel}`);
      const file = parsed.files.find((f) => f.relativePath === rel);
      expect(file !== undefined && pack.markdown.includes(file.content)).toBe(true);
    }
    const includedManifest = parsed.manifest
      .filter((m) => m.action === "included")
      .map((m) => m.relativePath)
      .sort();
    expect(includedManifest).toEqual(includedInJson);
  });

  it("output is deterministic and free of machine-local absolute paths", async () => {
    const sections = await buildCanonicalContextSections({ canonicalPath: rootPath });
    const a = await buildContextPack(
      { canonicalPath: rootPath },
      {
        maxTokens: 50_000,
        format: "json",
        contextSections: sections,
      },
    );
    const b = await buildContextPack(
      { canonicalPath: rootPath },
      {
        maxTokens: 50_000,
        format: "json",
        contextSections: sections,
      },
    );
    expect(a.json).toBe(b.json);
    expect(a.markdown).toBe(b.markdown);
    expect(a.json.includes(rootPath)).toBe(false);
    expect(a.json.includes(tmpdir())).toBe(false);
  });
});
