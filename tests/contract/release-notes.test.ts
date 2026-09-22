import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("release workflow uses --notes-file from CHANGELOG", () => {
  it("release.yml is tag-only, exact SemVer, OIDC npm, no long-lived token, and uses --notes-file", () => {
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
    // GitHub Release must be after manual Marketplace gate + npm publish + re-verification + npx
    const mktGateIdx = raw.indexOf("Manual Marketplace publish gate");
    const publishIdx = raw.indexOf("Publish to npm via OIDC");
    const mktVerifyIdx = raw.indexOf("Verify Marketplace still live after npm");
    const releaseIdx = raw.indexOf("Create GitHub Release");
    expect(mktGateIdx).toBeGreaterThan(-1);
    expect(publishIdx).toBeGreaterThan(mktGateIdx);
    expect(mktVerifyIdx).toBeGreaterThan(publishIdx);
    expect(releaseIdx).toBeGreaterThan(mktVerifyIdx);
    // Release must attach the exact audited VSIX with SHA binding.
    expect(raw).toContain('"' + "$" + '{VSIX_PATH}"');
    expect(raw).toContain("VSIX_SHA256");
  });

  it("extract-changelog-section.mjs exists and is testable", () => {
    const script = readFileSync("scripts/extract-changelog-section.mjs", "utf8");
    expect(script).toContain("extractChangelogSection");
    expect(script).toContain("CHANGELOG");
  });
});
