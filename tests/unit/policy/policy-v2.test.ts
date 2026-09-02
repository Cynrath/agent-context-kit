import { describe, expect, it } from "vitest";
import {
  ACKIT_BOUNDARY_TIERS,
  AUTONOMY_DEFAULTS,
  type Autonomy,
  checkVerdictAgainstReview,
  evaluateBoundary,
  PolicyDocumentSchema,
  type Review,
  resolveAutonomy,
  resolveReview,
} from "../../../src/core/policy/index.js";

describe("policy v2: risk-tiered autonomy (ADR-0028 §1)", () => {
  it("defaults are deny-leaning at high tiers", () => {
    expect(AUTONOMY_DEFAULTS).toEqual({
      tier0: "allow",
      tier1: "allow",
      tier2: "ask",
      tier3: "ask",
      tier4: "deny",
    });
  });

  it("resolveAutonomy merges layers with defaults; deny wins over later allows", () => {
    const doc: Autonomy = { tier2: "deny" };
    const config: Autonomy = { tier2: "allow", tier3: "deny" };
    const { autonomy } = resolveAutonomy([doc, config]);
    expect(autonomy.tier2).toBe("deny"); // doc deny is sticky
    expect(autonomy.tier3).toBe("deny");
    expect(autonomy.tier0).toBe("allow"); // default
    expect(autonomy.tier4).toBe("deny"); // default
  });

  it("invalid tier values are ignored with diagnostics (never open the gate)", () => {
    const { autonomy, diagnostics } = resolveAutonomy([{ tier2: "yolo" }, { tier9: "allow" }]);
    expect(autonomy.tier2).toBe("ask"); // default preserved
    expect(diagnostics.length).toBeGreaterThan(0);
  });

  it("evaluateBoundary maps ACKit-owned boundaries to tier decisions", () => {
    const allowAll = resolveAutonomy([{ tier2: "allow" }]).autonomy;
    expect(evaluateBoundary("forceCompletion", allowAll).decision).toBe("allow");
    expect(evaluateBoundary("forceCompletion", allowAll).tier).toBe("tier2");
    const denyTier2 = resolveAutonomy([{ tier2: "deny" }]).autonomy;
    expect(evaluateBoundary("forceCompletion", denyTier2).decision).toBe("deny");
    // Every ACKit-owned boundary is tier2 by documented contract; tier4-class
    // actions are refused by governance, never via this table.
    expect(Object.values(ACKIT_BOUNDARY_TIERS).every((tier) => tier === "tier2")).toBe(true);
  });

  it("policy documents accept the additive autonomy/review sections (strict elsewhere)", () => {
    const parsed = PolicyDocumentSchema.parse({
      schemaVersion: 1,
      autonomy: { tier2: "deny" },
      review: { required: ["security", "tests"], blockingSeverity: ["critical"] },
    });
    expect(parsed.autonomy?.tier2).toBe("deny");
    expect(parsed.review?.required).toEqual(["security", "tests"]);
    // Unknown keys still rejected (shell-injection impossible by construction).
    expect(
      PolicyDocumentSchema.safeParse({
        schemaVersion: 1,
        autonomy: { tier2: "deny", command: "rm -rf" },
      }).success,
    ).toBe(false);
  });

  it("documents without v2 sections keep an identical digest input shape", () => {
    const parsed = PolicyDocumentSchema.parse({ schemaVersion: 1 });
    expect(parsed.autonomy).toBeUndefined();
    expect(parsed.review).toBeUndefined();
  });
});

describe("policy v2: review policy (ADR-0028 §2)", () => {
  it("resolveReview merges layers deterministically (sorted, deduped)", () => {
    const a: Review = { required: ["security", "tests"] };
    const b: Review = { required: ["tests", "documentation"], blockingSeverity: ["high"] };
    const { review } = resolveReview([a, b]);
    expect(review.required).toEqual(["documentation", "security", "tests"]);
    expect(review.blockingSeverity).toEqual(["high"]);
  });

  it("checkVerdictAgainstReview flags missing required dimensions", () => {
    const verdict = {
      verdict: "PASS_WITH_WARNINGS",
      findings: [
        { severity: "warning", code: "TEST_COVERAGE_GAP" },
        { severity: "warning", code: "DOC_STALE" },
      ],
    };
    const result = checkVerdictAgainstReview(verdict, {
      required: ["security", "tests", "documentation"],
      blockingSeverity: [],
    });
    expect(result.ok).toBe(false);
    expect(
      result.problems.some((p) =>
        p.includes("REVIEW-DIMENSION-MISSING: required review dimension 'security'"),
      ),
    ).toBe(true);
    // A verdict covering all dimensions passes the coverage check.
    const covered = checkVerdictAgainstReview(
      {
        verdict: "PASS_WITH_WARNINGS",
        findings: [
          { severity: "warning", code: "TEST_COVERAGE_GAP" },
          { severity: "warning", code: "SECURITY_REVIEW_NOTE" },
          { severity: "info", code: "DOC_EXAMPLE_STALE" },
        ],
      },
      { required: ["security", "tests", "documentation"], blockingSeverity: [] },
    );
    expect(covered.ok).toBe(true);
  });
});
