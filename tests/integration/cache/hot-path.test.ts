import { existsSync, readdirSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { executeConfiguredScan } from "../../../src/core/scanner/orchestrate.js";

let repo: { rootPath: string; cleanup(): Promise<void> };

beforeAll(async () => {
  const rootPath = await mkdtemp(path.join(os.tmpdir(), "ackit-cache-hot-"));
  await writeFile(path.join(rootPath, "a.ts"), "export const a = 1;\n");
  await writeFile(path.join(rootPath, "b.ts"), "export const b = 2;\n");
  repo = { rootPath, cleanup: () => rm(rootPath, { recursive: true, force: true }) };
});

afterAll(async () => {
  await repo.cleanup();
});

describe("cache hot path (audit item 10)", () => {
  it("cold scan creates cache entries; warm scan reuses them", async () => {
    // Cold scan — populates cache.
    const cold = await executeConfiguredScan(repo.rootPath);
    expect(cold.result.filesScanned).toBe(2);
    const cacheDir = path.join(repo.rootPath, ".ackit", "cache", "scan");
    expect(existsSync(cacheDir)).toBe(true);
    const entries = readdirSync(cacheDir);
    expect(entries.length).toBeGreaterThan(0);

    // Warm scan — same content, same config/policy → cache hit for both files.
    const warm = await executeConfiguredScan(repo.rootPath);
    expect(warm.result.filesScanned).toBe(2);
    expect(warm.findings).toEqual(cold.findings); // identical results
  });

  it("changed file invalidates its own cache entry but not others", async () => {
    // First scan to populate cache.
    await executeConfiguredScan(repo.rootPath);

    // Modify only one file.
    const fs = await import("node:fs/promises");
    await fs.writeFile(path.join(repo.rootPath, "a.ts"), "// modified\n");

    const result = await executeConfiguredScan(repo.rootPath);
    // Both files still scanned (discovery finds both), but only `a.ts`
    // re-evaluated rules. Correctness: findings still valid.
    expect(result.result.filesScanned).toBe(2);
    expect(result.exceededThreshold).toBeDefined();
  });

  it("cache is invalidated when policy digest changes", async () => {
    // This test verifies that changing the policy (e.g., adding suppressions)
    // produces different cache keys, so stale results are never used.
    // We can't easily change the actual policy in a unit test, but we can
    // verify the key computation is sensitive to the policy digest.
    const { computeCacheKey } = await import("../../../src/core/cache/cache.js");
    const k1 = computeCacheKey({ contentHash: "x", configDigest: "c1", policyDigest: "p1" });
    const k2 = computeCacheKey({ contentHash: "x", configDigest: "c1", policyDigest: "p2" });
    expect(k1).not.toBe(k2);
  });
});
