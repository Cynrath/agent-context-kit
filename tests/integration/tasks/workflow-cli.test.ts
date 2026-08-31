import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runCli } from "../../../src/cli/index.js";
import { EXIT_CODES } from "../../../src/shared/exit-codes.js";

let rootPath = "";

beforeAll(async () => {
  rootPath = await mkdtemp(path.join(tmpdir(), "ackit-wf-cli-"));
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
    // runCli parses with { from: "node" }: argv must carry the node/ackit head.
    const code = await runCli(["node", "ackit", "--root", rootPath, ...args]);
    return { code, stdout: chunks.join(""), stderr: errChunks.join("") };
  } finally {
    process.stdout.write = originalWrite;
    process.stderr.write = originalErr;
  }
}

describe("ackit workflow CLI integration (ADR-0025)", () => {
  it("task create → workflow set → show → advance → verify loop", async () => {
    const created = await cli(["task", "create", "workflow integration fixture"]);
    expect(created.code).toBe(EXIT_CODES.ok);
    const match = /TASK-\d{4}/.exec(created.stdout);
    expect(match).not.toBeNull();
    const taskId = match?.[0] ?? "";

    const set = await cli(["workflow", "set", taskId, "--profile", "standard"]);
    expect(set.code).toBe(EXIT_CODES.ok);
    expect(set.stdout).toContain("standard");

    const show = await cli(["workflow", "show", taskId]);
    expect(show.code).toBe(EXIT_CODES.ok);
    expect(show.stdout).toContain("profile standard");

    // intent stage advance requires intent+task artifacts; task exists (doc),
    // intent does not (TASK-0046 ships the store) → blocked with missing artifact
    const blocked = await cli(["workflow", "advance", taskId]);
    expect(blocked.code).toBe(EXIT_CODES.thresholdExceeded);
    expect(blocked.stderr).toContain("missing required artifact");

    const verifyFail = await cli(["workflow", "verify", taskId, "--outcome", "fail"]);
    expect(verifyFail.code).toBe(EXIT_CODES.ok);
    expect(verifyFail.stdout).toContain("fail");

    const showJson = await cli(["--json", "workflow", "show", taskId]);
    expect(showJson.code).toBe(EXIT_CODES.ok);
    const parsed = JSON.parse(showJson.stdout) as { stage: string; profile: string };
    expect(parsed.stage).toBe("implement"); // verify-fail rewind
    expect(parsed.profile).toBe("standard");
  });

  it("refuses unknown profiles and unknown tasks with usage exit codes", async () => {
    const unknownProfile = await cli(["workflow", "set", "TASK-0001", "--profile", "enterprise"]);
    expect(unknownProfile.code).toBe(EXIT_CODES.usage);
    const unknownTask = await cli(["workflow", "set", "TASK-9999", "--profile", "quick"]);
    expect(unknownTask.code).toBe(EXIT_CODES.usage);
    const noState = await cli(["workflow", "advance", "TASK-9999"]);
    expect(noState.code).toBe(EXIT_CODES.usage);
  });

  it("quick profile advances freely (no planning artifacts required)", async () => {
    const created = await cli(["task", "create", "quick flow fixture"]);
    const taskId = /TASK-\d{4}/.exec(created.stdout)?.[0] ?? "";
    await cli(["workflow", "set", taskId, "--profile", "quick"]);
    const advance = await cli(["workflow", "advance", taskId]);
    expect(advance.code).toBe(EXIT_CODES.ok);
    expect(advance.stdout).toContain("implement");
    const advance2 = await cli(["workflow", "advance", taskId]);
    expect(advance2.code).toBe(EXIT_CODES.ok);
    expect(advance2.stdout).toContain("verify");
    const atEnd = await cli(["workflow", "advance", taskId]);
    expect(atEnd.code).toBe(EXIT_CODES.usage); // no stage after verify
  });

  it("legacy task without workflow state shows a legacy notice", async () => {
    const created = await cli(["task", "create", "legacy fixture"]);
    const taskId = /TASK-\d{4}/.exec(created.stdout)?.[0] ?? "";
    const show = await cli(["workflow", "show", taskId]);
    expect(show.code).toBe(EXIT_CODES.ok);
    expect(show.stdout).toContain("no workflow state");
  });
});
