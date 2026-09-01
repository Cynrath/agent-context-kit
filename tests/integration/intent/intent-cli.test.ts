import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runCli } from "../../../src/cli/index.js";
import { EXIT_CODES } from "../../../src/shared/exit-codes.js";

let rootPath = "";

beforeAll(async () => {
  rootPath = await mkdtemp(path.join(tmpdir(), "ackit-intent-cli-"));
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

describe("ackit intent CLI integration (ADR-0025 §4)", () => {
  it("new → list → show → validate → fingerprint round-trip", async () => {
    const created = await cli(["intent", "new", "intent cli fixture"]);
    expect(created.code).toBe(EXIT_CODES.ok);
    expect(created.stdout).toContain("INTENT-0001");
    expect(created.stdout).toContain("docs/intent/INTENT-0001-intent-cli-fixture.md");

    const list = await cli(["intent", "list"]);
    expect(list.code).toBe(EXIT_CODES.ok);
    expect(list.stdout).toContain("INTENT-0001 [draft]");

    const show = await cli(["intent", "show", "INTENT-0001"]);
    expect(show.code).toBe(EXIT_CODES.ok);
    expect(show.stdout).toContain("intent cli fixture");

    const validate = await cli(["intent", "validate"]);
    expect(validate.code).toBe(EXIT_CODES.ok);
    expect(validate.stdout).toContain("all intents OK");

    const fingerprint = await cli(["intent", "fingerprint", "INTENT-0001"]);
    expect(fingerprint.code).toBe(EXIT_CODES.ok);
    expect(fingerprint.stdout).toMatch(/INTENT-0001: [0-9a-f]{64}/);

    const json = await cli(["--json", "intent", "list"]);
    expect(json.code).toBe(EXIT_CODES.ok);
    const parsed = JSON.parse(json.stdout) as { intents: { id: string }[] };
    expect(parsed.intents[0]?.id).toBe("INTENT-0001");
  });

  it("unknown intent ids fail with usage exit codes", async () => {
    const show = await cli(["intent", "show", "INTENT-9999"]);
    expect(show.code).toBe(EXIT_CODES.usage);
    const fingerprint = await cli(["intent", "fingerprint", "INTENT-9999"]);
    expect(fingerprint.code).toBe(EXIT_CODES.usage);
    const validate = await cli(["intent", "validate", "INTENT-9999"]);
    expect(validate.code).toBe(EXIT_CODES.thresholdExceeded);
  });

  it("empty title is rejected", async () => {
    const created = await cli(["intent", "new", ""]);
    expect(created.code).toBe(EXIT_CODES.usage);
  });
});
