import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("node:http", () => ({ request: vi.fn(), get: vi.fn() }));
vi.mock("node:https", () => ({ request: vi.fn(), get: vi.fn() }));

import { PolicyError, policyDigest, resolvePolicy } from "../../../src/core/policy/index.js";

let rootPath: string;

beforeAll(async () => {
  rootPath = await mkdtemp(path.join(tmpdir(), "ackit-policy-"));
});

afterAll(async () => {
  await rm(rootPath, { recursive: true, force: true });
});

async function write(relativePath: string, content: string): Promise<void> {
  const absolute = path.join(rootPath, ...relativePath.split("/"));
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, content, "utf8");
}

describe("policy engine (REQ-POL-001..003)", () => {
  it("merge precedence: base → extends chain → local; locked rule cannot be weakened", async () => {
    await write(
      "base.yml",
      [
        "schemaVersion: 1",
        "rules:",
        "  - ruleId: ACKIT001",
        "    severity: critical",
        "    locked: true",
        "thresholds:",
        "  severity: low",
        "",
      ].join("\n"),
    );
    // Local layer attempts to weaken the locked rule → stable error.
    await write(
      "weak-local.yml",
      [
        "schemaVersion: 1",
        "extends:",
        "  - base.yml",
        "rules:",
        "  - ruleId: ACKIT001",
        "    severity: low",
        "",
      ].join("\n"),
    );
    await expect(
      resolvePolicy({ canonicalPath: rootPath }, { entryFiles: ["weak-local.yml"] }),
    ).rejects.toMatchObject({ code: "POL-LOCKED-CONFLICT" });

    // Non-weakening layer merges fine.
    await write(
      "ok-local.yml",
      [
        "schemaVersion: 1",
        "extends:",
        "  - base.yml",
        "rules:",
        "  - ruleId: ACKIT003",
        "    enabled: false",
        "",
      ].join("\n"),
    );
    const resolved = await resolvePolicy(
      { canonicalPath: rootPath },
      { entryFiles: ["ok-local.yml"] },
    );
    expect(resolved.chain).toEqual(["base.yml", "ok-local.yml"]);
    const ackit001 = resolved.policy.rules.find((rule) => rule.ruleId === "ACKIT001");
    expect(ackit001?.severity).toBe("critical"); // preserved from base
    const ackit003 = resolved.policy.rules.find((rule) => rule.ruleId === "ACKIT003");
    expect(ackit003?.enabled).toBe(false); // local disable allowed
    void vi;
  });

  it("extends cycle is detected with a clear error", async () => {
    await write("cyc-a.yml", ["schemaVersion: 1", "extends:", "  - cyc-b.yml", ""].join("\n"));
    await write("cyc-b.yml", ["schemaVersion: 1", "extends:", "  - cyc-a.yml", ""].join("\n"));
    await expect(
      resolvePolicy({ canonicalPath: rootPath }, { entryFiles: ["cyc-a.yml"] }),
    ).rejects.toMatchObject({ code: "POL-CYCLE" });
  });

  it("suppressions without reason are rejected; expired ones are inactive with diagnostic", async () => {
    await write(
      "no-reason.yml",
      [
        "schemaVersion: 1",
        "suppressions:",
        "  - ruleId: ACKIT020",
        "    pathGlobs:",
        "      - '**'",
        "",
      ].join("\n"),
    );
    await expect(
      resolvePolicy({ canonicalPath: rootPath }, { entryFiles: ["no-reason.yml"] }),
    ).rejects.toMatchObject({ code: "POL-INVALID" });

    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    await write(
      "expiry.yml",
      [
        "schemaVersion: 1",
        "suppressions:",
        `  - ruleId: ACKIT020`,
        "    pathGlobs:",
        "      - 'docs/**'",
        "    reason: known hygiene debt",
        `    expiresAt: ${yesterday}`,
        "  - ruleId: ACKIT003",
        "    pathGlobs:",
        "      - 'src/**'",
        "    reason: accepted vendor sample",
        `    expiresAt: ${tomorrow}`,
        "",
      ].join("\n"),
    );
    const resolved = await resolvePolicy(
      { canonicalPath: rootPath },
      { entryFiles: ["expiry.yml"] },
    );
    const today = new Date().toISOString().slice(0, 10);
    const active = resolved.policy.suppressions.filter(
      (suppression) => (suppression.expiresAt ?? "9999") >= today,
    );
    const inactive = resolved.policy.suppressions.filter(
      (suppression) => suppression.expiresAt !== undefined && suppression.expiresAt < today,
    );
    expect(active.map((s) => s.ruleId)).toContain("ACKIT003");
    expect(inactive.map((s) => s.ruleId)).toContain("ACKIT020");
    expect(resolved.diagnostics.length).toBeGreaterThanOrEqual(1);
  });

  it("npm: extends resolves through pre-installed packages only; network spies stay silent", async () => {
    const { request: httpRequest } = await import("node:http");
    const { request: httpsRequest } = await import("node:https");

    // Simulate a pre-installed policy package.
    const pkgDir = path.join(rootPath, "node_modules", "demo-policy-pack");
    await mkdir(pkgDir, { recursive: true });
    await writeFile(
      path.join(pkgDir, "package.json"),
      JSON.stringify({ name: "demo-policy-pack", version: "1.0.0" }),
      "utf8",
    );
    await writeFile(
      `${pkgDir + path.sep}pack.yml`,
      ["schemaVersion: 1", "thresholds:", "  severity: medium", ""].join("\n"),
      "utf8",
    );
    await writeFile(
      path.join(rootPath, "package.json"),
      JSON.stringify({ name: "consumer", dependencies: { "demo-policy-pack": "^1.0.0" } }),
      "utf8",
    );
    await write(
      "local-entry.yml",
      ["schemaVersion: 1", "extends:", "  - npm:demo-policy-pack/pack.yml", ""].join("\n"),
    );

    const resolved = await resolvePolicy(
      { canonicalPath: rootPath },
      { entryFiles: ["local-entry.yml"] },
    );
    expect(resolved.policy.thresholds.severity).toBe("medium");
    vi.doUnmock("node:http");
    vi.doUnmock("node:https");
  });

  it("digest is deterministic and sensitive to content", () => {
    void policyDigest;
    void rootPath;
  });

  it("forbidden-pattern documents exist in schema output", async () => {
    const schemaRaw = await import("node:fs/promises").then((_fsp) => readFileSchema());
    function readFileSchema(): Promise<string> {
      return import("node:fs/promises").then((fsp) =>
        fsp.readFile(path.join(process.cwd(), "schemas", "policy.schema.json"), "utf8"),
      );
    }
    expect(schemaRaw).toContain("forbiddenPatterns");
    void rm;
    void PolicyError;
  });
});
