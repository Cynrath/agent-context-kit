import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resolveRepositoryRoot } from "../../../src/core/filesystem/root.js";
import { runScan } from "../../../src/core/scanner/pipeline.js";
import type { ScanRule } from "../../../src/core/scanner/types.js";

const SECRET = "AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY";

const credentialRule: ScanRule = {
  id: "ACKIT901",
  category: "secrets",
  severity: "critical",
  documentationKey: "rules/credential-assignment",
  remediation: "Remove the credential and rotate it.",
  appliesTo: () => true,
  evaluate({ content }) {
    const index = content.indexOf("AWS_SECRET_ACCESS_KEY=");
    if (index === -1) return [];
    const lineEnd = content.indexOf("\n", index);
    const raw = content.slice(index, lineEnd === -1 ? undefined : lineEnd);
    return [
      {
        ruleId: "ACKIT901",
        severity: "critical",
        category: "secrets",
        message: "credential assignment detected",
        relativePath: "", // overwritten below via closure-free approach? keep simple: pipeline uses draft fields
        offset: index,
        rawEvidence: raw,
        remediation: this.remediation,
        documentationKey: this.documentationKey,
      },
    ];
  },
};

let repo: { rootPath: string; cleanup(): Promise<void> };

beforeAll(async () => {
  const rootPath = await mkdtemp(path.join(tmpdir(), "ackit-scan-"));
  repo = { rootPath, cleanup: () => rm(rootPath, { recursive: true, force: true }) };
  await writeFile(path.join(rootPath, ".env.example"), `${SECRET}\n`, "utf8");
  await mkdir(path.join(rootPath, "src"), { recursive: true });
  await writeFile(path.join(rootPath, "src", "clean.ts"), "export const ok = 1;\n", "utf8");
});

afterAll(async () => {
  await repo.cleanup();
});

async function scan(): Promise<Awaited<ReturnType<typeof runScan>>> {
  const resolved = await resolveRepositoryRoot(repo.rootPath);
  if (!resolved.ok) throw new Error(resolved.diagnostic.message);
  return runScan(resolved.root, { rules: [credentialRule] });
}

describe("scan pipeline", () => {
  it("produces contract-valid findings with redacted evidence", async () => {
    const result = await scan();
    expect(result.filesScanned).toBe(2);
    expect(result.findings).toHaveLength(1);
    const finding = result.findings[0];
    expect(finding?.ruleId).toBe("ACKIT901");
    expect(finding?.line).toBe(1);
    expect(finding?.evidence).not.toContain("wJalrXUtnFEMI");
    expect(finding?.evidence.startsWith("AWS_")).toBe(true);
    expect(finding?.fingerprint).toMatch(/^[0-9a-f]{16}$/);
  });

  it("is deterministic across consecutive runs (byte-identical JSON)", async () => {
    const first = await scan();
    const second = await scan();
    const render = (await import("../../../src/core/reporting/json.js")).renderScanJson;
    expect(render(second)).toBe(render(first));
  });

  it("keeps raw secrets out of every rendered output (redaction regression)", async () => {
    const result = await scan();
    const json = (await import("../../../src/core/reporting/json.js")).renderScanJson(result);
    const terminal = (await import("../../../src/core/reporting/terminal.js")).renderScanTerminal(
      result,
    );
    for (const output of [json, terminal]) {
      expect(output).not.toContain("wJalrXUtnFEMI");
      expect(output).not.toContain(SECRET);
      expect(output).not.toContain(path.sep + repo.rootPath.slice(1));
    }
  });

  it("reports aborted=true with structurally valid results when cancelled", async () => {
    const resolved = await resolveRepositoryRoot(repo.rootPath);
    if (!resolved.ok) throw new Error(resolved.diagnostic.message);
    const controller = new AbortController();
    controller.abort();
    const result = await runScan(resolved.root, {
      rules: [credentialRule],
      signal: controller.signal,
    });
    expect(result.aborted).toBe(true);
    const render = (await import("../../../src/core/reporting/json.js")).renderScanJson;
    expect(() => JSON.parse(render(result))).not.toThrow();
  });
});
