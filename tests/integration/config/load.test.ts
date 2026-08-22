import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { configDigest, loadAckitConfig } from "../../../src/core/config/load.js";

let repo: { rootPath: string; cleanup(): Promise<void> };

beforeAll(async () => {
  const rootPath = await mkdtemp(path.join(tmpdir(), "ackit-config-"));
  repo = { rootPath, cleanup: () => rm(rootPath, { recursive: true, force: true }) };
});

afterAll(async () => {
  await repo.cleanup();
});

describe("loadAckitConfig integration", () => {
  it("missing ackit.yml yields sensible defaults with a stable digest", async () => {
    const result = await loadAckitConfig(repo.rootPath);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.sourceFile).toBeNull();
      expect(result.config.scan.severityThreshold).toBe("low");
      expect(result.digest).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it("digest is deterministic for identical configs", async () => {
    const first = await loadAckitConfig(repo.rootPath);
    const second = await loadAckitConfig(repo.rootPath);
    if (first.ok && second.ok) {
      expect(configDigest(first.config)).toBe(second.digest);
    } else {
      throw new Error("expected both loads to succeed");
    }
  });

  it("malformed YAML produces CFG-YAML-SYNTAX with line/column", async () => {
    await writeFile(
      path.join(repo.rootPath, "ackit.yml"),
      "schemaVersion: 1\nscan:\n\tinclude: [broken\n",
      "utf8",
    );
    const result = await loadAckitConfig(repo.rootPath);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const error = result.errors[0];
      expect(error?.code).toBe("CFG-YAML-SYNTAX");
      expect(error?.location?.line).toBeGreaterThan(1);
    }
  });

  it("explicit --config pointing at a missing file fails with CFG-FILE-MISSING", async () => {
    const result = await loadAckitConfig(repo.rootPath, { configPath: "nope/ackit.yml" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]?.code).toBe("CFG-FILE-MISSING");
    }
  });

  it("a valid config file loads with typed sections and source attribution", async () => {
    await writeFile(
      path.join(repo.rootPath, "ackit.yml"),
      ["schemaVersion: 1", "scan:", "  severityThreshold: high", ""].join("\n"),
      "utf8",
    );
    const result = await loadAckitConfig(repo.rootPath);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config.scan.severityThreshold).toBe("high");
      expect(result.sourceFile).toBe(path.join(repo.rootPath, "ackit.yml"));
    }
  });

  it("unknown keys report code, location and did-you-mean suggestion", async () => {
    await writeFile(
      path.join(repo.rootPath, "ackit.yml"),
      ["schemaVersion: 1", "scna:", "  severityThreshold: low", ""].join("\n"),
      "utf8",
    );
    const result = await loadAckitConfig(repo.rootPath);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const error = result.errors[0];
      expect(error?.code).toBe("CFG-UNKNOWN-KEY");
      expect(error?.suggestion).toBe("scan");
      expect(error?.location?.line).toBe(2);
    }
  });

  it("wrong schemaVersion gets the dedicated upgrade error code", async () => {
    await writeFile(path.join(repo.rootPath, "ackit.yml"), "schemaVersion: 99\n", "utf8");
    const result = await loadAckitConfig(repo.rootPath);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]?.code).toBe("CFG-SCHEMA-VERSION");
    }
  });
});
