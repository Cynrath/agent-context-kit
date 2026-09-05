#!/usr/bin/env node
/**
 * Maintenance-aware release-state parity guard (TASK-0078, ADR-0029).
 *
 * Four version concepts, asserted in distinct places (never conflated):
 *
 * 1. source/development — `package.json` owns it (e.g. `0.5.0-dev.0` on the
 *    v0.5 line). `extensions/vscode/package.json` must equal it (ADR-0023
 *    coupling) and the `.github/workflows/ci.yml` extension job tracks it
 *    (manifest contract + VSIX filename). This is NOT a public release.
 * 2. published stable — `release-state.json` `publishedStable` owns it
 *    (e.g. `0.4.1`). Current-facing surfaces that make PUBLIC/STABLE claims
 *    (README install pins, release labels/links, getting-started one-shot
 *    pins, VS Code README Marketplace claims) must name it.
 * 3. maintenance — `release-state.json` `maintenanceSeries` (e.g. `0.4.x`):
 *    the long-lived maintenance line(s) that may publish patches while
 *    master develops the next minor. Informational + well-formedness checked.
 * 4. historical — CHANGELOG history, docs/v0.2.0/**, old ADRs, task records,
 *    behavioral baseline pins, API "since" notes, protocol/generation
 *    markers, SARIF 2.1.0. Allowlisted and never scanned, so legitimate
 *    history can never fail the guard.
 *
 * Offline, deterministic, repository-native: no registry/network lookup.
 * The published-stable pointer is a committed file, never a live query.
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
 * Files in this set make PUBLIC/STABLE claims outright, so they must name
 * the published stable version somewhere (install pins, release labels).
 * They MUST NOT be forced to name the source/development version.
 */
export const MUST_SHOW_STABLE = [
  "README.md",
  "docs/guides/getting-started.md",
  "extensions/vscode/README.md",
];

/** Legacy alias (pre-TASK-0078 name for the same file set, now stable-scoped). */
export const MUST_SHOW_CURRENT = MUST_SHOW_STABLE;

/**
 * Files that track the SOURCE version (never the stable pointer): the two
 * manifests (equality-coupled) and the CI extension job (contract + VSIX).
 * Everything else in CURRENT_FILES is stale-checked against stable.
 */
export const SOURCE_TRACKING_FILES = [
  "package.json",
  "extensions/vscode/package.json",
  ".github/workflows/ci.yml",
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
 * - release-debut notes ("released in 0.4.0" = which release introduced the
 *   capability, still true after later releases; NOT a stable claim)
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
  "is RELEASED in `0.4.0`",
  "released in 0.4.0",
];

const VERSION_RE = /\bv?(\d+)\.(\d+)\.(\d+)(?:-[0-9A-Za-z.-]+)?\b/g;
const STABLE_VERSION_RE = /^\d+\.\d+\.\d+$/;
const MAINTENANCE_SERIES_RE = /^\d+\.\d+\.x$/;
/** Stable release tags: exact vX.Y.Z, never a prerelease (mirrors release.yml). */
const STABLE_TAG_RE = /^v\d+\.\d+\.\d+$/;

export function parseVersion(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-[0-9A-Za-z.-]+)?$/.exec(version);
  if (!match) throw new Error(`not a semver version: ${version}`);
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

/** True for development prereleases such as `0.5.0-dev.0` (never stable). */
export function isPrereleaseVersion(version) {
  return String(version).includes("-");
}

/**
 * True only for exact stable release tags (`v0.4.1`). Prerelease-shaped
 * tags (`v0.5.0-dev.0`), bare versions, and partial versions are rejected —
 * the same fail-closed rule as the release.yml step-1 validator, so a
 * prerelease tag can never silently become a normal stable release.
 */
export function isStableReleaseTag(tag) {
  return STABLE_TAG_RE.test(String(tag));
}

export function stripAllowed(content) {
  let out = content;
  for (const needle of STRIP_ALLOWLIST) out = out.split(needle).join("");
  return out;
}

/**
 * Return stale current-facing version references as { line, text } rows.
 * A reference is stale when it names the 0.x line older than `baseline`
 * (older minor, or older patch on the same minor). Newer references
 * (e.g. a `0.5.0-dev.0` source string scanned against the `0.4.1` stable
 * baseline) are never stale. Other majors, protocol generations (v2),
 * schema versions, and SARIF 2.1.0 never match the 0.x rule and are kept.
 */
