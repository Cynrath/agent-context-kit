import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { findStaleRefs, readCurrentVersion } from "../../scripts/check-version-parity.mjs";

// Deterministic classifier/guard tests (TASK-0073): the guard must catch
// stale CURRENT-facing claims without failing on legitimate history.
const CURRENT = "0.4.0";

describe("version-parity classifier", () => {
  it("flags a stale 0.2.0 current claim", () => {
    const rows = findStaleRefs("ships as the scoped npm package `0.2.0`", CURRENT);
    expect(rows.map((row) => row.text)).toEqual(["0.2.0"]);
  });

  it("flags a stale 0.3.x claim once 0.4.0 is current", () => {
    const rows = findStaleRefs("ackit --version  # 0.3.0", CURRENT);
    expect(rows.map((row) => row.text)).toEqual(["0.3.0"]);
  });

  it("passes the current version itself", () => {
    expect(findStaleRefs("Current: **`0.4.0`** on `master`", CURRENT)).toEqual([]);
  });

  it("keeps historical docs/v0.2.0 path references", () => {
    expect(
      findStaleRefs("see `docs/v0.2.0/REQUIREMENTS.md` for the old contract", CURRENT),
    ).toEqual([]);
  });

  it("keeps the loopback address (not a version)", () => {
    expect(findStaleRefs("dashboard on http://127.0.0.1:54321", CURRENT)).toEqual([]);
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
    expect(findStaleRefs(content, CURRENT)).toEqual([]);
  });

  it("keeps the intentional historical-releases note", () => {
    expect(findStaleRefs("`0.1.1`/`0.1.0` remain as historical releases", CURRENT)).toEqual([]);
  });

  it("keeps behavioral baseline pins and API since-notes", () => {
    const content = [
      "Absent `workflow:` preserves exact v0.3.0 defaults (legacy repos unchanged).",
      "This keeps v0.2.2 behavior for repositories that never configured autonomy.",
      "Evaluates declarative rule packs (exported since v0.2.0).",
      "Merged config (scan + context + policy + readiness (v0.2.0) + profile).",
    ].join("\n");
    expect(findStaleRefs(content, CURRENT)).toEqual([]);
  });

  it("reports the exact line number of a stale hit", () => {
    const rows = findStaleRefs("clean line\nstale 0.3.0 here\n", CURRENT);
    expect(rows).toEqual([{ line: 2, text: "0.3.0" }]);
  });

  it("reads package.json as the single source of truth", () => {
    const pkg = JSON.parse(readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
    expect(readCurrentVersion()).toBe(pkg.version);
  });
});

describe("version-parity guard end-to-end", () => {
  it("check-version-parity.mjs exits 0 on the working tree", () => {
    execFileSync(process.execPath, ["scripts/check-version-parity.mjs"], {
      cwd: process.cwd(),
      stdio: "pipe",
    });
  }, 30000);

  it("extension version is coupled to the package version", () => {
    const root = JSON.parse(readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
    const extension = JSON.parse(
      readFileSync(path.join(process.cwd(), "extensions/vscode/package.json"), "utf8"),
    );
    expect(extension.version).toBe(root.version);
  });
});
