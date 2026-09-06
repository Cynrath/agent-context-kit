import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const DOCS = path.join(process.cwd(), "docs");
const CANONICAL_FILES = [
  "docs/architecture/overview.md",
  "docs/concepts/instruction-graph.md",
  "docs/concepts/context-budget.md",
  "docs/concepts/agent-skills.md",
  "docs/guides/getting-started.md",
  "docs/guides/ci.md",
  "docs/guides/monorepo.md",
  "docs/guides/agent-integration.md",
  "docs/reference/cli.md",
  "docs/reference/config.md",
  "docs/reference/rules.md",
  "docs/reference/exit-codes.md",
  "docs/reference/mcp.md",
  "docs/reference/schemas.md",
  "docs/security/THREAT_MODEL.md",
  "docs/security/SECURITY_MODEL.md",
  "docs/decisions/README.md",
  "docs/history/v1.md",
];

/** MS§26 threat set that THREAT_MODEL must cover explicitly. */
const REQUIRED_THREATS = [
  "malicious instruction",
  "links",
  "exfiltration",
  "poisoning",
  "script",
  "plugin",
  "supply-chain",
  "traversal",
  "leakage",
  "terminal/ANSI injection",
  "exhaustion",
  "cycles",
  "malformed inputs",
  "glob patterns",
  "MCP writes",
];

function readRepo(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath.split("/").join(path.sep)), "utf8");
}

describe("canonical docs gate (REQ-DOC-002/003)", () => {
  it("every canonical doc exists and contains no TODO placeholders", () => {
    for (const file of CANONICAL_FILES) {
      const content = readRepo(file);
      expect(content.length, `${file} empty`).toBeGreaterThan(50);
      // ACKIT020 documents TODO-marker detection; suppressions legitimately
      // use the word "placeholder". Gate only on template-stub patterns.
      expect(/\(placeholder\)|TODO:\s/i.test(content), `template stub in ${file}`).toBe(false);
    }
  });

  it("v1 docs are gone from the final tree (history note remains)", () => {
    expect(() => readRepo("docs/PRODUCT_SPEC.md")).toThrow();
    expect(() => readRepo("docs/RELEASE_CHECKLIST.md")).toThrow();
    const entries = readdirSync(DOCS);
    expect(entries).toEqual(
      expect.arrayContaining([
        "architecture",
        "concepts",
        "guides",
        "reference",
        "security",
        "decisions",
        "history",
        "tasks",
        "rebuild",
      ]),
    );
  });

  it("stale-v1 grep gate: no v1 commands presented as current features in README/docs", () => {
    const readme = readFileSync(path.join(process.cwd(), "README.md"), "utf8");
    for (const stale of ["dotnet ", "nuget install", "AgentContextKit.sln", "ackit webui"]) {
      expect(readme.toLowerCase()).not.toContain(stale.toLowerCase());
    }
    const history = readRepo("docs/history/v1.md");
    expect(history).toContain("immutable"); // legacy note present
  });

  it("THREAT_MODEL covers the MS§26 threat set explicitly", () => {
    const threatModel = readRepo("docs/security/THREAT_MODEL.md").toLowerCase();
    for (const threat of REQUIRED_THREATS) {
      expect(threatModel.includes(threat.toLowerCase()), `threat missing: ${threat}`).toBe(true);
    }
  });

  it("v0.5 public-surface parity: README exposes the current trust chain", () => {
    const readme = readRepo("README.md");
    expect(readme).toContain("ackit status");
    expect(readme).toMatch(/ackit\.handoff\.v2|portable handoff/i);
    expect(readme).toMatch(/state-bound verification/i);
    expect(readme).toMatch(/verifier independence|Verifier Independence/i);
    // Historical v1 authoring references remain allowed elsewhere; the
    // CURRENT feature table must not present v1 as the stored contract.
    expect(readme).not.toMatch(/append-only <code>ackit\.verdict\.v1<\/code> verdicts/);
  });

  it("v0.5 public-surface parity: CLI reference covers status/import/bundle proof", () => {
    const cli = readRepo("docs/reference/cli.md");
    expect(cli).toContain("ackit status [id]");
    expect(cli).toContain("checkpoint import");
    expect(cli).toContain("import <file>");
    expect(cli).toContain("--bundle");
  });

  it("v0.5 public-surface parity: verification concept covers v2 binding", () => {
    const concept = readRepo("docs/concepts/evidence-verification.md");
    expect(concept).toContain("ackit.verification-bundle.v2");
    expect(concept).toContain("ackit.verdict.v2");
    expect(concept).toContain("VERDICT-STATE-STALE");
    expect(concept).toMatch(/independence/i);
    expect(concept).toContain("VERDICT-REPLAY-REJECTED");
  });

  it("v0.5 public-surface parity: checkpoint concept covers handoff v2 + import", () => {
    const concept = readRepo("docs/concepts/checkpoints.md");
    expect(concept).toContain("ackit.handoff.v2");
    expect(concept).toContain("checkpoint import");
  });
});
