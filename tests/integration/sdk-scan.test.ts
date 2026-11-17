import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { ScanRule } from "../../src/core/scanner/types.js";
import { scanRepository } from "../../src/index.js";

describe("SDK scan built-in catalog contract", () => {
  it("runs built-in rules by default and appends extra rules", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "ackit-sdk-catalog-"));
    try {
      await writeFile(path.join(dir, "sample.txt"), "TODO: review custom-marker\n");
      const baseline = await scanRepository({ canonicalPath: dir });
      expect(baseline.findings.some((finding) => finding.ruleId === "ACKIT020")).toBe(true);
      const custom: ScanRule = {
        id: "CUSTOM001",
        severity: "low",
        category: "hygiene",
        documentationKey: "rules/CUSTOM001",
        remediation: "Review custom marker",
        appliesTo: (file) => file === "sample.txt",
        evaluate: () => [
          {
            ruleId: "CUSTOM001",
            severity: "low",
            category: "hygiene",
            message: "Custom rule ran",
            offset: 0,
            rawEvidence: "custom-marker",
            remediation: "Review custom marker",
            documentationKey: "rules/CUSTOM001",
          },
        ],
      };
      const extended = await scanRepository({ canonicalPath: dir }, { extraRules: [custom] });
      expect(extended.findings.filter((finding) => finding.ruleId !== "CUSTOM001")).toEqual(
        baseline.findings,
      );
      expect(extended.findings.some((finding) => finding.ruleId === "CUSTOM001")).toBe(true);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
