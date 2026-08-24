import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resolveRepositoryRoot } from "../../../src/core/filesystem/root.js";
import { runScan } from "../../../src/core/scanner/pipeline.js";
import { builtinRegistry } from "../../../src/core/scanner/rules/catalog.js";

let repo: { rootPath: string; cleanup(): Promise<void> };

beforeAll(async () => {
  const rootPath = await mkdtemp(path.join(tmpdir(), "ackit-incr-"));
  await writeFile(path.join(rootPath, "a.txt"), "alpha\n");
  await writeFile(path.join(rootPath, "b.txt"), "beta\n");
  repo = { rootPath, cleanup: () => rm(rootPath, { recursive: true, force: true }) };
});

afterAll(async () => {
  await repo.cleanup();
});

describe("incremental scan empty-set semantics (audit item 6)", () => {
  it("undefined filterPaths = full scan", async () => {
    const resolved = await resolveRepositoryRoot(repo.rootPath);
    if (!resolved.ok) throw new Error(resolved.diagnostic.message);
    const result = await runScan(resolved.root, { rules: builtinRegistry().getAll() });
    expect(result.filesScanned).toBe(2);
  });

  it("defined non-empty filterPaths = restricted scan", async () => {
    const resolved = await resolveRepositoryRoot(repo.rootPath);
    if (!resolved.ok) throw new Error(resolved.diagnostic.message);
    const result = await runScan(resolved.root, {
      rules: builtinRegistry().getAll(),
      filterPaths: new Set(["a.txt"]),
    });
    expect(result.filesScanned).toBe(1);
  });

  it("defined EMPTY filterPaths = zero-target scan (not full scan)", async () => {
    // Clean repo --changed produces an empty changed set; this must NOT
    // fall through to a full scan.
    const resolved = await resolveRepositoryRoot(repo.rootPath);
    if (!resolved.ok) throw new Error(resolved.diagnostic.message);
    const result = await runScan(resolved.root, {
      rules: builtinRegistry().getAll(),
      filterPaths: new Set(),
    });
    expect(result.filesScanned).toBe(0);
    expect(result.findings).toHaveLength(0);
  });
});
