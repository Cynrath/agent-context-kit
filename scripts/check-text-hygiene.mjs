#!/usr/bin/env node
/**
 * Text-hygiene gate (TASK-0075).
 *
 * Rejects unintended C0 control characters (U+0000..U+001F except TAB/LF/CR)
 * and DEL (U+007F) in UTF-8 text inputs. Catches shell/interpolation
 * corruption such as BEL (U+0007) turning `ackit` into `\u0007ckit` in
 * PR/release Markdown before it reaches GitHub.
 *
 * Usage:
 *   node scripts/check-text-hygiene.mjs [--quiet] [--] <file...>     check files
 *   node scripts/check-text-hygiene.mjs --stdin                      check stdin
 *   node scripts/check-text-hygiene.mjs --repo [--quiet]             scan repo text scope
 *
 * Repo scope: *.md *.yml *.yaml *.json *.mjs *.mts *.ts, excluding .git,
 * node_modules, dist, coverage, .ackit, artifacts and backup dirs.
 *
 * Findings print as `<file>:<line>:<col>: U+XXXX (\uXXXX NAME)` — the raw
 * control byte is never echoed. Exit codes: 0 clean, 1 findings, 2 usage/IO.
 * No dependencies, no network.
 */

import { promises as fsp } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ALLOWED = new Set([0x09, 0x0a, 0x0d]); // TAB LF CR
const MAX_FINDINGS_PER_FILE = 20;
const REPO_EXTENSIONS = new Set([".md", ".yml", ".yaml", ".json", ".mjs", ".mts", ".ts"]);
const REPO_EXCLUDE_DIRS = new Set([
  ".git",
  "node_modules",
  "dist",
  "coverage",
  ".ackit",
  "artifacts",
  "Backups",
  "backup",
]);

const CONTROL_NAMES = {
  0: "NUL",
  1: "SOH",
  2: "STX",
  3: "ETX",
  4: "EOT",
  5: "ENQ",
  6: "ACK",
  7: "BEL",
  8: "BS",
  11: "VT",
  12: "FF",
  14: "SO",
  15: "SI",
  16: "DLE",
  17: "DC1",
  18: "DC2",
  19: "DC3",
  20: "DC4",
  21: "NAK",
  22: "SYN",
  23: "ETB",
  24: "CAN",
  25: "EM",
  26: "SUB",
  27: "ESC",
  28: "FS",
  29: "GS",
  30: "RS",
  31: "US",
  127: "DEL",
};

function hex4(code) {
  return code.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * Scan decoded text for forbidden controls. Returns
 * `{ findings, total }` where findings holds at most
 * MAX_FINDINGS_PER_FILE deterministic entries
 * `{ file, line, column, codePoint, escaped, name }`.
 */
export function checkText(content, file) {
  const findings = [];
  let total = 0;
  const text = content.startsWith("\uFEFF") ? content.slice(1) : content;
  const lines = text.split("\n");
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    let column = 0;
    for (const char of lines[lineIndex]) {
      column += 1;
      const code = char.codePointAt(0);
      if (code === undefined) continue;
      const forbidden = (code < 0x20 && !ALLOWED.has(code)) || code === 0x7f;
      if (!forbidden) continue;
      total += 1;
      if (findings.length < MAX_FINDINGS_PER_FILE) {
        findings.push({
          file,
          line: lineIndex + 1,
          column,
          codePoint: `U+${hex4(code)}`,
          escaped: `\\u${hex4(code)}`,
          name: CONTROL_NAMES[code] ?? "C0",
        });
      }
    }
  }
  return { findings, total };
}

export function formatFinding(finding) {
  return `${finding.file}:${finding.line}:${finding.column}: ${finding.codePoint} (${finding.escaped} ${finding.name})`;
}

