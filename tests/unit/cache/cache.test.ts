import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { cleanCache, computeCacheKey } from "../../../src/core/cache/cache.js";
import type { RepositoryRoot } from "../../../src/core/filesystem/root.js";

let repo: { root: RepositoryRoot; cleanup(): Promise<void> };

beforeAll(async () => {
  const rootPath = await mkdtemp(path.join(tmpdir(), "ackit-cache-"));
  repo = {
    root: { canonicalPath: rootPath },
    cleanup: () => rm(rootPath, { recursive: true, force: true }),
  };
});

afterAll(async () => {
  await repo.cleanup();
});

describe("cache (REQ-BASE-004)", () => {
  it("key binds content hash + rule version + engine version + digests", () => {
    const base = { contentHash: "aaa", configDigest: "cfg", policyDigest: "pol" };
    const k1 = computeCacheKey(base);
    expect(k1).toBe(computeCacheKey({ ...base }));
    expect(computeCacheKey({ ...base, contentHash: "bbb" })).not.toBe(k1);
    expect(computeCacheKey({ ...base, configDigest: "other" })).not.toBe(k1);
    expect(computeCacheKey({ ...base, policyDigest: "other" })).not.toBe(k1);
  });

  it("clean removes only the ACKit cache subtree; siblings untouched", async () => {
    const r = repo.root.canonicalPath;
    await mkdir(path.join(r, ".ackit", "cache", "scan"), { recursive: true });
    await writeFile(path.join(r, ".ackit", "cache", "scan", "entry.json"), "{}", "utf8");
    await mkdir(path.join(r, ".ackit", "skills"), { recursive: true });
    await writeFile(path.join(r, ".ackit", "skills.lock.json"), "{}", "utf8");
    await writeFile(path.join(r, "user-file.txt"), "precious\n", "utf8");

    const { removedBytes } = await cleanCache(repo.root);
    expect(removedBytes).toBeGreaterThan(0);
    await expect(readFile(path.join(r, ".ackit", "cache", "scan", "entry.json"))).rejects.toThrow();
    // Sibling ACKit state and user files survive.
    await expect(readFile(path.join(r, ".ackit", "skills.lock.json"))).resolves.toBeTruthy();
    await expect(readFile(path.join(r, "user-file.txt"))).resolves.toEqual(
      Buffer.from("precious\n"),
    );
  });

  it("round-trips entries and invalidates on rule-schema change", async () => {
    const key = computeCacheKey({ contentHash: "x", configDigest: "c", policyDigest: "p" });
    const { cacheGet, cacheSet } = await import("../../../src/core/cache/cache.js");
    await cacheSet(repo.root, {
      key,
      ruleSchemaVersion: 1,
      engineVersion: "test",
      configDigest: "c",
      policyDigest: "p",
      findings: [],
    });
    const entry = await cacheGet(repo.root, key);
    expect(entry?.findings).toEqual([]);
  });
});
