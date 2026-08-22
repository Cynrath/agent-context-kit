import { promises as fsp } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { classifyContent } from "../../src/core/filesystem/classify.js";
import type { FilesystemEngine } from "../../src/core/filesystem/engine.js";
import { createFilesystemEngine } from "../../src/core/filesystem/root.js";
import { collectScanTargets } from "../../src/core/filesystem/scan-targets.js";
import type { TraversalLimits } from "../../src/core/filesystem/types.js";
import { walkRepository } from "../../src/core/filesystem/walk.js";

/**
 * Security fixtures per REQ-FS-006 / MS§11. Each fixture builds a real temp
 * repository on the real filesystem. Directory links use junctions on Windows
 * and directory symlinks elsewhere — both are creatable without elevated
 * privileges, so every assertion here runs on every platform.
 */
async function makeTempRepo(): Promise<{ rootPath: string; cleanup(): Promise<void> }> {
  const rootPath = await fsp.mkdtemp(path.join(os.tmpdir(), "ackit-fs-sec-"));
  return { rootPath, cleanup: () => fsp.rm(rootPath, { recursive: true, force: true }) };
}

const DIR_LINK_TYPE = process.platform === "win32" ? ("junction" as const) : ("dir" as const);

describe("filesystem security boundary", () => {
  let repo: { rootPath: string; cleanup(): Promise<void> };
  let engine: FilesystemEngine;

  beforeAll(async () => {
    repo = await makeTempRepo();
    await fsp.writeFile(path.join(repo.rootPath, "README.md"), "# ok\n");
    const created = await createFilesystemEngine(repo.rootPath);
    if (!created.ok) {
      throw new Error(created.diagnostic.message);
    }
    engine = created.engine;
  });

  afterAll(async () => {
    await repo.cleanup();
  });

  it("denies ../../ traversal at string level before any filesystem access", async () => {
    const result = await engine.resolveWithinRoot("../../outside.txt");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect("diagnostic" in result ? result.diagnostic.code : undefined).toBe(
        "FS-PATH-ESCAPES-ROOT",
      );
    }
  });

  it("rejects absolute paths outright", async () => {
    const result = await engine.resolveWithinRoot(os.tmpdir());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect("diagnostic" in result ? result.diagnostic.code : undefined).toBe("FS-PATH-ABSOLUTE");
    }
  });

  it("blocks a directory link whose canonical target leaves the root", async () => {
    const outsideDir = await fsp.mkdtemp(path.join(os.tmpdir(), "ackit-fs-outside-"));
    try {
      await fsp.writeFile(path.join(outsideDir, "secret.txt"), "outside");
      await fsp.symlink(outsideDir, path.join(repo.rootPath, "leak"), DIR_LINK_TYPE);

      const resolved = await engine.resolveWithinRoot("leak");
      expect(resolved.ok).toBe(false);
      if (!resolved.ok) {
        expect("diagnostic" in resolved ? resolved.diagnostic.code : undefined).toBe(
          "FS-PATH-ESCAPES-ROOT",
        );
      }

      const events = [];
      for await (const event of walkRepository({ canonicalPath: engine.canonicalRoot })) {
        events.push(event);
      }
      expect(
        events.some((e) => e.kind === "diagnostic" && e.diagnostic.code === "FS-SYMLINK-BLOCKED"),
      ).toBe(true);
      expect(events.some((e) => e.kind === "file" && e.entry.relativePath.startsWith("leak"))).toBe(
        false,
      );
    } finally {
      await fsp.rm(outsideDir, { recursive: true, force: true });
    }
  });

  it("allows a link whose target stays inside the root", async () => {
    await fsp.mkdir(path.join(repo.rootPath, "docs"), { recursive: true });
    await fsp.writeFile(path.join(repo.rootPath, "docs", "inner.txt"), "inside\n");
    await fsp.symlink(
      path.join(repo.rootPath, "docs"),
      path.join(repo.rootPath, "docs-link"),
      DIR_LINK_TYPE,
    );
    const resolved = await engine.resolveWithinRoot("docs-link/inner.txt");
    expect(resolved.ok).toBe(true);
  });

  it("terminates deterministically on cyclic directory links", async () => {
    await fsp.mkdir(path.join(repo.rootPath, "a"), { recursive: true });
    await fsp.symlink(repo.rootPath, path.join(repo.rootPath, "a", "cycle"), DIR_LINK_TYPE);
    const relativePaths: string[] = [];
    let cycleDiagnostics = 0;
    for await (const event of walkRepository({ canonicalPath: engine.canonicalRoot })) {
      if (event.kind === "file") {
        relativePaths.push(event.entry.relativePath);
      }
      if (event.kind === "diagnostic" && event.diagnostic.code === "FS-CYCLE-SKIPPED") {
        cycleDiagnostics += 1;
      }
    }
    // The walk must terminate (this line proves it) and never duplicate files via the cycle.
    const unique = new Set(relativePaths);
    expect(unique.size).toBe(relativePaths.length);
    expect(cycleDiagnostics).toBeGreaterThanOrEqual(1);
  }, 15000);

  it("reports a dangling link as a diagnostic instead of crashing", async () => {
    await fsp.symlink(
      path.join(repo.rootPath, "does-not-exist"),
      path.join(repo.rootPath, "dangling"),
      DIR_LINK_TYPE,
    );
    const collection = await collectScanTargets({ canonicalPath: engine.canonicalRoot }, {});
    expect(collection.diagnostics.some((d) => d.code === "FS-READ-FAILED")).toBe(true);
    expect(collection.targets.every((t) => !t.relativePath.startsWith("dangling"))).toBe(true);
  });

  it("emits a diagnostic when the file-count limit is reached", async () => {
    for (let index = 0; index < 5; index += 1) {
      await fsp.writeFile(path.join(repo.rootPath, `bulk-${index}.txt`), `${index}\n`);
    }
    const limits: TraversalLimits = { maxFiles: 3 };
    const codes: string[] = [];
    for await (const event of walkRepository({ canonicalPath: engine.canonicalRoot }, { limits })) {
      if (event.kind === "diagnostic") {
        codes.push(event.diagnostic.code);
      }
    }
    expect(codes).toContain("FS-LIMIT-FILES");
  });

  it("aborts mid-traversal promptly when the signal fires", async () => {
    for (let index = 0; index < 50; index += 1) {
      await fsp.mkdir(path.join(repo.rootPath, `deep-${index}`), { recursive: true });
      await fsp.writeFile(path.join(repo.rootPath, `deep-${index}`, "f.txt"), "x");
    }
    const controller = new AbortController();
    let seen = 0;
    const started = Date.now();
    for await (const _event of walkRepository(
      { canonicalPath: engine.canonicalRoot },
      {
        signal: controller.signal,
        limits: {},
      },
    )) {
      seen += 1;
      if (seen === 2) {
        controller.abort();
      }
    }
    const elapsed = Date.now() - started;
    expect(seen).toBeLessThan(60);
    expect(elapsed).toBeLessThan(5000);
  }, 20000);

  it("classifies an unknown-extension secret-like file as text and keeps it scannable", async () => {
    await fsp.writeFile(path.join(repo.rootPath, "config.unknownext"), "API_KEY=abcd1234efgh\n");
    const collection = await collectScanTargets({ canonicalPath: engine.canonicalRoot }, {});
    const target = collection.targets.find((t) => t.relativePath === "config.unknownext");
    expect(target).toBeDefined();
    expect(target?.kind).toBe("text");
    expect(classifyContent(Buffer.from("API_KEY=abcd1234efgh\n", "utf8"))).toBe("text");
  });
});
