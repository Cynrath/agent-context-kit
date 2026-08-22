#!/usr/bin/env node
// Verifies README quickstart commands against a clean fixture repo and writes
// a transcript to a temp dir. Run: node scripts/doc-verify.mjs
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const repoRoot = path.resolve(
  path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")),
  "..",
);
const cli = path.join(repoRoot, "dist", "cli", "index.js");
const outDir = mkdtempSync(path.join(tmpdir(), "ackit-doc-verify-out-"));
const fixture = path.join(tmpdir(), `ackit-doc-verify-${Date.now()}`);
mkdirSync(fixture, { recursive: true });
const transcript = [];
const note = (line) => transcript.push(line);

function run(args, expectExit = 0) {
  const res = spawnSync(process.execPath, [cli, ...args], {
    encoding: "utf8",
    cwd: fixture,
    env: { ...process.env, ACKIT_ROOT: fixture },
  });
  const ok = (res.status ?? -1) === expectExit;
  note(`$ ackit ${args.join(" ")} → exit ${res.status} (${ok ? "ok" : "UNEXPECTED"})`);
  if (!ok) throw new Error(`command failed: ackit ${args.join(" ")}`);
  return res.stdout;
}

note(`# doc verification — fixture ${fixture}`);
run(["--version"]);
run(["init", "--dry-run"]);
run(["skills", "install"]);
writeFileSync(path.join(fixture, "sample.txt"), "// TODO verify markers\n", "utf8");
run(["scan"]); // report-only: exit 0 with findings
const scanJson = run(["scan", "--json"]);
JSON.parse(scanJson);
run(["instructions", "--json"]);
const pack = run(["pack", "--format", "json", "--max-tokens", "20000"]);
JSON.parse(pack);
run(["config", "check"]);
run(["task", "create", "doc verification task"]);
run(["task", "list"]);

mkdirSync(path.join(repoRoot, "artifacts"), { recursive: true });
writeFileSync(path.join(outDir, "doc-verify.txt"), `${transcript.join("\n")}\n`, "utf8");
console.log(`doc verification OK; transcript at ${path.join(outDir, "doc-verify.txt")}`);
rmSync(fixture, { recursive: true, force: true });
// keep outDir transcript on disk for evidence
