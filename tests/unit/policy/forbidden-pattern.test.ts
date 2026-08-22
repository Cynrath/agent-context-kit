import { describe, expect, it } from "vitest";
import { forbiddenPatternToRule } from "../../../src/core/policy/index.js";
import { redactEvidence } from "../../../src/core/scanner/redact.js";
import { FindingSchema } from "../../../src/core/scanner/types.js";

describe("declarative forbidden patterns (REQ-POL-001)", () => {
  const rule = forbiddenPatternToRule({
    id: "ACKIT950",
    pattern: "eval\\(",
    severity: "high",
    message: "dynamic eval() is forbidden by team policy",
  });

  it("fires on fixture content with a contract-valid finding", () => {
    const drafts = rule.evaluate({
      relativePath: "src/legacy.js",
      content: "const x = eval(input); // dynamic\n",
    });
    expect(drafts).toHaveLength(1);
    const draft = drafts[0];
    if (draft === undefined) throw new Error("expected one draft");
    expect(draft?.ruleId).toBe("ACKIT950");
    expect(draft?.rawEvidence).toBe("eval(");
    const finding = FindingSchema.parse({
      ruleId: draft.ruleId,
      severity: draft.severity,
      category: draft.category,
      message: draft.message,
      relativePath: "src/legacy.js",
      line: 1,
      column: (draft.offset ?? 0) + 1,
      fingerprint: "0123456789abcdef",
      evidence: redactEvidence(draft.rawEvidence),
      remediation: draft.remediation,
      documentationKey: draft.documentationKey,
      suppressed: false,
      suppressionReason: null,
    });
    expect(finding.evidence).not.toBe("eval("); // redaction respected
  });

  it("does not fire on clean content", () => {
    expect(rule.evaluate({ relativePath: "x.ts", content: "const x = Number(input);\n" })).toEqual(
      [],
    );
  });
});
