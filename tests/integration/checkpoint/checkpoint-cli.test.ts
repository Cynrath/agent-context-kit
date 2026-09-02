import { execFileSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runCli } from "../../../src/cli/index.js";
import { EXIT_CODES } from "../../../src/shared/exit-codes.js";

let rootPath = "";

beforeAll(async () => {
  rootPath = await mkdtemp(path.join(tmpdir(), "ackit-cp-cli-"));
  execFileSync("git", ["-C", rootPath, "init", "-q"], { stdio: "ignore" });
  execFileSync("git", ["-C", rootPath, "config", "user.email", "t@example.com"], {
    stdio: "ignore",
  });
  execFileSync("git", ["-C", rootPath, "config", "user.name", "t"], { stdio: "ignore" });
  const { writeFile } = await import("node:fs/promises");
  await writeFile(path.join(rootPath, "README.md"), "# cp cli fixture\n", "utf8");
  execFileSync("git", ["-C", rootPath, "add", "."], { stdio: "ignore" });
  execFileSync("git", ["-C", rootPath, "commit", "-q", "-m", "init"], { stdio: "ignore" });
});

afterAll(async () => {
  await rm(rootPath, { recursive: true, force: true });
});

async function cli(args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  const chunks: string[] = [];
  const errChunks: string[] = [];
  const originalWrite = process.stdout.write;
  const originalErr = process.stderr.write;
  process.stdout.write = ((chunk: string) => {
    chunks.push(String(chunk));
    return true;
  }) as typeof process.stdout.write;
  process.stderr.write = ((chunk: string) => {
    errChunks.push(String(chunk));
    return true;
  }) as typeof process.stderr.write;
  try {
    const code = await runCli(["node", "ackit", "--root", rootPath, ...args]);
    return { code, stdout: chunks.join(""), stderr: errChunks.join("") };
  } finally {
    process.stdout.write = originalWrite;
    process.stderr.write = originalErr;
  }
}

describe("ackit checkpoint CLI integration (ADR-0027)", () => {
  it("create → show → validate → task resume → export flow", { timeout: 60000 }, async () => {
    const created = await cli(["task", "create", "checkpoint cli flow"]);
    expect(created.code).toBe(EXIT_CODES.ok);
    const taskId = /TASK-\d{4}/.exec(created.stdout)?.[0] ?? "";

    const missing = await cli(["checkpoint", "create", taskId]);
    expect(missing.code).toBe(EXIT_CODES.usage); // --next-objective required

    const cp = await cli([
      "checkpoint",
      "create",
      taskId,
      "--next-objective",
      "Continue implementation",
      "--next-path",
      "src/x.ts",
      "--next-command",
      "pnpm test",
      "--next-expected",
      "tests green",
    ]);
    expect(cp.code).toBe(EXIT_CODES.ok);
    expect(cp.stdout).toContain("CP-0001");

    const show = await cli(["checkpoint", "show", taskId]);
    expect(show.code).toBe(EXIT_CODES.ok);
    expect(show.stdout).toContain("Continue implementation");

    const validate = await cli(["checkpoint", "validate", taskId]);
    expect(validate.code).toBe(EXIT_CODES.ok);
    expect(validate.stdout).toContain("fresh");

    const resume = await cli(["task", "resume", taskId]);
    expect(resume.code).toBe(EXIT_CODES.ok);
    expect(resume.stdout).toContain("# Resume");
    expect(resume.stdout).toContain("Continue implementation");
    expect(resume.stdout).toContain("Command: pnpm test");

    const resumeJson = await cli(["--json", "task", "resume", taskId]);
    expect(resumeJson.code).toBe(EXIT_CODES.ok);
    const parsed = JSON.parse(resumeJson.stdout) as { checkpoint: string };
    expect(parsed.checkpoint).toBe("CP-0001");

    const exported = await cli(["checkpoint", "export", taskId, "--out", "handoff.md"]);
    expect(exported.code).toBe(EXIT_CODES.ok);
    expect(exported.stdout).toContain("handoff pack written to handoff.md");
    const { readFile } = await import("node:fs/promises");
    const pack = await readFile(path.join(rootPath, "handoff.md"), "utf8");
    expect(pack).toContain("# ACKit Handoff Pack");

    const escapeAttempt = await cli(["checkpoint", "export", taskId, "--out", "../escape.md"]);
    expect(escapeAttempt.code).toBe(EXIT_CODES.securityBoundary);
  });

  it("missing checkpoint and unknown task fail with usage codes", { timeout: 30000 }, async () => {
    const show = await cli(["checkpoint", "show", "TASK-9999"]);
    expect(show.code).toBe(EXIT_CODES.usage);
    const resume = await cli(["task", "resume", "TASK-9999"]);
    expect(resume.code).toBe(EXIT_CODES.usage);
    const created = await cli(["task", "create", "no checkpoint task"]);
    const taskId = /TASK-\d{4}/.exec(created.stdout)?.[0] ?? "";
    const resumeEmpty = await cli(["task", "resume", taskId]);
    expect(resumeEmpty.code).toBe(EXIT_CODES.usage);
  });
});
