import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("release workflow uses --notes-file from CHANGELOG", () => {
  it("release.yml is tag-only, exact SemVer, OIDC, no long-lived token, and uses --notes-file", () => {
    const raw = readFileSync(".github/workflows/release.yml", "utf8");
    expect(raw).toContain("tags:");
    expect(raw).toContain('"v*.*.*"');
    expect(raw).toContain("^v[0-9]+\\.[0-9]+\\.[0-9]+$");
    expect(raw).toContain("id-token: write");
    expect(raw).not.toContain("NPM_TOKEN");
    expect(raw).not.toContain("NODE_AUTH_TOKEN");
    expect(raw).toContain("--notes-file");
    expect(raw).toContain("extract-changelog-section.mjs");
    expect(raw).toContain("CHANGELOG.md");
    // Must fail if section absent/empty
    expect(raw).toContain("is missing or empty");
    // GitHub Release must be after publish + verification + npx
    const publishIdx = raw.indexOf("Publish to npm via OIDC");
    const releaseIdx = raw.indexOf("Create GitHub Release");
    expect(publishIdx).toBeGreaterThan(-1);
    expect(releaseIdx).toBeGreaterThan(publishIdx);
  });

  it("extract-changelog-section.mjs exists and is testable", () => {
    const script = readFileSync("scripts/extract-changelog-section.mjs", "utf8");
    expect(script).toContain("extractChangelogSection");
    expect(script).toContain("CHANGELOG");
  });
});
