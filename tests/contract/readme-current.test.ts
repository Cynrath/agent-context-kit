import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Post-release closure, release-proof: current public entry points must state
// current release truth (never a stale line), without hard-coding any version
// here. Exact stale-vs-historical classification lives in
// scripts/check-version-parity.mjs + tests/contract/version-parity.test.ts.
const VERSIONED_CURRENT_FILES = ["README.md", "docs/guides/getting-started.md"];

const VERSION_AGNOSTIC_FILES = ["AGENTS.md", "CLAUDE.md", ".github/copilot-instructions.md"];

function readRepo(file: string): string {
  return readFileSync(path.join(process.cwd(), file), "utf8");
}

function packageVersion(): string {
  const pkg = JSON.parse(readRepo("package.json")) as { version: string };
  return pkg.version;
}

describe("current docs advertise the current release (post-release closure)", () => {
  it.each(VERSIONED_CURRENT_FILES)("%s names the package version", (file) => {
    expect(readRepo(file)).toContain(packageVersion());
  });

  it.each(VERSION_AGNOSTIC_FILES)(
    "%s is version-agnostic or correct (no stale current-release number)",
    (file) => {
      const content = readRepo(file);
      // Instruction files must not present an older line as current truth.
      // Historical path refs (docs/v0.2.0), the intentional
      // historical-releases note, and the historical-directory label are
      // allowed; any other older 0.x is stale.
      const stripped = content
        .split("docs/v0.2.0")
        .join("")
        .split("`0.1.1`/`0.1.0` remain as historical releases")
        .join("")
        .split("v0.2.0 historical contract")
        .join("");
      const [major = 0, minor = 0, patch = 0] = packageVersion().split(".").map(Number);
      const refs = stripped.match(/\bv?0\.(\d+)\.(\d+)\b/g) ?? [];
      for (const ref of refs) {
        const nums = ref.replace(/^v/, "").split(".").map(Number);
        const refMinor = nums[1] ?? 0;
        const refPatch = nums[2] ?? 0;
        const isStale =
          major === 0 && (refMinor < minor || (refMinor === minor && refPatch < patch));
        expect(isStale, `stale current-facing reference ${ref} in ${file}`).toBe(false);
      }
    },
  );

  it.each([
    "README.md",
    "docs/guides/getting-started.md",
    "AGENTS.md",
    "CLAUDE.md",
    ".github/copilot-instructions.md",
  ])("%s does not instruct active use of rebuild/ackit-vnext", (file) => {
    const content = readRepo(file);
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
    const changelog = readRepo("CHANGELOG.md");
    expect(changelog).toContain("## [0.1.1] - 2026-08-25");
  });
});
