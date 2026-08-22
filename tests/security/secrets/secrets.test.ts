import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resolveRepositoryRoot } from "../../../src/core/filesystem/root.js";
import { renderScanJson, renderScanTerminal } from "../../../src/core/reporting/index.js";
import { runScan } from "../../../src/core/scanner/pipeline.js";
import { builtinRegistry } from "../../../src/core/scanner/rules/catalog.js";

let repo: { rootPath: string; cleanup(): Promise<void> };

const AWS_KEY = "AKIAIOSFODNN7EXAMPLE";
const RAW_SECRET = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY";

beforeAll(async () => {
  const rootPath = await mkdtemp(path.join(tmpdir(), "ackit-secrets-"));
  repo = { rootPath, cleanup: () => rm(rootPath, { recursive: true, force: true }) };
  const r = rootPath;

  // Unknown extension must NOT be excluded (REQ-FS-004 / v1 lesson #3).
  await writeFile(
    path.join(r, "deploy.settings.bak"),
    `aws_access_key_id=${AWS_KEY}\naws_secret_access_key=${RAW_SECRET}\n`,
    "utf8",
  );
  // Private key block.
  await writeFile(
    path.join(r, "id_rsa.enc"),
    "-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA\n-----END RSA PRIVATE KEY-----\n",
    "utf8",
  );
  // Connection string with credentials.
  await writeFile(
    path.join(r, "config.txt"),
    "DATABASE=postgres://admin:s3cr3t-pass@db.internal:5432/prod\n",
    "utf8",
  );
  // Generic credential assignment + inline suppression on next line usage.
  await writeFile(path.join(r, "settings.ini"), "password = hunter2secret\n", "utf8");
  await writeFile(
    path.join(r, "suppressed.env"),
    "# ackit-ignore:ACKIT003 reviewed: placeholder for local dev only\npassword = not-a-real-secret-value\n",
    "utf8",
  );
  // Absolute path leakage.
  await writeFile(
    path.join(r, "notes.md"),
    "Build cache lives at C:\\Users\\gizem\\AppData\\Local\\Temp\\build\n",
    "utf8",
  );
  // Unpinned workflow action.
  await mkdir(path.join(r, ".github", "workflows"), { recursive: true });
  await writeFile(
    path.join(r, ".github", "workflows", "ci.yml"),
    "jobs:\n  build:\n    steps:\n      - uses: actions/checkout@v4\n",
    "utf8",
  );
  // Binary file with embedded secret-like bytes → classifier decision path.
  await writeFile(
    path.join(r, "blob.bin"),
    Buffer.concat([Buffer.from([0x00, 0x01, 0x02]), Buffer.from(`token=${RAW_SECRET}`)]),
  );
});

afterAll(async () => {
  await repo.cleanup();
});

async function scan() {
  const resolved = await resolveRepositoryRoot(repo.rootPath);
  if (!resolved.ok) throw new Error(resolved.diagnostic.message);
  return runScan(resolved.root, { rules: builtinRegistry().getAll() });
}

function ids(result: Awaited<ReturnType<typeof scan>>): Set<string> {
  return new Set(result.findings.map((finding) => finding.ruleId));
}

describe("security fixtures over the catalog", () => {
  it("detects secrets in unknown-extension files", async () => {
    const result = await scan();
    expect(ids(result)).toContain("ACKIT001");
    const finding = result.findings.find(
      (f) => f.ruleId === "ACKIT001" && f.relativePath === "deploy.settings.bak",
    );
    expect(finding).toBeDefined();
    // Redaction regression: raw values never reach any renderer.
    const json = renderScanJson(result);
    const terminal = renderScanTerminal(result);
    for (const output of [json, terminal]) {
      expect(output).not.toContain(RAW_SECRET);
      expect(output).not.toContain(AWS_KEY);
      expect(output).not.toContain("s3cr3t-pass");
      expect(output).not.toContain("hunter2secret");
    }
  });

  it("detects private key blocks and connection strings", async () => {
    const result = await scan();
    expect(ids(result)).toContain("ACKIT002");
    expect(ids(result)).toContain("ACKIT004");
    expect(ids(result)).toContain("ACKIT003"); // settings.ini password assignment
  });

  it("handles binary secret-bearing file per classifier decision with diagnostic", async () => {
    const result = await scan();
    const diagnostic = result.diagnostics.find(
      (entry) => entry.code === "SCAN-BINARY-SKIPPED" && entry.relativePath === "blob.bin",
    );
    expect(diagnostic).toBeDefined();
    // No text rule findings attributed to the binary blob itself.
    expect(result.findings.some((f) => f.relativePath === "blob.bin")).toBe(false);
  });

  it("applies inline suppression but emits the non-suppressible ACKIT099 advisory", async () => {
    const result = await scan();
    const suppressed = result.findings.find(
      (finding) =>
        finding.relativePath === "suppressed.env" &&
        finding.suppressed &&
        finding.ruleId !== "ACKIT099",
    );
    expect(suppressed?.ruleId).toBe("ACKIT003");
    expect(suppressed?.suppressionReason).toContain("ackit-ignore on line 1");
    const advisory = result.findings.find((finding) => finding.ruleId === "ACKIT099");
    expect(advisory).toBeDefined();
    expect(advisory?.suppressed).toBe(false);
  });

  it("flags absolute path leakage and unpinned CI actions", async () => {
    const result = await scan();
    expect(ids(result)).toContain("ACKIT010");
    expect(ids(result)).toContain("ACKIT070");
  });

  it("output stays deterministic across runs (byte-identical JSON)", async () => {
    const first = await scan();
    const second = await scan();
    expect(renderScanJson(second)).toBe(renderScanJson(first));
  });
});
