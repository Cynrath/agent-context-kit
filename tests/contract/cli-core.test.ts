import { afterEach, describe, expect, it, vi } from "vitest";
import { runCli } from "../../src/cli/index.js";
import { EXIT_CODES } from "../../src/shared/exit-codes.js";
import { getPackageIdentity } from "../../src/shared/version.js";

const ARGV_PREFIX = ["node", "ackit"] as const;

function captureStdout(): { lines(): string; restore(): void } {
  const chunks: string[] = [];
  const original = process.stdout.write.bind(process.stdout);
  vi.spyOn(process.stdout, "write").mockImplementation(((chunk: string) => {
    chunks.push(String(chunk));
    return true;
  }) as typeof process.stdout.write);
  return {
    lines: () => chunks.join(""),
    restore: () => {
      vi.restoreAllMocks();
      void original;
    },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ackit CLI core behavior", () => {
  it("prints a deterministic health summary for the bare command", async () => {
    const captured = captureStdout();
    const code = await runCli([...ARGV_PREFIX]);
    captured.restore();
    expect(code).toBe(EXIT_CODES.ok);
    const output = captured.lines();
    expect(output).toContain(`ackit ${getPackageIdentity().version}`);
    expect(output).toContain("repository health");
  });

  it("emits pure parseable JSON in --json mode", async () => {
    const captured = captureStdout();
    const code = await runCli([...ARGV_PREFIX, "--json"]);
    captured.restore();
    expect(code).toBe(EXIT_CODES.ok);
    const parsed = JSON.parse(captured.lines()) as {
      schemaVersion?: unknown;
      version?: unknown;
      status?: unknown;
    };
    expect(parsed.schemaVersion).toBe("ackit.summary.v0");
    expect(parsed.version).toBe(getPackageIdentity().version);
    expect(parsed.status).toBe("ok");
  });

  it("accepts all documented global options without error", async () => {
    const code = await runCli([
      ...ARGV_PREFIX,
      "--root",
      ".",
      "--config",
      "ackit.yml",
      "--quiet",
      "--no-color",
      "--verbose",
      "--debug",
      "--strict",
    ]);
    expect(code).toBe(EXIT_CODES.ok);
  });

  it("rejects unknown options with exit code 2 (ADR-0007)", async () => {
    const code = await runCli([...ARGV_PREFIX, "--definitely-not-an-option"]);
    expect(code).toBe(EXIT_CODES.usage);
  });

  it("rejects excess positional arguments with exit code 2 (ADR-0007)", async () => {
    const code = await runCli([...ARGV_PREFIX, "not-a-command"]);
    expect(code).toBe(EXIT_CODES.usage);
  });

  it("--version prints the package version and exits 0", async () => {
    const captured = captureStdout();
    const code = await runCli([...ARGV_PREFIX, "--version"]);
    captured.restore();
    expect(code).toBe(EXIT_CODES.ok);
    expect(captured.lines().trim()).toBe(getPackageIdentity().version);
  });
});
