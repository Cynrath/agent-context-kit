import { execFileSync } from "node:child_process";
import { promises as fsp } from "node:fs";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CheckpointStore } from "../../../src/core/checkpoint/index.js";
import { resolveRepositoryRoot } from "../../../src/core/filesystem/root.js";
import type { TaskDoc } from "../../../src/core/tasks/index.js";

let rootPath = "";
let taskDoc: TaskDoc;

beforeEach(async () => {
  rootPath = await mkdtemp(path.join(tmpdir(), "ackit-cp-atomic-"));
  execFileSync("git", ["-C", rootPath, "init", "-q"], { stdio: "ignore" });
  execFileSync("git", ["-C", rootPath, "config", "user.email", "t@example.com"], {
    stdio: "ignore",
  });
  execFileSync("git", ["-C", rootPath, "config", "user.name", "t"], { stdio: "ignore" });
  await writeFile(path.join(rootPath, "README.md"), "# atomic fixture\n", "utf8");
  execFileSync("git", ["-C", rootPath, "add", "."], { stdio: "ignore" });
  execFileSync("git", ["-C", rootPath, "commit", "-q", "-m", "init"], { stdio: "ignore" });
  taskDoc = {
    meta: {
      id: "TASK-0001",
      title: "atomic",
      status: "active",
      schemaVersion: 2,
      dependencies: [],
      createdAt: "2026-01-01",
      completedAt: null,
    },
    relativePath: "docs/tasks/active/TASK-0001-atomic.md",
    body: "## Acceptance criteria\n\n- [x] done.\n- [ ] pending.\n",
  };
});

afterEach(async () => {
  vi.restoreAllMocks();
  await rm(rootPath, { recursive: true, force: true });
});

async function store(): Promise<CheckpointStore> {
  const resolved = await resolveRepositoryRoot(rootPath);
  if (!resolved.ok) throw new Error(resolved.diagnostic.message);
  return new CheckpointStore(resolved.root, rootPath);
}

function cpDir(): string {
  return path.join(rootPath, ".ackit", "workflow", "TASK-0001", "checkpoints");
}

async function dirFiles(): Promise<string[]> {
  try {
    return await readdir(cpDir());
  } catch {
    return [];
  }
}

describe("TASK-0069 atomic checkpoint writes", () => {
  it("happy path: canonical file valid, no stale temp, repeated writes valid", async () => {
    const checkpoints = await store();
    const first = await checkpoints.create(
      "TASK-0001",
      taskDoc,
      { profile: "quick" },
      { objective: "first" },
    );
    expect(first.id).toBe("CP-0001");
    let files = await dirFiles();
    expect(files).toEqual(["CP-0001.yaml"]);
    expect(files.some((f) => f.endsWith(".tmp"))).toBe(false);

    const second = await checkpoints.create(
      "TASK-0001",
      taskDoc,
      { profile: "quick" },
      { objective: "second" },
    );
    expect(second.id).toBe("CP-0002");
    files = await dirFiles();
    expect(files.sort()).toEqual(["CP-0001.yaml", "CP-0002.yaml"]);
    // Both remain schema-valid (no partial writes).
    expect(await checkpoints.find("TASK-0001", "CP-0001")).not.toBeNull();
    expect(await checkpoints.find("TASK-0001", "CP-0002")).not.toBeNull();
  });

  it("temp-write failure leaves previous checkpoint intact and no temp remains", async () => {
    const checkpoints = await store();
    await checkpoints.create("TASK-0001", taskDoc, { profile: "quick" }, { objective: "base" });
    const before = await readFile(path.join(cpDir(), "CP-0001.yaml"), "utf8");

    const openSpy = vi.spyOn(fsp, "open");
    openSpy.mockRejectedValueOnce(
      Object.assign(new Error("injected temp failure"), { code: "ENOSPC" }),
    );
    await expect(
      checkpoints.create("TASK-0001", taskDoc, { profile: "quick" }, { objective: "boom" }),
    ).rejects.toThrow("injected temp failure");

    // Previous checkpoint byte-identical; no temp files accepted as canonical.
    expect(await readFile(path.join(cpDir(), "CP-0001.yaml"), "utf8")).toBe(before);
    const files = await dirFiles();
    expect(files).toEqual(["CP-0001.yaml"]);
    expect(await checkpoints.find("TASK-0001", "CP-0001")).not.toBeNull();
  });

  it("rename failure leaves previous checkpoint intact and cleans temp", async () => {
    const checkpoints = await store();
    await checkpoints.create("TASK-0001", taskDoc, { profile: "quick" }, { objective: "base" });
    const before = await readFile(path.join(cpDir(), "CP-0001.yaml"), "utf8");

    const renameSpy = vi.spyOn(fsp, "rename");
    renameSpy.mockRejectedValueOnce(
      Object.assign(new Error("injected rename failure"), { code: "EIO" }),
    );
    await expect(
      checkpoints.create("TASK-0001", taskDoc, { profile: "quick" }, { objective: "boom" }),
    ).rejects.toThrow("injected rename failure");

    // CP-0001 (previous) intact; failed CP-0002 never appears; no stale temps.
    expect(await readFile(path.join(cpDir(), "CP-0001.yaml"), "utf8")).toBe(before);
    const files = await dirFiles();
    expect(files).toEqual(["CP-0001.yaml"]);
    expect(files.some((f) => f.endsWith(".tmp"))).toBe(false);
  });

  it("temp names carry no absolute paths", async () => {
    const checkpoints = await store();
    await checkpoints.create("TASK-0001", taskDoc, { profile: "quick" }, { objective: "x" });
    const files = await dirFiles();
    for (const file of files) {
      expect(path.isAbsolute(file)).toBe(false);
      expect(file).not.toContain(rootPath);
      expect(file).not.toContain(":\\");
    }
  });
});
