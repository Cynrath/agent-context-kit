import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runCli } from "../../../src/cli/index.js";
import { hookStatus, installHook, uninstallHook } from "../../../src/core/watch/hooks.js";
import { EXIT_CODES } from "../../../src/shared/exit-codes.js";

let rootPath = "";

beforeAll(async () => {
  rootPath = await mkdtemp(path.join(tmpdir(), "ackit-hooks-"));
  execFileSync("git", ["-C", rootPath, "init", "-q"], { stdio: "ignore" });
});

afterAll(async () => {
  await rm(rootPath, { recursive: true, force: true });
});

function hookFile(): string {
  return path.join(rootPath, ".git", "hooks", "pre-commit");
}

describe("managed pre-commit block + drift gate (ADR-0028 §3, TASK-0055)", () => {
  it("install appends the managed block with the drift gate line; uninstall removes only it", async () => {
    // Foreign hook content is preserved byte-exact.
    await writeFile(hookFile(), "#!/bin/sh\necho user-hook\n", "utf8");
    const installed = await installHook(rootPath);
    expect(installed.status).toBe("foreign-preserved");
    const content = await readFile(hookFile(), "utf8");
    expect(content).toContain("echo user-hook"); // preserved
    expect(content).toContain("ackit scan --staged --ci || exit 1");
    expect(content).toContain("ackit drift check-active --ci || exit 1"); // the gate
    expect((await hookStatus(rootPath)).status).toBe("installed");

    const removed = await uninstallHook(rootPath);
    expect(removed.status).toBe("removed");
    const cleaned = await readFile(hookFile(), "utf8");
    expect(cleaned).toContain("echo user-hook"); // still preserved
    expect(cleaned).not.toContain("ackit drift check-active");
    expect(cleaned).not.toContain("ackit scan --staged");
  });

  it("already-installed is idempotent", async () => {
    await installHook(rootPath);
    const again = await installHook(rootPath);
    expect(again.status).toBe("already-installed");
    await uninstallHook(rootPath);
  });

  it("drift check-active is a clean no-op without a workflow task (legacy safe)", async () => {
    const chunks: string[] = [];
    const originalWrite = process.stdout.write;
    process.stdout.write = ((chunk: string) => {
      chunks.push(String(chunk));
      return true;
    }) as typeof process.stdout.write;
    try {
      const code = await runCli([
        "node",
        "ackit",
        "--root",
        rootPath,
        "drift",
        "check-active",
        "--ci",
      ]);
      expect(code).toBe(EXIT_CODES.ok); // no workflow task → no-op
    } finally {
      process.stdout.write = originalWrite;
    }
  });
});
