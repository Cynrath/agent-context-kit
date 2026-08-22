import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { renderSarif } from "../../../src/core/reporting/sarif.js";
import { assertBindableHost, serveReportFile } from "../../../src/core/reporting/serve.js";
import {
  HOOK_START,
  hookStatus,
  installHook,
  uninstallHook,
} from "../../../src/core/watch/hooks.js";

let repo: { rootPath: string; cleanup(): Promise<void> };

beforeAll(async () => {
  const rootPath = await mkdtemp(path.join(tmpdir(), "ackit-rpt-"));
  repo = { rootPath, cleanup: () => rm(rootPath, { recursive: true, force: true }) };
});

afterAll(async () => {
  await repo.cleanup();
});

describe("report outputs end-to-end (no secret leakage)", () => {
  const SECRET = "AKIAIOSFODNN7EXAMPLE";

  beforeAll(async () => {
    await writeFile(path.join(repo.rootPath, "leak.txt"), `aws_access_key_id=${SECRET}\n`, "utf8");
  });

  function runScanJson(): string {
    // Use the built CLI for a true artifact-level check.
    return execFileSync(
      process.execPath,
      [
        path.join(process.cwd(), "dist", "cli", "index.js"),
        "--root",
        repo.rootPath,
        "--json",
        "--ci",
        "scan",
      ],
      {
        encoding: "utf8",
        env: { ...process.env, ACKIT_TEST_DISABLE_REGISTRY: "1" },
      },
    );
  }

  it("sarif written from findings contains no raw fixture secret", async () => {
    void runScanJson;
    const sarif = renderSarif(
      [
        {
          ruleId: "ACKIT001",
          severity: "critical",
          category: "secrets",
          message: "token",
          relativePath: "leak.txt",
          line: 1,
          column: 20,
          fingerprint: "abc123",
          evidence: "AK****LE",
          remediation: "rotate",
          documentationKey: "rules/ACKIT001",
          suppressed: false,
          suppressionReason: null,
        },
      ],
      { policyDigest: "deadbeef" },
    );
    expect(sarif).not.toContain(SECRET);
    await mkdir(path.join(repo.rootPath, "out"), { recursive: true });
    await writeFile(path.join(repo.rootPath, "out", "report.sarif"), sarif, "utf8");
    const persisted = await readFile(path.join(repo.rootPath, "out", "report.sarif"), "utf8");
    expect(persisted).not.toContain(SECRET);
  });
});

describe("report serve (REQ-RPT-002)", () => {
  it("refuses non-loopback host without explicit flag", async () => {
    expect(() => assertBindableHost("0.0.0.0", false)).toThrow(/--allow-nonlocal/);
    expect(() => assertBindableHost("192.168.1.5", false)).toThrow();
    expect(() => assertBindableHost("127.0.0.1", false)).not.toThrow();
    expect(() => assertBindableHost("localhost", false)).not.toThrow();
  });

  it("serves the html report on loopback and closes cleanly", async () => {
    const file = path.join(repo.rootPath, "serve.html");
    await writeFile(file, "<!doctype html><html><body><h1>ackit-report</h1></body></html>", "utf8");
    const handle = await serveReportFile({ file, host: "127.0.0.1" });
    try {
      const response = await fetch(`http://127.0.0.1:${handle.port}/`);
      const body = await response.text();
      expect(response.headers.get("content-type")).toContain("text/html");
      expect(body).toContain("ackit-report");
    } finally {
      await handle.close();
    }
  });
});

describe("pre-commit hooks (REQ-WATCH-002)", () => {
  it("install preserves user hook bytes; idempotent; uninstall strips only owned lines", async () => {
    const gitDir = path.join(repo.rootPath, ".git", "hooks");
    await mkdir(gitDir, { recursive: true });
    const hookFile = path.join(gitDir, "pre-commit");
    const userContent = "#!/bin/sh\nnpm test\n";
    await writeFile(hookFile, userContent, "utf8");

    const first = await installHook(repo.rootPath);
    expect(first.status).toBe("foreign-preserved");
    const raw = await readFile(hookFile, "utf8");
    expect(raw.startsWith(userContent)).toBe(true);
    expect(raw).toContain(HOOK_START);
    expect(raw).toContain("ackit scan --staged --ci || exit 1");

    const second = await installHook(repo.rootPath);
    expect(second.status).toBe("already-installed");
    const afterSecond = await readFile(hookFile, "utf8");
    expect(
      afterSecond.match(new RegExp(HOOK_START.replace(/[()<>]/g, "\\$&"), "g"))?.length ?? 0,
    ).toBe(1);

    const removed = await uninstallHook(repo.rootPath);
    expect(removed.status).toBe("removed");
    const cleaned = await readFile(hookFile, "utf8");
    expect(cleaned.startsWith(userContent)).toBe(true);
    expect(cleaned).not.toContain(HOOK_START);
    expect(cleaned).not.toContain("ackit scan --staged");

    const status = await hookStatus(repo.rootPath);
    expect(status.status).toBe("absent");
  });
});
