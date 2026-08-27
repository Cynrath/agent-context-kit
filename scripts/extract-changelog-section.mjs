#!/usr/bin/env node
// Extract exact version section from CHANGELOG.md for release notes.
// Usage: node scripts/extract-changelog-section.mjs <version> [changelogPath] [outPath]
// version: "0.2.0" or "v0.2.0"
// changelogPath: default "CHANGELOG.md"
// outPath: default stdout (if not provided, prints to stdout)
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

function extractChangelogSection(changelogContent, version) {
  const cleanVersion = version.replace(/^v/, "");
  // Find heading: ## [0.2.0] or ## [0.2.0] - date or ## 0.2.0
  const headingPattern = new RegExp(
    `^## \\[${cleanVersion.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\]`,
    "m",
  );
  const match = headingPattern.exec(changelogContent);
  if (!match || match.index === undefined) {
    // Try alternative without brackets: ## 0.2.0
    const altPattern = new RegExp(
      `^## ${cleanVersion.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
      "m",
    );
    const altMatch = altPattern.exec(changelogContent);
    if (!altMatch || altMatch.index === undefined) {
      throw new Error(`CHANGELOG section for version ${cleanVersion} not found`);
    }
    return extractFromIndex(changelogContent, altMatch.index);
  }
  return extractFromIndex(changelogContent, match.index);
}

function extractFromIndex(content, startIndex) {
  // Find next heading of same level: ^## [
  const nextHeadingPattern = /^## \[/m;
  // Search from after startIndex + 1
  const afterStart = content.slice(startIndex + 5);
  const nextMatch = nextHeadingPattern.exec(afterStart);
  let endIndex;
  if (nextMatch && nextMatch.index !== undefined) {
    endIndex = startIndex + 5 + nextMatch.index;
  } else {
    endIndex = content.length;
  }
  const section = content.slice(startIndex, endIndex).trim();
  if (section.length === 0) {
    throw new Error("Extracted CHANGELOG section is empty");
  }
  return section;
}

// CLI handling
if (
  import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}` ||
  process.argv[1]?.endsWith("extract-changelog-section.mjs")
) {
  const version = process.argv[2];
  if (!version) {
    console.error(
      "Usage: node scripts/extract-changelog-section.mjs <version> [changelogPath] [outPath]",
    );
    process.exit(1);
  }
  const changelogPath = process.argv[3] ?? "CHANGELOG.md";
  const outPath = process.argv[4];
  let content;
  try {
    content = readFileSync(path.resolve(changelogPath), "utf8");
  } catch (e) {
    console.error(`Failed to read ${changelogPath}: ${e.message}`);
    process.exit(1);
  }
  let section;
  try {
    section = extractChangelogSection(content, version);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
  if (outPath) {
    writeFileSync(path.resolve(outPath), `${section}\n`, "utf8");
  } else {
    process.stdout.write(`${section}\n`);
  }
}

export { extractChangelogSection };
