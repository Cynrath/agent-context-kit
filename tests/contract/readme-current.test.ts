import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Targeted allowlist: current public entry points must advertise 0.2.0 and not instruct active use of retired branch.
// Historical documents (CHANGELOG 0.1.1, docs/rebuild, old TASK evidence) are exempt.
const CURRENT_FILES = [
  "README.md",
  "docs/guides/getting-started.md",
  "AGENTS.md",
  "CLAUDE.md",
  ".github/copilot-instructions.md",
];

describe("current docs advertise 0.2.0 (post-release closure)", () => {
  it.each(CURRENT_FILES)("%s contains 0.2.0", (file) => {
    const content = readFileSync(file, "utf8");
    expect(content).toContain("0.2.0");
  });

  it.each(CURRENT_FILES)("%s does not instruct active use of rebuild/ackit-vnext", (file) => {
    const content = readFileSync(file, "utf8");
    // Ensure no current-workflow line still says "Normal fast-forward pushes to rebuild/ackit-vnext are allowed"
    expect(content).not.toContain(
      "Normal fast-forward pushes to `rebuild/ackit-vnext` are allowed",
    );
    // Allow historical "retired" mention but not active instruction without negation
    const hasActiveWithoutRetired =
      content.includes("rebuild/ackit-vnext") &&
      !content.includes("retired") &&
      /push to.*rebuild\/ackit-vnext/i.test(content);
    expect(hasActiveWithoutRetired).toBe(false);
  });

  it("CHANGELOG 0.1.1 section is preserved (historical)", () => {
    const changelog = readFileSync("CHANGELOG.md", "utf8");
    expect(changelog).toContain("## [0.1.1] - 2026-08-25");
  });
});
