import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runCli } from "../../../src/cli/index.js";
import { EXIT_CODES } from "../../../src/shared/exit-codes.js";

let rootPath = "";

beforeAll(async () => {
  rootPath = await mkdtemp(path.join(tmpdir(), "ackit-evidence-cli-"));
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

describe("ackit evidence CLI integration (ADR-0026)", () => {
  it("sync → show → verify → validate gate flow (MANDATED: missing evidence denies)", async () => {
    const created = await cli(["task", "create", "evidence cli flow"]);
    expect(created.code).toBe(EXIT_CODES.ok);
    const taskId = /TASK-\d{4}/.exec(created.stdout)?.[0] ?? "";

    const sync = await cli(["evidence", "sync", taskId]);
    expect(sync.code).toBe(EXIT_CODES.ok);
    expect(sync.stdout).toContain("2 criterion");

    const show = await cli(["evidence", "show", taskId]);
    expect(show.code).toBe(EXIT_CODES.ok);
    expect(show.stdout).toContain("AC-001 [unverified]");

    // Mandatory evidence missing → validation fails with exit 1.
    const denied = await cli(["evidence", "validate", taskId]);
    expect(denied.code).toBe(EXIT_CODES.thresholdExceeded);
    expect(denied.stderr).toContain("required_evidence_missing");
    expect(denied.stderr).toContain("criterion_unverified");

    // Manual-only evidence is still insufficient.
    const manual = await cli([
      "evidence",
      "verify",
      taskId,
      "--criterion",
      "AC-001",
      "--type",
      "manual",
      "--ref",
      "eyeballed it",
    ]);
    expect(manual.code).toBe(EXIT_CODES.ok);
    const stillDenied = await cli(["evidence", "validate", taskId]);
    expect(stillDenied.code).toBe(EXIT_CODES.thresholdExceeded);

    // Qualifying evidence for both criteria → gate passes.
    const verify1 = await cli([
      "evidence",
      "verify",
      taskId,
      "--criterion",
      "AC-001",
      "--type",
      "test",
      "--ref",
      "pnpm test (all green)",
    ]);
    expect(verify1.code).toBe(EXIT_CODES.ok);
    const verify2 = await cli([
      "evidence",
      "verify",
      taskId,
      "--criterion",
      "AC-002",
      "--type",
      "build",
      "--ref",
      "pnpm build",
    ]);
    expect(verify2.code).toBe(EXIT_CODES.ok);
    const passed = await cli(["evidence", "validate", taskId]);
    expect(passed.code).toBe(EXIT_CODES.ok);
    expect(passed.stdout).toContain("evidence complete");
  });

  it("forged criterion ids and unknown tasks are refused", async () => {
    const created = await cli(["task", "create", "forgery guard"]);
    const taskId = /TASK-\d{4}/.exec(created.stdout)?.[0] ?? "";
    await cli(["evidence", "sync", taskId]);
    const forged = await cli([
      "evidence",
      "verify",
      taskId,
      "--criterion",
      "AC-999",
      "--type",
      "test",
      "--ref",
      "x",
    ]);
    expect(forged.code).toBe(EXIT_CODES.usage);
    expect(forged.stderr).toContain("evidence-criterion-unknown");
    const unknownTask = await cli(["evidence", "sync", "TASK-9999"]);
    expect(unknownTask.code).toBe(EXIT_CODES.usage);
  });
});
