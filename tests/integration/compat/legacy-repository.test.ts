import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runCli } from "../../../src/cli/index.js";
import { EXIT_CODES } from "../../../src/shared/exit-codes.js";

let rootPath = "";

beforeAll(async () => {
  rootPath = await mkdtemp(path.join(tmpdir(), "ackit-legacy-compat-"));
  execFileSync("git", ["-C", rootPath, "init", "-q"], { stdio: "ignore" });
  execFileSync("git", ["-C", rootPath, "config", "user.email", "t@example.com"], {
    stdio: "ignore",
  });
  execFileSync("git", ["-C", rootPath, "config", "user.name", "t"], { stdio: "ignore" });
  // A v0.2.2-style legacy repository: ackit.yml without workflow sections and
  // tasks without artifact refs; no .ackit/workflow state anywhere.
  await writeFile(
    path.join(rootPath, "ackit.yml"),
    ["schemaVersion: 1", "context:", "  maxTokens: 50000"].join("\n"),
    "utf8",
  );
  await writeFile(path.join(rootPath, "AGENTS.md"), "# legacy\n", "utf8");
  await mkdir(path.join(rootPath, "docs", "tasks", "active"), { recursive: true });
  await writeFile(
    path.join(rootPath, "docs", "tasks", "active", "TASK-0001-legacy.md"),
    [
      "---",
      'id: "TASK-0001"',
      'title: "legacy task"',
      "status: pending",
      "schemaVersion: 2",
      "dependencies:",
      "  []",
      'createdAt: "2026-01-01"',
      "completedAt: null",
      "---",
      "",
      "## Purpose",
      "",
      "Legacy fixture.",
      "",
      "## Acceptance criteria",
      "",
      "- [ ] Works as before.",
      "",
      "## Completion notes",
      "",
      "(placeholder)",
    ].join("\n"),
    "utf8",
  );
  await writeFile(path.join(rootPath, "README.md"), "# legacy repo\n", "utf8");
  execFileSync("git", ["-C", rootPath, "add", "."], { stdio: "ignore" });
  execFileSync("git", ["-C", rootPath, "commit", "-q", "-m", "legacy"], { stdio: "ignore" });
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

describe("legacy repository compatibility (TASK-0060, §18)", () => {
  it("v0.2.2-shaped repositories: config, task, and scan surfaces behave identically", async () => {
    // config check accepts the legacy config (no workflow sections).
    const config = await cli(["config", "check"]);
    expect(config.code).toBe(EXIT_CODES.ok);
    expect(config.stdout).toContain("OK");

    // task list/doctor/show see the legacy task unchanged.
    const list = await cli(["task", "list"]);
    expect(list.code).toBe(EXIT_CODES.ok);
    expect(list.stdout).toContain("TASK-0001");
    const doctor = await cli(["task", "doctor"]);
    expect(doctor.code).toBe(EXIT_CODES.ok);
    expect(doctor.stdout).toContain("integrity OK");
    const show = await cli(["task", "show", "TASK-0001"]);
    expect(show.stdout).toContain("legacy task");

    // workflow show reports the legacy notice (no state, no coercion).
    const wf = await cli(["workflow", "show", "TASK-0001"]);
    expect(wf.code).toBe(EXIT_CODES.ok);
    expect(wf.stdout).toContain("no workflow state");

    // drift check-active is a clean no-op (pre-commit gate stays silent).
    const gate = await cli(["drift", "check-active", "--ci"]);
    expect(gate.code).toBe(EXIT_CODES.ok);

    // pack still works; resume absent → usage (no checkpoint).
    const pack = await cli(["pack", "--max-tokens", "2000"]);
    expect(pack.code).toBe(EXIT_CODES.ok);
    const resume = await cli(["task", "resume", "TASK-0001"]);
    expect(resume.code).toBe(EXIT_CODES.usage);

    // completion gate: legacy rules only (unchecked criteria → blocked).
    await cli(["task", "start", "TASK-0001"]);
    const blocked = await cli(["task", "complete", "TASK-0001"]);
    expect(blocked.code).toBe(EXIT_CODES.usage);
    expect(blocked.stderr).toContain("unchecked acceptance criteria");
    // ...and NO workflow blockers appear for the legacy task.
    expect(blocked.stderr).not.toContain("MISSING_REQUIRED_ARTIFACT");
    expect(blocked.stderr).not.toContain("MISSING_VERIFIER_VERDICT");
  });

  it("determinism: identical repo + config → byte-identical pack output", async () => {
    const a = await cli(["pack", "--max-tokens", "2000", "--format", "json"]);
    const b = await cli(["pack", "--max-tokens", "2000", "--format", "json"]);
    expect(a.stdout).toBe(b.stdout);
  });
});
