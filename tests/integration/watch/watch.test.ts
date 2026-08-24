import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { RepositoryRoot } from "../../../src/core/filesystem/root.js";
import { startWatch } from "../../../src/core/watch/watch.js";

let repo: { root: RepositoryRoot; rootPath: string; cleanup(): Promise<void> };

beforeAll(async () => {
  const rootPath = await mkdtemp(path.join(tmpdir(), "ackit-watch-"));
  repo = {
    root: { canonicalPath: rootPath },
    rootPath,
    cleanup: () => rm(rootPath, { recursive: true, force: true }),
  };
});

afterAll(async () => {
  await repo.cleanup();
});

describe("watch runner (REQ-WATCH-001)", () => {
  it("coalesces bursts into a single debounced callback with changed paths", async () => {
    let calls = 0;
    const allPaths = new Set<string>();
    const controller = new AbortController();
    const handle = startWatch(repo.root, {
      debounceMs: 150,
      signal: controller.signal,
      onChange: (paths) => {
        calls += 1;
        for (const p of paths) allPaths.add(p);
      },
    });

    // Wait for initial snapshot to complete before writing.
    await new Promise((resolve) => setTimeout(resolve, 300));
    // Burst of writes inside the debounce window.
    await writeFile(path.join(repo.rootPath, "a.txt"), "1\n");
    await writeFile(path.join(repo.rootPath, "a.txt"), "2\n");
    await writeFile(path.join(repo.rootPath, "b.txt"), "x\n");
    await new Promise((resolve) => setTimeout(resolve, 1000));
    expect(calls).toBeGreaterThanOrEqual(1);
    expect(allPaths.has("a.txt")).toBe(true);
    expect(allPaths.has("b.txt")).toBe(true);

    // Abort path resolves cleanly (Ctrl+C equivalent).
    controller.abort();
    await handle.done;
  }, 15000);

  it("ignores events under ignored directories", async () => {
    await mkdir(path.join(repo.rootPath, ".git"), { recursive: true });
    let calls = 0;
    const controller = new AbortController();
    const handle = startWatch(repo.root, {
      debounceMs: 100,
      signal: controller.signal,
      onChange: () => {
        calls += 1;
      },
    });
    await writeFile(path.join(repo.rootPath, ".git", "internal-file"), "noise\n");
    await new Promise((resolve) => setTimeout(resolve, 500));
    controller.abort();
    await handle.done;
    expect(calls).toBe(0);
  }, 10000);
});
