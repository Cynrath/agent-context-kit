import { promises as fsp } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { RepositoryRoot } from "../../../src/core/filesystem/root.js";
import { collectScanTargets } from "../../../src/core/filesystem/scan-targets.js";

describe("walk limits and budgets", () => {
  async function makeTempRepo(): Promise<{ root: RepositoryRoot; cleanup(): Promise<void> }> {
    const rootPath = await fsp.mkdtemp(path.join(os.tmpdir(), "ackit-fs-limits-"));
    return {
      root: { canonicalPath: rootPath },
      cleanup: () => fsp.rm(rootPath, { recursive: true, force: true }),
    };
  }

  it("skips oversized single files with a per-file diagnostic", async () => {
    const repo = await makeTempRepo();
    try {
      await fsp.writeFile(path.join(repo.root.canonicalPath, "big.bin"), Buffer.alloc(4096, 0x41));
      await fsp.writeFile(path.join(repo.root.canonicalPath, "small.txt"), "tiny");
      const collection = await collectScanTargets(repo.root, {
        skipClassification: true,
        limits: { maxFileBytes: 1024 },
      });
      const names = collection.targets.map((t) => t.relativePath).sort();
      expect(names).toEqual(["small.txt"]);
      expect(collection.diagnostics.some((d) => d.code === "FS-LIMIT-BYTES")).toBe(true);
    } finally {
      await repo.cleanup();
    }
  });

  it("stops with a total-bytes diagnostic when the cumulative budget is exceeded", async () => {
    const repo = await makeTempRepo();
    try {
      for (const name of ["a.txt", "b.txt"]) {
        await fsp.writeFile(path.join(repo.root.canonicalPath, name), Buffer.alloc(2048, 0x42));
      }
      const codes: string[] = [];
      const { walkRepository } = await import("../../../src/core/filesystem/walk.js");
      for await (const event of walkRepository(
        { canonicalPath: repo.root.canonicalPath },
        { limits: { maxTotalBytes: 2048 } },
      )) {
        if (event.kind === "diagnostic") {
          codes.push(event.diagnostic.code);
        }
      }
      expect(codes).toContain("FS-LIMIT-BYTES");
    } finally {
      await repo.cleanup();
    }
  });

  it("prunes deeper directories when maxDepth is set and explains the prune", async () => {
    const repo = await makeTempRepo();
    try {
      await fsp.mkdir(path.join(repo.root.canonicalPath, "l1", "l2"), { recursive: true });
      await fsp.writeFile(path.join(repo.root.canonicalPath, "d0.txt"), "0");
      await fsp.writeFile(path.join(repo.root.canonicalPath, "l1", "d1.txt"), "1");
      await fsp.writeFile(path.join(repo.root.canonicalPath, "l1", "l2", "d2.txt"), "2");
      const collection = await collectScanTargets(repo.root, {
        skipClassification: true,
        limits: { maxDepth: 2 },
      });
      const names = collection.targets.map((t) => t.relativePath).sort();
      expect(names).toEqual(["d0.txt", "l1/d1.txt"]);
      expect(collection.diagnostics.some((d) => d.code === "FS-LIMIT-DEPTH")).toBe(true);
    } finally {
      await repo.cleanup();
    }
  });

  it("respects a wall-clock deadline with FS-DEADLINE-EXCEEDED", async () => {
    const repo = await makeTempRepo();
    try {
      for (let index = 0; index < 20; index += 1) {
        await fsp.writeFile(path.join(repo.root.canonicalPath, `f${index}.txt`), "x");
      }
      const codes: string[] = [];
      const { walkRepository } = await import("../../../src/core/filesystem/walk.js");
      for await (const event of walkRepository(
        { canonicalPath: repo.root.canonicalPath },
        { limits: { deadlineMs: 1 } },
      )) {
        if (event.kind === "diagnostic") {
          codes.push(event.diagnostic.code);
        }
      }
      expect(codes).toContain("FS-DEADLINE-EXCEEDED");
    } finally {
      await repo.cleanup();
    }
  });
});
