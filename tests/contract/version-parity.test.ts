import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  CURRENT_FILES,
  checkParity,
  findStaleRefs,
  isPrereleaseVersion,
  isStableReleaseTag,
  MUST_SHOW_STABLE,
  readPublishedStable,
  readReleaseState,
  readSourceVersion,
  validateReleaseState,
} from "../../scripts/check-version-parity.mjs";

// Maintenance-aware release-state tests (TASK-0078, ADR-0029): the guard
// distinguishes source/development, published stable, maintenance, and
// historical version concepts. Classifier vectors use explicit baselines;
// tree-coupled probes read the live files so they stay green across
// releases (no hard-coded current version here).
const STABLE_VECTOR = "0.4.1";
const SOURCE_VECTOR = "0.5.0-dev.0";

function readTree(): Record<string, string> {
  const files: Record<string, string> = {};
  for (const file of CURRENT_FILES) {
    files[file] = readFileSync(path.join(process.cwd(), file), "utf8");
  }
  return files;
}

describe("version-parity classifier (stable vs source baselines)", () => {
  it("flags a stale 0.2.0 stable claim", () => {
    const rows = findStaleRefs("ships as the scoped npm package `0.2.0`", STABLE_VECTOR);
    expect(rows.map((row) => row.text)).toEqual(["0.2.0"]);
  });

  it("flags a stale 0.4.0 claim once 0.4.1 is stable (probe A shape)", () => {
    const rows = findStaleRefs(
      "npx --yes @cynrath/agent-context-kit@0.4.0 --version",
      STABLE_VECTOR,
    );
    expect(rows.map((row) => row.text)).toEqual(["0.4.0"]);
  });

  it("passes the stable version itself", () => {
    expect(findStaleRefs("Latest stable: **`0.4.1`** on npm", STABLE_VECTOR)).toEqual([]);
  });

  it("does not mistake the development prerelease for a stale stable ref", () => {
    expect(findStaleRefs("source checkout builds 0.5.0-dev.0", STABLE_VECTOR)).toEqual([]);
    expect(findStaleRefs("Development: 0.5.0-dev.0 on master", SOURCE_VECTOR)).toEqual([]);
  });

  it("documents why baselines differ: stable reads as older-than-source", () => {
    // `0.4.1` IS older than the `0.5.0-dev.0` source line, so stable-scoped
    // files must be checked against the stable baseline — never the source.
    const rows = findStaleRefs("Latest stable: 0.4.1", SOURCE_VECTOR);
    expect(rows.map((row) => row.text)).toEqual(["0.4.1"]);
  });

  it("keeps historical docs/v0.2.0 path references", () => {
    expect(
      findStaleRefs("see `docs/v0.2.0/REQUIREMENTS.md` for the old contract", STABLE_VECTOR),
    ).toEqual([]);
  });

  it("keeps the loopback address (not a version)", () => {
    expect(findStaleRefs("dashboard on http://127.0.0.1:54321", STABLE_VECTOR)).toEqual([]);
  });

  it("keeps protocol/generation markers (not package versions)", () => {
    const content = [
      "Instruction Graph v2",
      "Evidence Contract v2",
      "Policy v2",
      "schemaVersion: 2",
      "SARIF 2.1.0",
      "$schema: https://json.schemastore.org/sarif-2.1.0.json",
    ].join("\n");
    expect(findStaleRefs(content, STABLE_VECTOR)).toEqual([]);
  });

  it("keeps the intentional historical-releases note", () => {
    expect(findStaleRefs("`0.1.1`/`0.1.0` remain as historical releases", STABLE_VECTOR)).toEqual(
      [],
    );
  });

  it("keeps behavioral baseline pins, API since-notes, and release-debut notes", () => {
    const content = [
      "Absent `workflow:` preserves exact v0.3.0 defaults (legacy repos unchanged).",
      "This keeps v0.2.2 behavior for repositories that never configured autonomy.",
      "Evaluates declarative rule packs (exported since v0.2.0).",
      "Merged config (scan + context + policy + readiness (v0.2.0) + profile).",
      "`ackit sync` is RELEASED in `0.4.0` and later.",
      "reconcile assets (released in 0.4.0)",
    ].join("\n");
    expect(findStaleRefs(content, STABLE_VECTOR)).toEqual([]);
  });

  it("reports the exact line number of a stale hit", () => {
    const rows = findStaleRefs("clean line\nstale 0.3.0 here\n", STABLE_VECTOR);
    expect(rows).toEqual([{ line: 2, text: "0.3.0" }]);
  });
});

