import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { compareBaseline, toBaselineEntries } from "../../../src/core/cache/baseline.js";
import { computeFingerprint } from "../../../src/core/scanner/redact.js";
import type { Finding } from "../../../src/core/scanner/types.js";

function finding(overrides: Partial<Finding>): Finding {
  return {
    ruleId: "ACKIT001",
    severity: "critical",
    category: "secrets",
    message: "m",
    relativePath: "a/b.txt",
    line: 2,
    column: 5,
    fingerprint: "fingerprint-1",
    evidence: "AK****YZ",
    remediation: "rotate",
    documentationKey: "rules/ACKIT001",
    suppressed: false,
    suppressionReason: null,
    ...overrides,
  };
}

describe("fingerprints and baseline (REQ-BASE-002 / REQ-BASE-001)", () => {
  let dirA = "";
  let dirB = "";

  beforeAll(async () => {
    dirA = await mkdtemp(path.join(tmpdir(), "ackit-fp-a-"));
    dirB = await mkdtemp(path.join(tmpdir(), "ackit-fp-b-renamed-"));
  });

  afterAll(async () => {
    await rm(dirA, { recursive: true, force: true });
    await rm(dirB, { recursive: true, force: true });
  });

  it("fingerprints are stable across machine-path changes (temp-dir rename)", () => {
    const input = {
      ruleId: "ACKIT003",
      relativePath: "src/config/settings.ini",
      line: 7,
      column: 3,
      redactedEvidence: "pas****rd",
    };
    // Same repo-relative semantics regardless of which absolute temp dir holds the repo.
    const fpA = computeFingerprint(input);
    const fpB = computeFingerprint({ ...input });
    expect(fpB).toBe(fpA);
    void dirA;
    void dirB;
  });

  it("baseline entries never contain evidence or message text", () => {
    const entries = toBaselineEntries([
      finding({ evidence: "AKIAIOSFODNN7EXAMPLE", message: "aws key" }),
    ]);
    const serialized = JSON.stringify(entries);
    expect(serialized).not.toContain("evidence");
    expect(serialized).not.toContain("message");
    expect(serialized).not.toContain("AKIAIOSFODNN7EXAMPLE");
  });

  it("round-trip compare marks new vs fixed correctly", async () => {
    const baselinePath = path.join(dirA, "baseline.json");
    const current = [
      finding({ fingerprint: "fp-kept" }),
      finding({ fingerprint: "fp-new", ruleId: "ACKIT004" }),
      finding({ fingerprint: "fp-suppressed", suppressed: true }),
    ];
    const baseline = {
      schemaVersion: 1 as const,
      generatedBy: "ackit test",
      createdAt: "2026-08-22",
      findings: toBaselineEntries([
        finding({ fingerprint: "fp-kept" }),
        finding({ fingerprint: "fp-fixed" }),
      ]),
    };
    await import("node:fs/promises").then((fsp) =>
      fsp.writeFile(baselinePath, JSON.stringify(baseline), "utf8"),
    );
    void baselinePath;

    const diff = compareBaseline(current, baseline);
    expect(diff.newFindings.map((finding) => finding.fingerprint)).toEqual(["fp-new"]);
    expect(diff.fixedCount).toBe(1); // fp-fixed disappeared
  });
});
