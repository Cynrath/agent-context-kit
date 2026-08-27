import { describe, expect, it } from "vitest";
// @ts-expect-error — JS module without declaration, test covers runtime behavior
import { extractChangelogSection } from "../../scripts/extract-changelog-section.mjs";

const FIXTURE = `
# Changelog

## [0.3.0] - 2026-09-01

### Added

- Future feature

## [0.2.0] - 2026-08-27

### Added

- Feature A

### Fixed

- Fix B

## [0.1.1] - 2026-08-25

### Changed

- Old

## Legacy

- Ancient
`;

describe("changelog extraction", () => {
  it("extracts only 0.2.0 section", () => {
    const section = extractChangelogSection(FIXTURE, "0.2.0");
    expect(section).toContain("## [0.2.0]");
    expect(section).toContain("Feature A");
    expect(section).toContain("Fix B");
    expect(section).not.toContain("## [0.3.0]");
    expect(section).not.toContain("Future feature");
    expect(section).not.toContain("## [0.1.1]");
    expect(section).not.toContain("Legacy");
  });

  it("extracts with v prefix", () => {
    const section = extractChangelogSection(FIXTURE, "v0.2.0");
    expect(section).toContain("## [0.2.0]");
  });

  it("throws if section absent", () => {
    expect(() => extractChangelogSection(FIXTURE, "9.9.9")).toThrow(/not found/);
  });

  it("extracts 0.1.1 correctly", () => {
    const section = extractChangelogSection(FIXTURE, "0.1.1");
    expect(section).toContain("## [0.1.1]");
    expect(section).not.toContain("## [0.2.0]");
  });
});
