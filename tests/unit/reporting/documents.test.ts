import { describe, expect, it } from "vitest";
import { renderHtmlReport, renderMarkdownReport } from "../../../src/core/reporting/documents.js";
import { renderSarif } from "../../../src/core/reporting/sarif.js";
import type { Finding } from "../../../src/core/scanner/types.js";

const FIXTURE: Finding[] = [
  {
    ruleId: "ACKIT001",
    severity: "critical",
    category: "secrets",
    message: "token found",
    relativePath: "src/a.ts",
    line: 4,
    column: 9,
    fingerprint: "0123456789abcdef",
    evidence: "AK****LE",
    remediation: "rotate",
    documentationKey: "rules/ACKIT001",
    suppressed: false,
    suppressionReason: null,
  },
  {
    ruleId: "ACKIT020",
    severity: "low",
    category: "hygiene",
    message: "TODO marker",
    relativePath: "docs\\b.md",
    line: 2,
    column: 1,
    fingerprint: "fedcba9876543210",
    evidence: "TODO x",
    remediation: "resolve",
    documentationKey: "rules/ACKIT020",
    suppressed: true,
    suppressionReason: "inline ackit-ignore on line 1",
  },
];

describe("SARIF writer (REQ-RPT-001)", () => {
  const sarif = JSON.parse(renderSarif(FIXTURE)) as {
    version?: string;
    runs?: Array<{
      tool?: { driver?: { name?: string; rules?: Array<{ id: string }> } };
      results?: Array<{
        ruleId?: string;
        level?: string;
        locations?: Array<{
          physicalLocation?: {
            artifactLocation?: { uri?: string };
            region?: { startLine?: number; startColumn?: number };
          };
        }>;
        fingerprints?: Record<string, string>;
      }>;
    }>;
  };

  it("declares SARIF 2.1.0 with driver metadata", () => {
    expect(sarif.version).toBe("2.1.0");
    expect(sarif.runs?.[0]?.tool?.driver?.name).toBe("ackit");
    const ruleIds = sarif.runs?.[0]?.tool?.driver?.rules?.map((rule) => rule.id);
    expect(ruleIds).toContain("ACKIT001");
    expect(ruleIds).toContain("ACKIT020");
  });

  it("maps levels, repo-relative URIs and regions correctly", () => {
    const first = sarif.runs?.[0]?.results?.[0];
    expect(first?.level).toBe("error"); // critical
    expect(first?.locations?.[0]?.physicalLocation?.artifactLocation?.uri).toBe("src/a.ts");
    expect(first?.locations?.[0]?.physicalLocation?.region?.startLine).toBe(4);
    expect(first?.locations?.[0]?.physicalLocation?.region?.startColumn).toBe(9);
    expect(Object.values(first?.fingerprints ?? {})).toContain("0123456789abcdef");

    const second = sarif.runs?.[0]?.results?.[1];
    expect(second?.level).toBe("note"); // low
    // Backslash paths normalized to forward slashes.
    expect(second?.locations?.[0]?.physicalLocation?.artifactLocation?.uri).toBe("docs/b.md");
  });
});

describe("markdown + html reports (REQ-SCAN-007 / REQ-RPT-002)", () => {
  it("markdown contains severity table and finding entries", () => {
    const md = renderMarkdownReport(FIXTURE, { filesScanned: 12, policyDigest: "abc123" });
    expect(md).toContain("| Severity | Count |");
    expect(md).toContain("**ACKIT001**");
    expect(md).toContain("`src/a.ts:4:9`");
    expect(md).toContain("abc123");
  });

  it("html is self-contained with no external URLs (offline regex gate)", () => {
    const html = renderHtmlReport(FIXTURE, { filesScanned: 3 });
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(/<link\s/i.test(html)).toBe(false);
    expect(/<script[\s>]/i.test(html)).toBe(false);
    expect(/(src|href)\s*=\s*["']https?:\/\//i.test(html)).toBe(false);
    expect(html).toContain("ACKIT001");
    expect(html).not.toContain("wJalrXUtnFEMI"); // no raw secrets by construction
  });

  it("escapes html-sensitive characters in messages", () => {
    const escaped = renderHtmlReport(
      [
        {
          ...FIXTURE[0]!,
          message: '"><script>alert(1)</script>',
        },
      ],
      { filesScanned: 1 },
    );
    expect(escaped).not.toContain('"><script>');
    expect(escaped).toContain("&lt;script&gt;");
  });
});
