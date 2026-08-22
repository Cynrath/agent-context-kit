import { describe, expect, it } from "vitest";
import { computeFingerprint, redactEvidence } from "../../../src/core/scanner/redact.js";

describe("redactEvidence", () => {
  it("keeps prefix/suffix and masks the middle", () => {
    expect(redactEvidence("ghp_abcdefghijklmnopqrstuvwx")).toBe(`ghp_${"*".repeat(22)}wx`);
  });

  it("masks short values entirely", () => {
    expect(redactEvidence("short")).toBe("*****");
  });

  it("returns empty string for empty evidence", () => {
    expect(redactEvidence("   ")).toBe("");
  });
});

describe("computeFingerprint", () => {
  const base = {
    ruleId: "ACKIT001",
    relativePath: "src/a.ts",
    line: 3,
    column: 7,
    redactedEvidence: "sk**…xy",
  };

  it("is deterministic for identical inputs", () => {
    expect(computeFingerprint(base)).toBe(computeFingerprint({ ...base }));
  });

  it("does not depend on path separators (machine-path independence)", () => {
    expect(computeFingerprint({ ...base, relativePath: "src\\a.ts" })).toBe(
      computeFingerprint(base),
    );
  });

  it("differs across rules, paths and positions", () => {
    const fingerprints = new Set([
      computeFingerprint(base),
      computeFingerprint({ ...base, ruleId: "ACKIT002" }),
      computeFingerprint({ ...base, relativePath: "src/b.ts" }),
      computeFingerprint({ ...base, line: 4 }),
    ]);
    expect(fingerprints.size).toBe(4);
  });
});
