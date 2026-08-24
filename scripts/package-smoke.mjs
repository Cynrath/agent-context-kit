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

// doctor reports health
const doctorJson = ackit(["--root", fixture, "--json", "doctor"]);
const doctorParsed = JSON.parse(doctorJson);
if (!doctorParsed.ok && !doctorParsed.checks) throw new Error("doctor output invalid");

// task lifecycle: create → list → show → start → complete
const taskCreate = ackit(["--root", fixture, "--json", "task", "create", "smoke-test-task"]);
const taskId = JSON.parse(taskCreate).created;
ackit(["--root", fixture, "task", "start", taskId]);
ackit(["--root", fixture, "--json", "task", "show", taskId]);
const taskList = ackit(["--root", fixture, "--json", "task", "list"]);
JSON.parse(taskList);
// complete should fail (gate blocks unchecked criteria)
try {
  ackit(["--root", fixture, "--json", "task", "complete", taskId]);
  throw new Error("completion gate should have blocked");
} catch {
  // expected — gate blocked
}
// force complete
ackit(["--root", fixture, "--json", "task", "complete", taskId, "--force"]);
ackit(["--root", fixture, "--json", "task", "archive", taskId]);

// pack produces valid JSON with manifest AND canonical context sections/files
const packJson = ackit(["--root", fixture, "--json", "pack", "--max-tokens", "50000"]);
const packParsed = JSON.parse(packJson);
if (!Array.isArray(packParsed.manifest)) throw new Error("pack manifest not an array");
if (!Array.isArray(packParsed.contextSections) || packParsed.contextSections.length === 0)
  throw new Error("pack JSON missing canonical context sections");
if (!Array.isArray(packParsed.files) || packParsed.files.length === 0)
  throw new Error("pack JSON missing included file content");
if (packJson.includes(work)) throw new Error("machine-local absolute path leaked into pack JSON");
const packMarkdown = ackit(["--root", fixture, "pack", "--max-tokens", "50000"]);
if (!packMarkdown.startsWith("# ACKit Context Pack"))
  throw new Error("pack markdown preamble missing");

// policy check passes
ackit(["--root", fixture, "--json", "policy", "check"]);

// ---- Full MCP battery from the INSTALLED package (REQ-MCP-004 / REQ-PKG-001).
const mcpEntry = path.join(pkgDir, "dist", "mcp", "stdio.js");
if (!existsSync(mcpEntry)) throw new Error("installed package lacks dist/mcp/stdio.js");
await import("node:child_process").then(async ({ spawn }) => {
  const child = spawn(process.execPath, [mcpEntry], {
    cwd: fixture,
    env: { ...process.env, ACKIT_ROOT: fixture },
    stdio: ["pipe", "pipe", "pipe"],
  });
  let buffer = "";
  const pending = new Map();
  const stderrChunks = [];
  child.stdout.on("data", (chunk) => {
    buffer += chunk.toString("utf8");
    for (;;) {
      const idx = buffer.indexOf("\n");
      if (idx < 0) break;
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (!line) continue;
      const msg = JSON.parse(line); // throws on protocol-purity violation
      if (msg.id !== undefined && pending.has(msg.id)) {
        pending.get(msg.id)(msg);
        pending.delete(msg.id);
      }
    }
  });
  child.stderr.on("data", (chunk) => stderrChunks.push(chunk.toString("utf8")));
  const nextId = (() => {
    let id = 0;
    return () => ++id;
  })();
  function request(method, params, timeoutMs = 60_000) {
    return new Promise((resolve, reject) => {
      const id = nextId();
      const timer = setTimeout(() => reject(new Error(`MCP ${method} timed out`)), timeoutMs);
      pending.set(id, (msg) => {
        clearTimeout(timer);
        if (msg.error) reject(new Error(`${method} error: ${JSON.stringify(msg.error)}`));
        else resolve(msg.result);
      });
      child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
    });
  }
  function notify(method, params) {
    child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", method, params })}\n`);
  }

  try {
    const initialized = await request("initialize", {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "package-smoke", version: "0.0.1" },
    });
    if (initialized.serverInfo?.name !== "ackit") throw new Error("MCP serverInfo.name mismatch");
    if (initialized.serverInfo?.version !== pkg.version)
      throw new Error(`MCP server version mismatch: ${initialized.serverInfo?.version}`);
    notify("notifications/initialized", {});

    const tools = await request("tools/list", {});
    const toolNames = tools.tools.map((t) => t.name).sort();
    for (const expected of [
      "ackit_scan",
      "ackit_pack",
      "ackit_doctor",
      "ackit_policy_check",
      "ackit_list_tasks",
    ]) {
      if (!toolNames.includes(expected)) throw new Error(`tools/list missing ${expected}`);
    }

    for (const name of ["ackit_scan", "ackit_pack", "ackit_doctor"]) {
      const result = await request("tools/call", { name, arguments: {} });
      if (!Array.isArray(result.content) || result.content.length === 0)
        throw new Error(`tool ${name} returned empty content`);
    }

    const resources = await request("resources/list", {});
    const uris = resources.resources.map((r) => r.uri);
    for (const expected of ["repo://summary", "repo://skills-catalog", "repo://tasks-active"]) {
      if (!uris.includes(expected)) throw new Error(`resources/list missing ${expected}`);
    }
    const summary = await request("resources/read", { uri: "repo://summary" });
    if (!summary.contents?.[0]?.text.includes("instructionNodeCount"))
      throw new Error("repo://summary payload unexpected");

    const prompts = await request("prompts/list", {});
    if (!prompts.prompts.some((p) => p.name === "onboarding"))
      throw new Error("prompts/list missing onboarding");
    const prompt = await request("prompts/get", { name: "onboarding", arguments: {} });
    if (!prompt.messages?.length) throw new Error("onboarding prompt empty");

    // Clean shutdown: closing stdin ends the server with exit code 0.
    const exited = new Promise((resolve) => child.once("exit", (code) => resolve(code)));
    child.stdin.end();
    const exitCode = await exited;
    if (exitCode !== 0) throw new Error(`MCP server exited ${exitCode}`);
  } finally {
    child.kill();
  }
});

console.log(`package smoke OK — ${tarballName} (v${pkg.version})`);
rmSync(work, { recursive: true, force: true });
