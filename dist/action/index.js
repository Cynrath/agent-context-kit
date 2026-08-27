#!/usr/bin/env node
// Minimal GitHub Action runtime for ACKit (TASK-0014)
// Uses @actions/core if available, else fallback to console. No shell interpolation, uses execFile.
import { spawnSync } from "node:child_process";
import { writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";

function getInput(name) {
  const envName = `INPUT_${name.replace(/ /g, "_").toUpperCase().replace(/-/g, "_")}`;
  return process.env[envName] ?? "";
}

function safeSplitArgs(input) {
  if (!input || input.trim() === "") return [];
  // Simple shell-like split respecting double quotes, no evaluation
  const args = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (c === '"' && (i === 0 || input[i - 1] !== "\\")) {
      inQuote = !inQuote;
      continue;
    }
    if (c === " " && !inQuote) {
      if (cur.length > 0) {
        args.push(cur);
        cur = "";
      }
      continue;
    }
    cur += c;
  }
  if (cur.length > 0) args.push(cur);
  return args;
}

function severityRank(s) {
  const map = { low: 1, medium: 2, high: 3, critical: 4 };
  return map[s?.toLowerCase()] ?? 0;
}

async function run() {
  const command = getInput("command") || "scan";
  const argsRaw = getInput("args") || "";
  const failThreshold = getInput("fail-threshold") || "high";
  const uploadSarif = getInput("upload-sarif") === "true";
  const extraArgs = safeSplitArgs(argsRaw);

  const runnerTemp = process.env["RUNNER_TEMP"] || process.env["TMPDIR"] || "/tmp";
  const findingsJsonPath = path.join(runnerTemp, "ackit-findings.json");
  const sarifPath = path.join(runnerTemp, "ackit.sarif");

  // Resolve CLI entry (dist/cli/index.js)
  const cliPath = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1")), "..", "cli", "index.js");

  // For scan, we invoke ackit scan --json and capture findings
  let findings = [];
  let exitCode = 0;
  try {
    const cliArgs = [cliPath, command, ...extraArgs, "--json"];
    // Use node to run CLI
    const result = spawnSync(process.execPath, cliArgs, { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });
    if (result.stdout) {
      try {
        const parsed = JSON.parse(result.stdout);
        findings = parsed.findings ?? parsed.suggestions ?? [];
        // Write findings JSON to temp
        writeFileSync(findingsJsonPath, JSON.stringify(parsed, null, 2), "utf8");
        // Emit outputs via GITHUB_OUTPUT if available
        const outPath = process.env["GITHUB_OUTPUT"];
        if (outPath) {
          try {
            const fs = await import("node:fs/promises");
            await fs.appendFile(outPath, `findings-json=${findingsJsonPath}\n`);
            if (uploadSarif) await fs.appendFile(outPath, `sarif-path=${sarifPath}\n`);
          } catch {}
        }
        // Annotations: map severity to ::error/::warning
        for (const f of findings.slice(0, 10)) {
          const lvl = (f.severity ?? "low").toLowerCase();
          const msg = `${f.ruleId ?? f.id ?? "ACKIT"}: ${f.message ?? ""}`.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
          const file = (f.relativePath ?? f.evidence?.[0]?.relativePath ?? "unknown").replace(/%/g, "%25");
          const line = f.line ?? f.evidence?.[0]?.line ?? 1;
          const annotation = lvl === "critical" || lvl === "high" ? "error" : lvl === "medium" ? "warning" : "notice";
          console.log(`::${annotation} file=${file},line=${line}::${msg}`);
        }
        // SARIF if requested
        if (uploadSarif) {
          const sarif = {
            $schema: "https://json.schemastore.org/sarif-2.1.0.json",
            version: "2.1.0",
            runs: [
              {
                tool: { driver: { name: "ackit", version: "0.2.0" } },
                results: findings.map((f) => ({
                  ruleId: f.ruleId ?? f.id ?? "ACKIT",
                  level: f.severity === "high" || f.severity === "critical" ? "error" : f.severity === "medium" ? "warning" : "note",
                  message: { text: f.message ?? "" },
                  locations: [
                    {
                      physicalLocation: {
                        artifactLocation: { uri: f.relativePath ?? f.evidence?.[0]?.relativePath ?? "unknown" },
                      },
                    },
                  ],
                })),
              },
            ],
          };
          writeFileSync(sarifPath, JSON.stringify(sarif, null, 2), "utf8");
        }
        // Job summary
        const summaryPath = process.env["GITHUB_STEP_SUMMARY"];
        if (summaryPath) {
          try {
            const fs = await import("node:fs/promises");
            const counts = {};
            for (const f of findings) counts[f.severity ?? "low"] = (counts[f.severity ?? "low"] ?? 0) + 1;
            let md = `## ACKit ${command} — ${findings.length} finding(s)\n\n| Severity | Count |\n|---|---|\n`;
            for (const sev of ["critical", "high", "medium", "low"]) if (counts[sev]) md += `| ${sev} | ${counts[sev]} |\n`;
            if (findings.length > 0) md += `\nTop: ${findings[0]?.ruleId ?? findings[0]?.id} — ${findings[0]?.message ?? ""}\n`;
            await fs.appendFile(summaryPath, md, "utf8");
          } catch {}
        }
        // Fail threshold gating
        const maxRank = findings.reduce((m, f) => Math.max(m, severityRank(f.severity)), 0);
        const thrRank = severityRank(failThreshold);
        if (maxRank >= thrRank && findings.length > 0) {
          console.error(`::error::fail-threshold ${failThreshold} exceeded`);
          exitCode = 1;
        }
        exitCode = result.status ?? exitCode;
      } catch (e) {
        console.error(`::error::failed to parse CLI JSON: ${e}`);
        exitCode = 1;
      }
    } else {
      if (result.stderr) console.error(result.stderr);
      exitCode = result.status ?? 1;
    }
  } catch (e) {
    console.error(`::error::action failed: ${e}`);
    exitCode = 1;
  }
  process.exit(exitCode);
}

run();
