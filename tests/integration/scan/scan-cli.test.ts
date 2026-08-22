import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { runCli } from "../../../src/cli/index.js";
import { defaultRegistry } from "../../../src/core/scanner/index.js";
import type { ScanRule } from "../../../src/core/scanner/types.js";
import { EXIT_CODES } from "../../../src/shared/exit-codes.js";

const markerRule: ScanRule = {
  id: "ACKIT902",
  category: "hygiene",
  severity: "medium",
  documentationKey: "rules/marker",
  remediation: "Remove the marker.",
  appliesTo: () => true,
  evaluate({ content }) {
    const index = content.indexOf("MARKER-TOKEN");
    if (index === -1) return [];
    return [
      {
        ruleId: this.id,
        severity: this.severity,
        category: this.category,
        message: "marker token present",
        offset: index,
        rawEvidence: content.slice(index, index + 20),
        remediation: this.remediation,
        documentationKey: this.documentationKey,
      },
    ];
  },
};

let repo: { rootPath: string; cleanup(): Promise<void> };

beforeAll(async () => {
  const rootPath = await mkdtemp(path.join(tmpdir(), "ackit-scancmd-"));
  repo = { rootPath, cleanup: () => rm(rootPath, { recursive: true, force: true }) };
});

afterAll(async () => {
  defaultRegistry.unregister(markerRule.id);
  await repo.cleanup();
});

function captureStd(): { out(): string; err(): string } {
  const stdoutChunks: string[] = [];
  const stderrChunks: string[] = [];
  vi.spyOn(process.stdout, "write").mockImplementation(((chunk: string) => {
    stdoutChunks.push(String(chunk));
    return true;
  }) as typeof process.stdout.write);
  vi.spyOn(process.stderr, "write").mockImplementation(((chunk: string) => {
    stderrChunks.push(String(chunk));
    return true;
  }) as typeof process.stderr.write);
  return {
    out: () => stdoutChunks.join(""),
    err: () => stderrChunks.join(""),
  };
}

describe("ackit scan command", () => {
  it("exits 0 on a clean repository with pure JSON stdout", async () => {
    await writeFile(path.join(repo.rootPath, "ok.txt"), "nothing here\n", "utf8");
    defaultRegistry.register(markerRule);
    const captured = captureStd();
    try {
      const code = await runCli(["node", "ackit", "--root", repo.rootPath, "--json", "scan"]);
      expect(code).toBe(EXIT_CODES.ok);
      const parsed = JSON.parse(captured.out()) as {
        schemaVersion?: unknown;
        summary?: { totalFindings?: unknown; filesScanned?: unknown };
      };
      expect(parsed.schemaVersion).toBe("ackit.scan.v0");
      expect(parsed.summary?.totalFindings).toBe(0);
      expect(parsed.summary?.filesScanned).toBeGreaterThan(0);
    } finally {
      vi.restoreAllMocks();
    }
  });

  it("invalid config yields exit 2 and structured stderr diagnostics", async () => {
    await writeFile(path.join(repo.rootPath, "ackit.yml"), "schemaVersion: 99\n", "utf8");
    const captured = captureStd();
    try {
      const code = await runCli(["node", "ackit", "--root", repo.rootPath, "scan"]);
      expect(code).toBe(EXIT_CODES.usage);
      expect(captured.err()).toContain("CFG-SCHEMA-VERSION");
    } finally {
      vi.restoreAllMocks();
    }
  });

  it("redacts matched secret values in --json output (no raw leak)", async () => {
    await rm(path.join(repo.rootPath, "ackit.yml"), { force: true });
    await writeFile(path.join(repo.rootPath, ".env"), "MARKER-TOKEN=s3cr3t-value-123456\n", "utf8");
    const captured = captureStd();
    try {
      const code = await runCli([
        "node",
        "ackit",
        "--root",
        repo.rootPath,
        "--json",
        "scan",
        "--ci",
      ]);
      const output = captured.out();
      expect(code).toBe(EXIT_CODES.thresholdExceeded);
      expect(output).not.toContain("s3cr3t-value");
      const parsed = JSON.parse(output) as {
        findings?: { evidence?: unknown; relativePath?: unknown }[];
      };
      expect(parsed.findings).toHaveLength(1);
      expect(parsed.findings?.[0]?.relativePath).toBe(".env");
    } finally {
      vi.restoreAllMocks();
    }
  });
});
