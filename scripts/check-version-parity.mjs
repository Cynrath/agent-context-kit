#!/usr/bin/env node
/**
 * Current-vs-historical version parity guard (TASK-0073).
 *
 * Rule: historical version references are legitimate and must be preserved
 * (CHANGELOG history, docs/v0.2.0/**, old ADRs, task records, behavioral
 * baseline pins, API "since" notes, protocol/generation markers). Old
 * versions must NOT remain as current truth in current-facing surfaces.
 *
 * - `package.json` is the single source of truth for the current version.
 * - `extensions/vscode/package.json` must equal it (ADR-0023 coupling).
 * - CURRENT_FILES must show the current version where they state release
 *   truth and must not claim an older 0.x line as current.
 * - The guard never scans historical paths, lockfiles, or generated output,
 *   so legitimate history can never fail it.
 *
 * Exit 0 when parity holds, 1 with a file:line report otherwise.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

/** Current-facing truth surfaces (relative to repo root). */
export const CURRENT_FILES = [
  "AGENTS.md",
  "CLAUDE.md",
  ".github/copilot-instructions.md",
  "README.md",
  "docs/guides/getting-started.md",
  "docs/guides/agent-integration.md",
  "docs/reference/cli.md",
  "docs/reference/config.md",
  "docs/reference/policy.md",
  "docs/reference/sdk.md",
  "extensions/vscode/README.md",
  "extensions/vscode/package.json",
  "package.json",
  ".github/workflows/ci.yml",
];

/**
 * Files in this set state the current release outright, so they must name
 * the current version somewhere (badges, install pins, metadata).
 */
export const MUST_SHOW_CURRENT = [
  "README.md",
  "docs/guides/getting-started.md",
  "extensions/vscode/README.md",
];

/**
 * Exact substrings stripped before scanning. Each is a reviewed
 * historical/behavioral reference, NOT a current-release claim:
 * - docs/v0.2.0 path references (historical contract directory)
 * - 127.0.0.1 loopback (dashboard bind address, not a version)
 * - historical-releases note (intentional history sentence in shims)
 * - behavioral baseline pins ("keeps vX behavior" = which release fixed the
 *   behavior, still true after later releases)
 * - API "since" notes (which release added the export)
 * - historical directory labels (which release a history directory belongs
 *   to — e.g. the docs-table link label and the AGENTS.md entry-point label)
 */
export const STRIP_ALLOWLIST = [
  // Exact historical phrases first (they contain docs/v0.2.0, so they must
  // be stripped before the generic path entry below).
  "`v0.2.0`: [`docs/v0.2.0/`](docs/v0.2.0/)",
  "v0.2.0 historical contract",
  "docs/v0.2.0",
  "127.0.0.1",
  "`0.1.1`/`0.1.0` remain as historical releases",
  "preserves exact v0.3.0 defaults",
  "keeps v0.2.2 behavior",
  "exported since v0.2.0",
  "readiness (v0.2.0)",
];

const VERSION_RE = /\bv?(\d+)\.(\d+)\.(\d+)(?:-[0-9A-Za-z.-]+)?\b/g;

export function parseVersion(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-[0-9A-Za-z.-]+)?$/.exec(version);
  if (!match) throw new Error(`not a semver version: ${version}`);
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

export function stripAllowed(content) {
  let out = content;
  for (const needle of STRIP_ALLOWLIST) out = out.split(needle).join("");
  return out;
}

/**
 * Return stale current-facing version references as { line, text } rows.
 * A reference is stale when it names the 0.x line older than `current`
 * (older minor, or older patch on the same minor). Other majors, protocol
 * generations (v2), schema versions, and SARIF 2.1.0 never match the 0.x
 * rule and are always kept.
 */
export function findStaleRefs(content, current) {
  const { minor, patch } = parseVersion(current);
  const rows = [];
  const lines = stripAllowed(content).split("\n");
  for (let index = 0; index < lines.length; index++) {
    VERSION_RE.lastIndex = 0;
    let match = VERSION_RE.exec(lines[index]);
    while (match) {
      const major = Number(match[1]);
      const refMinor = Number(match[2]);
      const refPatch = Number(match[3]);
      if (major === 0 && (refMinor < minor || (refMinor === minor && refPatch < patch))) {
        rows.push({ line: index + 1, text: match[0] });
      }
      match = VERSION_RE.exec(lines[index]);
    }
  }
  return rows;
}

export function readCurrentVersion() {
  const pkg = JSON.parse(readFileSync(path.join(repoRoot, "package.json"), "utf8"));
  if (typeof pkg.version !== "string") throw new Error("package.json has no version");
  return pkg.version;
}

function readRepo(relativePath) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

export function checkParity() {
  const failures = [];
  const current = readCurrentVersion();

  const extensionPkg = JSON.parse(readRepo("extensions/vscode/package.json"));
  if (extensionPkg.version !== current) {
    failures.push(
      `extensions/vscode/package.json version '${extensionPkg.version}' != package.json '${current}' (ADR-0023 coupling)`,
    );
  }

  const ci = readRepo(".github/workflows/ci.yml");
  if (!ci.includes(`'${current}'`)) {
    failures.push(`.github/workflows/ci.yml manifest contract does not assert '${current}'`);
  }
  if (!ci.includes(`ackit-vscode-${current}.vsix`)) {
    failures.push(`.github/workflows/ci.yml VSIX filename does not track '${current}'`);
  }

  for (const file of MUST_SHOW_CURRENT) {
    if (!readRepo(file).includes(current)) {
      failures.push(`${file} does not name current version ${current}`);
    }
  }

  for (const file of CURRENT_FILES) {
    const stale = findStaleRefs(readRepo(file), current);
    for (const row of stale) {
      failures.push(`${file}:${row.line} stale current-facing reference '${row.text}'`);
    }
  }

  return { current, failures };
}

function main() {
  const { current, failures } = checkParity();
  if (failures.length > 0) {
    console.error(`[version-parity] FAIL — current version ${current}, stale refs found:`);
    for (const failure of failures) console.error(`  ${failure}`);
    process.exit(1);
  }
  console.log(
    `[version-parity] PASS — current ${current}; ${CURRENT_FILES.length} current-facing files clean, extension coupled`,
  );
}

const invokedAsScript =
  typeof process.argv[1] === "string" &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedAsScript) main();
