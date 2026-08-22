import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { runCli } from "../../../src/cli/index.js";
import { EXIT_CODES } from "../../../src/shared/exit-codes.js";

let repo: { rootPath: string; cleanup(): Promise<void> };

beforeAll(async () => {
  const rootPath = await mkdtemp(path.join(tmpdir(), "ackit-cfgcli-"));
  repo = { rootPath, cleanup: () => rm(rootPath, { recursive: true, force: true }) };
});

afterAll(async () => {
  await repo.cleanup();
});

function captureStdout(): { lines(): string } {
  const chunks: string[] = [];
  vi.spyOn(process.stdout, "write").mockImplementation(((chunk: string) => {
    chunks.push(String(chunk));
    return true;
  }) as typeof process.stdout.write);
  return { lines: () => chunks.join("") };
}

describe("ackit config check CLI", () => {
  it("passes on defaults when no config exists (exit 0)", async () => {
    const code = await runCli(["node", "ackit", "--root", repo.rootPath, "config", "check"]);
    expect(code).toBe(EXIT_CODES.ok);
  });

  it("reports pure JSON with ok=true in --json mode", async () => {
    const captured = captureStdout();
    const code = await runCli([
      "node",
      "ackit",
      "--root",
      repo.rootPath,
      "--json",
      "config",
      "check",
    ]);
    vi.restoreAllMocks();
    expect(code).toBe(EXIT_CODES.ok);
    const parsed = JSON.parse(captured.lines()) as {
      schemaVersion?: unknown;
      ok?: unknown;
      digest?: unknown;
    };
    expect(parsed.schemaVersion).toBe("ackit.config-check.v0");
    expect(parsed.ok).toBe(true);
    expect(parsed.digest).toMatch(/^[0-9a-f]{64}$/);
  });

  it("fails with exit 2 and a did-you-mean suggestion on unknown keys", async () => {
    await writeFile(
      path.join(repo.rootPath, "ackit.yml"),
      ["schemaVersion: 1", "scna:", "  severityThreshold: low", ""].join("\n"),
      "utf8",
    );
    const captured = captureStdout();
    const code = await runCli([
      "node",
      "ackit",
      "--root",
      repo.rootPath,
      "--json",
      "config",
      "check",
    ]);
    vi.restoreAllMocks();
    expect(code).toBe(EXIT_CODES.usage);
    const parsed = JSON.parse(captured.lines()) as {
      ok?: unknown;
      errors?: { code?: unknown; suggestion?: unknown; line?: unknown }[];
    };
    expect(parsed.ok).toBe(false);
    expect(parsed.errors?.[0]?.code).toBe("CFG-UNKNOWN-KEY");
    expect(parsed.errors?.[0]?.suggestion).toBe("scan");
    expect(parsed.errors?.[0]?.line).toBe(2);
  });
});