export function findStaleRefs(content, baseline) {
  const { minor, patch } = parseVersion(baseline);
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

/**
 * Validate a parsed release-state.json value. Returns error strings
 * (empty when valid). The file stays intentionally tiny: exactly the
 * three known fields, a stable (never prerelease) pointer, and
 * well-formed maintenance series entries.
 */
export function validateReleaseState(state) {
  if (state === null || typeof state !== "object" || Array.isArray(state)) {
    return ["release-state.json must be a JSON object"];
  }
  const errors = [];
  if (state.schemaVersion !== 1) {
    errors.push("release-state.json schemaVersion must be 1");
  }
  if (typeof state.publishedStable !== "string" || !STABLE_VERSION_RE.test(state.publishedStable)) {
    errors.push(
      "release-state.json publishedStable must be an exact X.Y.Z stable version (never a prerelease)",
    );
  }
  if (
    !Array.isArray(state.maintenanceSeries) ||
    state.maintenanceSeries.length === 0 ||
    !state.maintenanceSeries.every(
      (entry) => typeof entry === "string" && MAINTENANCE_SERIES_RE.test(entry),
    )
  ) {
    errors.push('release-state.json maintenanceSeries must be a non-empty array like ["0.4.x"]');
  }
  const known = new Set(["schemaVersion", "publishedStable", "maintenanceSeries"]);
  const unknown = Object.keys(state).filter((key) => !known.has(key));
  if (unknown.length > 0) {
    errors.push(`release-state.json has unknown field(s): ${unknown.join(", ")}`);
  }
  return errors;
}

export function readReleaseState() {
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(path.join(repoRoot, "release-state.json"), "utf8"));
  } catch {
    throw new Error("release-state.json is missing or not valid JSON");
  }
  const errors = validateReleaseState(parsed);
  if (errors.length > 0) throw new Error(`invalid release-state.json: ${errors.join("; ")}`);
  return parsed;
}

/** Source/development version owner: package.json (e.g. `0.5.0-dev.0`). */
export function readSourceVersion() {
  const pkg = JSON.parse(readFileSync(path.join(repoRoot, "package.json"), "utf8"));
  if (typeof pkg.version !== "string") throw new Error("package.json has no version");
  return pkg.version;
}

/** Legacy alias (pre-TASK-0078 single-truth name). Prefer readSourceVersion(). */
export function readCurrentVersion() {
  return readSourceVersion();
}

/** Published stable version owner: release-state.json (e.g. `0.4.1`). */
export function readPublishedStable() {
  return readReleaseState().publishedStable;
}

function readRepo(relativePath) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

/**
 * Run the guard. Optional overrides (for contract negative probes only):
 * `{ sourceVersion, releaseState, files }` where `files` maps repo-relative
 * paths to fixture content. Without overrides the working tree is checked.
 */
export function checkParity(overrides = {}) {
  const failures = [];
  const readFile =
    overrides.files !== undefined
      ? (relativePath) => {
          if (!(relativePath in overrides.files)) {
            throw new Error(`probe has no fixture for ${relativePath}`);
          }
          return overrides.files[relativePath];
        }
      : readRepo;

  let source;
  try {
    source = overrides.sourceVersion ?? readSourceVersion();
    parseVersion(source);
  } catch (error) {
    failures.push(`source version unreadable: ${error.message}`);
  }

  let stable;
  try {
    const state = overrides.releaseState ?? readReleaseState();
    const errors = validateReleaseState(state);
    if (errors.length > 0) throw new Error(errors.join("; "));
    stable = state.publishedStable;
  } catch (error) {
    failures.push(`published-stable pointer unreadable: ${error.message}`);
  }

  if (source !== undefined) {
    let extensionVersion;
    try {
      extensionVersion = JSON.parse(readFile("extensions/vscode/package.json")).version;
    } catch (error) {
      failures.push(`extension manifest unreadable: ${error.message}`);
    }
    if (extensionVersion !== undefined && extensionVersion !== source) {
      failures.push(
        `extensions/vscode/package.json version '${extensionVersion}' != package.json '${source}' (ADR-0023 coupling)`,
      );
    }

    let ci = "";
    try {
      ci = readFile(".github/workflows/ci.yml");
    } catch (error) {
      failures.push(`ci workflow unreadable: ${error.message}`);
    }
    if (ci !== "") {
      if (!ci.includes(`'${source}'`)) {
        failures.push(`.github/workflows/ci.yml manifest contract does not assert '${source}'`);
      }
      if (!ci.includes(`ackit-vscode-${source}.vsix`)) {
        failures.push(`.github/workflows/ci.yml VSIX filename does not track '${source}'`);
      }
    }
  }

  if (stable !== undefined) {
    for (const file of MUST_SHOW_STABLE) {
      let content = "";
      try {
        content = readFile(file);
      } catch (error) {
        failures.push(`${file} unreadable: ${error.message}`);
        continue;
      }
      if (!content.includes(stable)) {
        failures.push(`${file} does not name published stable ${stable}`);
      }
    }
  }

  if (source !== undefined && stable !== undefined) {
    for (const file of CURRENT_FILES) {
      let content = "";
      try {
        content = readFile(file);
      } catch {
        continue;
      }
      const baseline = SOURCE_TRACKING_FILES.includes(file) ? source : stable;
      const stale = findStaleRefs(content, baseline);
      for (const row of stale) {
        failures.push(`${file}:${row.line} stale current-facing reference '${row.text}'`);
      }
    }
  }

  return { source, stable, current: source, failures };
}

function main() {
  const { source, stable, failures } = checkParity();
  if (failures.length > 0) {
    console.error(`[version-parity] FAIL — source ${source}, stable ${stable}:`);
    for (const failure of failures) console.error(`  ${failure}`);
    process.exit(1);
  }
  console.log(
    `[version-parity] PASS — source ${source}, stable ${stable}; ${CURRENT_FILES.length} current-facing files clean, extension coupled`,
  );
}

const invokedAsScript =
  typeof process.argv[1] === "string" &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedAsScript) main();
