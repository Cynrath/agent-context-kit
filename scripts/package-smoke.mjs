#!/usr/bin/env node
// Packs the project and installs the tarball into a temp dir, then smokes the
// installed CLI: --version / --help / config check / doctor / scan on a fixture.
// Usage: node scripts/package-smoke.mjs   (requires prior `pnpm build`)
import { execFileSync, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const repoRoot = path.resolve(
  path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")),
  "..",
);
const pkg = JSON.parse(readFileSync(path.join(repoRoot, "package.json"), "utf8"));
const work = mkdtempSync(path.join(tmpdir(), "ackit-pkg-smoke-"));

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { encoding: "utf8", ...opts });
  if (res.status !== 0) {
    throw new Error(
      `${cmd} ${args.join(" ")} failed (${res.status}):\n${res.stdout}\n${res.stderr}`,
    );
  }
  return res;
}

// 1) Pack.
const PNPM = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
execFileSync(PNPM, ["pack", "--pack-destination", work], {
  cwd: repoRoot,
  encoding: "utf8",
  shell: process.platform === "win32",
});
const tarballName = readdirSync(work).find((entry) => entry.endsWith(".tgz"));
if (!tarballName) throw new Error("pack produced no tarball");
const tarball = path.join(work, tarballName);
if (!existsSync(tarball)) throw new Error(`tarball not found: ${tarball}`);

// 2) Install into an isolated consumer project.
const consumer = path.join(work, "consumer");
mkdirSync(consumer, { recursive: true });
writeFileSync(
  path.join(consumer, "package.json"),
  JSON.stringify({ name: "smoke-consumer", private: true }, null, 2),
);
const NPM = process.platform === "win32" ? "npm.cmd" : "npm";
run(NPM, ["install", "--no-audit", "--no-fund", tarball], {
  cwd: consumer,
  shell: process.platform === "win32",
});

const pkgDir = path.join(consumer, "node_modules", "@cynrath", "agent-context-kit");
if (!existsSync(pkgDir)) throw new Error("package not installed into consumer");
const ackitEntry = path.join(pkgDir, "dist", "cli", "index.js");

// 3) Fixture repo for scan/doctor checks.
const fixture = path.join(work, "fixture");
mkdirSync(path.join(fixture, ".agents", "skills", "demo"), { recursive: true });
writeFileSync(path.join(fixture, "AGENTS.md"), "# fixture\nUse pnpm as the package manager.\n");
writeFileSync(
  path.join(fixture, ".agents", "skills", "demo", "SKILL.md"),
  "---\nname: demo\ndescription: demo skill\n---\nbody\n",
);

function ackit(args) {
  return execFileSync(process.execPath, [ackitEntry, ...args], {
    encoding: "utf8",
    env: { ...process.env, ACKIT_ROOT: fixture },
    cwd: fixture,
  });
}

// --version matches source package.json exactly (single source of truth).
const versionOut = ackit(["--version"]).trim();
if (versionOut !== pkg.version)
  throw new Error(`version mismatch: ${versionOut} != ${pkg.version}`);

// --help lists core commands.
const helpOut = ackit(["--help"]);
for (const command of [
  "scan",
  "init",
  "pack",
  "instructions",
  "skills",
  "task",
  "policy",
  "doctor",
  "config",
]) {
  if (!helpOut.includes(command)) throw new Error(`--help missing command '${command}'`);
}

// config check on defaults passes; scan on clean fixture exits 0 with JSON.
ackit(["--root", fixture, "--json", "config", "check"]);
const scanJson = ackit(["--root", fixture, "--json", "scan"]);
JSON.parse(scanJson);

// skills validate clean on installed layout? (fixture has valid skill)
const skillsJson = ackit(["--root", fixture, "--json", "skills", "validate"]);
JSON.parse(skillsJson);

console.log(`package smoke OK — ${tarballName} (v${pkg.version})`);
rmSync(work, { recursive: true, force: true });
