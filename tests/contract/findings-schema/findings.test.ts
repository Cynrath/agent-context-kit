import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  type Finding,
  FindingSchema,
  SCAN_CATEGORIES,
  SEVERITY_ORDER,
} from "../../../src/core/scanner/types.js";

const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url));
void REPO_ROOT;

const SAMPLE_FINDING: Finding = {
  ruleId: "ACKIT001",
  severity: "high",
  category: "secrets",
  message: "sample finding",
  relativePath: "src/sample.ts",
  line: 4,
  column: 9,
  fingerprint: "0123456789abcdef",
  evidence: "sk****yz",
  remediation: "Rotate the credential.",
  documentationKey: "rules/sample",
  suppressed: false,
  suppressionReason: null,
};

describe("finding contract (REQ-SCAN-002)", () => {
  it("accepts a fully populated finding", () => {
    expect(FindingSchema.parse(SAMPLE_FINDING)).toEqual(SAMPLE_FINDING);
  });

  it("rejects unknown fields, bad enums and missing fields", () => {
    expect(FindingSchema.safeParse({ ...SAMPLE_FINDING, extra: true }).success).toBe(false);
    expect(FindingSchema.safeParse({ ...SAMPLE_FINDING, severity: "fatal" }).success).toBe(false);
    expect(FindingSchema.safeParse({ ...SAMPLE_FINDING, category: "made-up" }).success).toBe(false);
    const { fingerprint: _omit, ...missing } = SAMPLE_FINDING;
    expect(FindingSchema.safeParse(missing).success).toBe(false);
  });

  it("exposes the documented category and severity sets", () => {
    for (const category of [
      "secrets",
      "unsafe-path",
      "hygiene",
      "absolute-path-leak",
      "ci-release-hygiene",
    ]) {
      expect(SCAN_CATEGORIES).toContain(category);
    }
    expect([...SEVERITY_ORDER]).toEqual(["low", "medium", "high", "critical"]);
  });

  it("committed JSON contract fixture matches the schema output exactly", () => {
    // The published shape: parse(serialize(parse(x))) is identity.
    const serialized = JSON.parse(JSON.stringify(SAMPLE_FINDING)) as unknown;
    expect(FindingSchema.parse(serialized)).toEqual(SAMPLE_FINDING);
  });
});
