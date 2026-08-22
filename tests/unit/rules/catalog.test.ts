import { describe, expect, it } from "vitest";
import { BUILTIN_RULES, SUPPRESSION_ADVISORY_ID } from "../../../src/core/scanner/rules/catalog.js";

describe("built-in rule catalog (REQ-SCAN-003, ADR-0009)", () => {
  it("every rule carries complete metadata", () => {
    for (const rule of BUILTIN_RULES) {
      expect(rule.id).toMatch(/^ACKIT\d{3}$/);
      expect(rule.category).toBeTruthy();
      expect(rule.severity).toBeTruthy();
      expect(rule.documentationKey).toMatch(/^rules\/ACKIT\d{3}$/);
      expect(rule.remediation.length).toBeGreaterThan(10);
      expect(typeof rule.evaluate).toBe("function");
      expect(typeof rule.appliesTo).toBe("function");
    }
  });

  it("ids are unique and cover every documented family block", () => {
    const ids = BUILTIN_RULES.map((rule) => rule.id);
    expect(new Set(ids).size).toBe(ids.length);
    const families = [
      "ACKIT001", // secrets: token formats
      "ACKIT002", // secrets: private key
      "ACKIT003", // secrets: generic credential
      "ACKIT004", // secrets: connection string
      "ACKIT005", // secrets: entropy advisory
      "ACKIT010", // absolute path leakage
      "ACKIT020", // hygiene markers
      "ACKIT040", // large context file
      "ACKIT050", // config problem
      "ACKIT070", // CI/release hygiene
      "ACKIT080", // dependency advisory
    ];
    for (const id of families) {
      expect(ids).toContain(id);
    }
  });

  it("catalog snapshot gates semantic changes (rename/rename requires explicit update)", () => {
    const ids = BUILTIN_RULES.map((rule) => rule.id).sort();
    expect(ids).toMatchInlineSnapshot(`
      [
        "ACKIT001",
        "ACKIT002",
        "ACKIT003",
        "ACKIT004",
        "ACKIT005",
        "ACKIT010",
        "ACKIT020",
        "ACKIT040",
        "ACKIT050",
        "ACKIT070",
        "ACKIT080",
      ]
    `);
  });

  it("suppression advisory id is reserved and never part of the catalog", () => {
    expect(SUPPRESSION_ADVISORY_ID).toBe("ACKIT099");
    expect(BUILTIN_RULES.map((rule) => rule.id)).not.toContain(SUPPRESSION_ADVISORY_ID);
  });
});