describe("release-state pointer (published stable + maintenance)", () => {
  it("release-state.json is valid and owns the stable pointer", () => {
    const state = readReleaseState();
    expect(state.schemaVersion).toBe(1);
    expect(state.publishedStable).toMatch(/^\d+\.\d+\.\d+$/);
    expect(isPrereleaseVersion(state.publishedStable)).toBe(false);
    expect(state.maintenanceSeries.length).toBeGreaterThan(0);
    expect(readPublishedStable()).toBe(state.publishedStable);
  });

  it("source version is a (possibly prerelease) semver owned by package.json", () => {
    const pkg = JSON.parse(readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
    expect(readSourceVersion()).toBe(pkg.version);
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/);
  });

  it("rejects a prerelease publishedStable", () => {
    const errors = validateReleaseState({
      schemaVersion: 1,
      publishedStable: "0.5.0-dev.0",
      maintenanceSeries: ["0.4.x"],
    });
    expect(errors.join("; ")).toContain("publishedStable");
  });

  it("rejects malformed maintenance series, schema, and unknown fields", () => {
    expect(
      validateReleaseState({ schemaVersion: 1, publishedStable: "0.4.1", maintenanceSeries: [] }),
    ).not.toEqual([]);
    expect(
      validateReleaseState({
        schemaVersion: 1,
        publishedStable: "0.4.1",
        maintenanceSeries: ["soon"],
      }),
    ).not.toEqual([]);
    expect(
      validateReleaseState({
        schemaVersion: 2,
        publishedStable: "0.4.1",
        maintenanceSeries: ["0.4.x"],
      }),
    ).not.toEqual([]);
    expect(
      validateReleaseState({
        schemaVersion: 1,
        publishedStable: "0.4.1",
        maintenanceSeries: ["0.4.x"],
        sourceVersion: "0.5.0-dev.0",
      }),
    ).not.toEqual([]);
    expect(validateReleaseState(null)).not.toEqual([]);
  });
});

describe("release safety (prerelease tags can never pass as stable)", () => {
  it("accepts only exact vX.Y.Z stable tags", () => {
    for (const tag of ["v0.4.1", "v0.5.0", "v1.0.0", "v12.34.56"]) {
      expect(isStableReleaseTag(tag), `exact tag '${tag}' must pass`).toBe(true);
    }
  });

  it("rejects prerelease-shaped and malformed tags", () => {
    for (const tag of ["v0.5.0-dev.0", "v0.1.1-beta", "v0.5.0-rc.1", "0.4.1", "v0.4", "v1.2.3.4"]) {
      expect(isStableReleaseTag(tag), `tag '${tag}' must fail`).toBe(false);
    }
  });

  it("classifies development versions as prereleases", () => {
    expect(isPrereleaseVersion("0.5.0-dev.0")).toBe(true);
    expect(isPrereleaseVersion("0.4.1")).toBe(false);
  });
});

describe("version-parity guard probes (TASK-0078 A-E)", () => {
  it("probe A: stale stable docs FAIL (README pins 0.4.0 while stable is 0.4.1)", () => {
    const files = readTree();
    const stable = readPublishedStable();
    const readme = files["README.md"] ?? "";
    files["README.md"] = readme.split(stable).join("0.4.0");
    const { failures } = checkParity({ files });
    expect(failures.length).toBeGreaterThan(0);
    expect(failures.some((failure) => failure.startsWith("README.md"))).toBe(true);
  });

  it("probe B: source coupling drift FAILS (extension != development version)", () => {
    const files = readTree();
    const manifest = JSON.parse(files["extensions/vscode/package.json"] ?? "{}");
    manifest.version = "0.4.1";
    files["extensions/vscode/package.json"] = JSON.stringify(manifest);
    const { failures } = checkParity({ files });
    expect(
      failures.some((failure) => failure.includes("ADR-0023 coupling")),
      `expected a coupling failure, got: ${failures.join("; ")}`,
    ).toBe(true);
  });

  it("probe C: stable docs may name stable WITHOUT naming the dev version (PASS)", () => {
    const source = readSourceVersion();
    const stable = readPublishedStable();
    const extensionManifest = JSON.stringify({ version: source });
    const ci = `contract '${source}' and ackit-vscode-${source}.vsix`;
    const files: Record<string, string> = {};
    for (const file of CURRENT_FILES) {
      if (MUST_SHOW_STABLE.includes(file)) {
        files[file] = `stable install @cynrath/agent-context-kit@${stable}`;
      } else if (file === "extensions/vscode/package.json") {
        files[file] = extensionManifest;
      } else if (file === "package.json") {
        files[file] = JSON.stringify({ version: source });
      } else if (file === ".github/workflows/ci.yml") {
        files[file] = ci;
      } else {
        files[file] = "no version claims here";
      }
    }
    const { failures } = checkParity({ files });
    expect(failures).toEqual([]);
  });

  it("probe D: historical references PASS on the live tree", () => {
    const { failures } = checkParity();
    expect(failures).toEqual([]);
  });

  it("probe E: invalid stable pointer FAILS instead of silently passing", () => {
    const files = readTree();
    const { failures } = checkParity({
      files,
      releaseState: {
        schemaVersion: 1,
        publishedStable: "0.5.0-dev.0",
        maintenanceSeries: ["0.4.x"],
      },
    });
    expect(
      failures.some((failure) => failure.includes("published-stable")),
      `expected a stable-pointer failure, got: ${failures.join("; ")}`,
    ).toBe(true);
  });
});

describe("version-parity guard end-to-end", () => {
  it("check-version-parity.mjs exits 0 on the working tree", () => {
    execFileSync(process.execPath, ["scripts/check-version-parity.mjs"], {
      cwd: process.cwd(),
      stdio: "pipe",
    });
  }, 30000);

  it("extension version is coupled to the source version", () => {
    const root = JSON.parse(readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
    const extension = JSON.parse(
      readFileSync(path.join(process.cwd(), "extensions/vscode/package.json"), "utf8"),
    );
    expect(extension.version).toBe(root.version);
    expect(extension.version).toBe(readSourceVersion());
  });

  it("stable docs name the published stable pointer", () => {
    const stable = readPublishedStable();
    for (const file of MUST_SHOW_STABLE) {
      const content = readFileSync(path.join(process.cwd(), file), "utf8");
      expect(content.includes(stable), `${file} must name published stable ${stable}`).toBe(true);
    }
  });
});
