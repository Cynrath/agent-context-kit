#!/usr/bin/env node
// End-to-end scaffold smoke over the real built artifact (tests/e2e/cli-scaffold.smoke.mjs).
// Run after `pnpm build`. Exits non-zero on first failed assertion.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const cli = `${repoRoot}dist/cli/index.js`;
const pkg = JSON.parse(readFileSync(`${repoRoot}package.json`, "utf8"));

function run(args) {
  return execFileSync(process.execPath, [cli, ...args], { encoding: "utf8" });
}

function runExpectingUsageExit(args) {
  try {
    execFileSync(process.execPath, [cli, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    return error.status;
  }
  return 0;
}

const versionOut = run(["--version"]);
assert.equal(versionOut.trim(), pkg.version, "--version must print package.json version");

const jsonOut = run(["--json"]);
const parsed = JSON.parse(jsonOut);
assert.equal(parsed.schemaVersion, "ackit.summary.v0");
assert.equal(parsed.version, pkg.version);

const summary = run([]);
assert.match(summary, /^ackit \d+\.\d+\.\d+/, "bare command prints deterministic version line");

assert.equal(runExpectingUsageExit(["--bogus-flag"]), 2, "unknown option exits 2 per ADR-0007");

console.log("cli-scaffold smoke: all assertions passed");
