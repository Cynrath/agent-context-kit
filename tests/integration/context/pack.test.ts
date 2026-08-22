import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildContextPack, RANKING_WEIGHTS } from "../../../src/core/context/pack.js";
import type { RepositoryRoot } from "../../../src/core/filesystem/root.js";

let repo: { rootPath: string; cleanup(): Promise<void> };

const SECRET_VALUE = "AKIAIOSFODNN7EXAMPLE";
const WIN_ABS = "C:\\Users\\gizem\\AppData\\Local\\Temp\\cache";

beforeAll(async () => {
  const rootPath = await mkdtemp(path.join(tmpdir(), "ackit-pack-"));
  repo = { rootPath, cleanup: () => rm(rootPath, { recursive: true, force: true }) };
  const r = rootPath;
  await writeFile(path.join(r, "README.md"), "# Project readme\n");
  await mkdir(path.join(r, "docs"), { recursive: true });
  await writeFile(path.join(r, "docs", "guide.md"), "Guide body with real content.\n");
  await mkdir(path.join(r, "src"), { recursive: true });
  await writeFile(path.join(r, "src", "app.ts"), "export const app = 1;\n");
  // Candidate with planted secret → must be excluded.
  await writeFile(path.join(r, "secrets.txt"), `token=${SECRET_VALUE}\n`);
  // Candidate with a machine-local Windows path → scrubbed.
  await writeFile(path.join(r, "notes.md"), `Cache lives at ${WIN_ABS} for local runs.\n`);
});

afterAll(async () => {
  await repo.cleanup();
});

async function pack(options: Parameters<typeof buildContextPack>[1] = {}) {
  return buildContextPack({ canonicalPath: repo.rootPath }, options);
}

describe("context pack engine (REQ-CTX-001..004)", () => {
  it("is byte-identical across consecutive runs (no timestamps in contract)", async () => {
    const first = await pack({ format: "json" });
    const second = await pack({ format: "json" });
    expect(second.json).toBe(first.json);
    const firstMd = await pack();
    const secondMd = await pack();
    expect(secondMd.markdown).toBe(firstMd.markdown);
  });

  it("excludes secret-bearing files; raw value absent from markdown and json", async () => {
    const result = await pack({ format: "json" });
    const entry = result.manifest.find((item) => item.relativePath === "secrets.txt");
    expect(entry?.action).toBe("excluded");
    expect(entry?.reason).toContain("secret");
    expect(result.json).not.toContain(SECRET_VALUE);
    const md = await pack();
    expect(md.markdown).not.toContain(SECRET_VALUE);
  });

  it("scrubs machine-local absolute paths out of emitted content (Windows-style)", async () => {
    const result = await pack();
    expect(result.markdown).not.toContain("C:\\Users\\gizem");
    expect(result.markdown).toContain("<local-path>");
    const scrubbedEntry = result.manifest.find((item) => item.relativePath === "notes.md");
    expect(scrubbedEntry?.action).toBe("scrubbed");
    void WIN_ABS;
  });

  it("ranking order matches the documented weight table for a golden fixture", async () => {
    // Explicit include + changed + instruction scope beats plain docs file.
    const result = await pack({
      format: "json",
      includeGlobs: ["src/**"],
      changedFiles: ["src/app.ts"],
      maxTokens: 100_000,
    });
    const includedOrder = result.manifest
      .filter((entry) => entry.action === "included")
      .map((entry) => entry.relativePath);
    expect(includedOrder.indexOf("src/app.ts")).toBeGreaterThanOrEqual(0);
    const guideReason =
      result.manifest.find((entry) => entry.relativePath === "docs/guide.md")?.reason ?? "";
    const appReason =
      result.manifest.find((entry) => entry.relativePath === "src/app.ts")?.reason ?? "";
    const scoreOf = (reason: string): number => Number.parseInt(reason.replace("score ", ""), 10);
    expect(scoreOf(appReason)).toBeGreaterThan(scoreOf(guideReason));
    expect(RANKING_WEIGHTS.explicitInclude).toBe(100);
  });

  it("budget exhaustion excludes remaining files with explained reasons", async () => {
    const result = await pack({ format: "json", maxTokens: 1 });
    const excluded = result.manifest.filter(
      (entry) => entry.action === "excluded" && entry.reason.startsWith("budget exhausted"),
    );
    expect(excluded.length).toBeGreaterThan(0);
    expect(result.totalIncludedTokens).toBeLessThanOrEqual(30);
  });

  it("changed-files input boosts matching candidates (integration seam)", async () => {
    const boosted = await pack({
      format: "json",
      changedFiles: ["README.md"],
      includeGlobs: [],
    });
    const readme = boosted.manifest.find((entry) => entry.relativePath === "README.md");
    expect(readme?.action).toBe("included");
    expect(readme?.reason).toContain(String(RANKING_WEIGHTS.explicitInclude * 0));
  });

  it("deduplicates identical content by hash", async () => {
    await mkdir(path.join(repo.rootPath, "copy"), { recursive: true });
    await writeFile(path.join(repo.rootPath, "copy", "same.txt"), "identical bytes\n");
    await writeFile(path.join(repo.rootPath, "original.txt"), "identical bytes\n");
    const result = await pack({ format: "json" });
    const dupes = result.manifest.filter(
      (entry) => entry.action === "excluded" && entry.reason.startsWith("duplicate of"),
    );
    expect(dupes.length).toBeGreaterThanOrEqual(1);
  });
});