async function collectRepoFiles(root) {
  const files = [];
  const queue = [root];
  while (queue.length > 0) {
    const dir = queue.pop();
    let entries;
    try {
      entries = await fsp.readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    entries.sort((a, b) => (a.name < b.name ? -1 : 1));
    for (const entry of entries) {
      const absolute = path.join(dir, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        if (dir === root || !REPO_EXCLUDE_DIRS.has(entry.name)) {
          if (dir === root && REPO_EXCLUDE_DIRS.has(entry.name)) continue;
          queue.push(absolute);
        }
        continue;
      }
      if (!entry.isFile()) continue;
      if (REPO_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        files.push(absolute);
      }
    }
  }
  return files.sort();
}

async function checkFile(absolute, label) {
  let content;
  try {
    content = await fsp.readFile(absolute, "utf8");
  } catch (error) {
    return {
      findings: [],
      total: 0,
      error: `ERROR ${label}: ${error?.message || error}`,
    };
  }
  const { findings, total } = checkText(content, label);
  return { findings, total, error: null };
}

function printUsage() {
  process.stdout.write(
    [
      "Usage:",
      "  node scripts/check-text-hygiene.mjs [--quiet] [--] <file...>",
      "  node scripts/check-text-hygiene.mjs --stdin [--quiet]",
      "  node scripts/check-text-hygiene.mjs --repo [--quiet]",
      "",
      "Rejects unintended C0 controls (except TAB/LF/CR) and DEL in UTF-8 text.",
      "Exit codes: 0 clean, 1 findings, 2 usage/IO error.",
      "",
    ].join("\n"),
  );
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

async function main() {
  const rawArgs = process.argv.slice(2);
  let repo = false;
  let stdin = false;
  let quiet = false;
  const files = [];
  for (let i = 0; i < rawArgs.length; i += 1) {
    const arg = rawArgs[i];
    if (arg === "--") {
      for (let j = i + 1; j < rawArgs.length; j += 1) files.push(rawArgs[j]);
      break;
    }
    if (arg === "--repo") repo = true;
    else if (arg === "--stdin" || arg === "-") stdin = true;
    else if (arg === "--quiet") quiet = true;
    else if (arg === "--help" || arg === "-h") {
      printUsage();
      return 0;
    } else if (arg.startsWith("--")) {
      process.stderr.write(`unknown option: ${arg}\n`);
      printUsage();
      return 2;
    } else {
      files.push(arg);
    }
  }

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(scriptDir, "..");
  const targets = [];
  if (repo) {
    if (files.length > 0 || stdin) {
      process.stderr.write("--repo takes no file arguments\n");
      return 2;
    }
    for (const absolute of await collectRepoFiles(repoRoot)) {
      targets.push({
        absolute,
        label: path.relative(repoRoot, absolute).split(path.sep).join("/"),
      });
    }
  } else if (stdin) {
    if (files.length > 0) {
      process.stderr.write("--stdin takes no file arguments\n");
      return 2;
    }
    const content = await readStdin();
    const { findings, total } = checkText(content, "<stdin>");
    for (const finding of findings) process.stdout.write(`${formatFinding(finding)}\n`);
    if (total > findings.length) {
      process.stdout.write(`<stdin>: ... and ${total - findings.length} more finding(s)\n`);
    }
    if (total > 0) {
      process.stdout.write(`text-hygiene: ${total} finding(s) in <stdin>\n`);
      return 1;
    }
    if (!quiet) process.stdout.write("text-hygiene: clean (<stdin>)\n");
    return 0;
  } else {
    if (files.length === 0) {
      printUsage();
      return 2;
    }
    for (const file of files) {
      const absolute = path.resolve(file);
      targets.push({ absolute, label: file.split(path.sep).join("/") });
    }
  }

  let totalFindings = 0;
  let filesWithFindings = 0;
  let ioError = false;
  for (const target of targets) {
    const { findings, total, error } = await checkFile(target.absolute, target.label);
    if (error !== null) {
      process.stderr.write(`${error}\n`);
      ioError = true;
      continue;
    }
    if (total > 0) {
      filesWithFindings += 1;
      totalFindings += total;
      for (const finding of findings) process.stdout.write(`${formatFinding(finding)}\n`);
      if (total > findings.length) {
        process.stdout.write(
          `${target.label}: ... and ${total - findings.length} more finding(s)\n`,
        );
      }
    }
  }

  if (ioError) return 2;
  if (totalFindings > 0) {
    process.stdout.write(
      `text-hygiene: ${totalFindings} finding(s) in ${filesWithFindings} file(s)\n`,
    );
    return 1;
  }
  if (!quiet) {
    const scope = repo ? `repo scope (${targets.length} files)` : `${targets.length} file(s)`;
    process.stdout.write(`text-hygiene: clean (${scope})\n`);
  }
  return 0;
}

const invokedAsScript =
  process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedAsScript) {
  main().then(
    (code) => {
      process.exitCode = code;
    },
    (error) => {
      process.stderr.write(`text-hygiene failed: ${error?.message || error}\n`);
      process.exitCode = 2;
    },
  );
}
