import { spawnSync } from "node:child_process";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { renderSarif } from "../core/reporting/sarif.js";
import { type Finding, FindingSchema, SEVERITY_ORDER } from "../core/scanner/types.js";

interface CliResult {
  status: number | null;
  stdout: string;
  error?: Error | undefined;
  signal?: NodeJS.Signals | null | undefined;
}

interface ActionOptions {
  env?: NodeJS.ProcessEnv;
  /** Narrow process boundary for deterministic error/timeout regression tests. */
  invoke?: (args: string[]) => CliResult;
  log?: (line: string) => void;
  error?: (line: string) => void;
}

/** Quoting groups argv only; no shell expansion or executable interpolation. */
export function splitActionArgs(input: string): string[] {
  const args: string[] = [];
  let current = "";
  let quote: '"' | "'" | undefined;
  let started = false;
  for (const char of input) {
    if (char === quote) {
      quote = undefined;
    } else if (quote === undefined && (char === '"' || char === "'")) {
      quote = char;
      started = true;
    } else if (quote === undefined && /\s/.test(char)) {
      if (started) args.push(current);
      current = "";
      started = false;
    } else {
      current += char;
      started = true;
    }
  }
  if (quote !== undefined) throw new Error("Unclosed quote in Action args");
  if (started) args.push(current);
  return args;
}

function escapeCommand(value: string, property = false): string {
  const escaped = value.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
  return property ? escaped.replace(/:/g, "%3A").replace(/,/g, "%2C") : escaped;
}

function input(env: NodeJS.ProcessEnv, name: string): string {
  return (
    env[`INPUT_${name.toUpperCase().replaceAll("-", "_")}`] ??
    env[`INPUT_${name.toUpperCase()}`] ??
    ""
  );
}

export function runAction(options: ActionOptions = {}): number {
  const env = options.env ?? process.env;
  const log = options.log ?? console.log;
  const error = options.error ?? console.error;
  let cliExit = 0;
  try {
    const command = input(env, "command") || "scan";
    const threshold = input(env, "fail-threshold") || "high";
    const rank = SEVERITY_ORDER.indexOf(threshold as (typeof SEVERITY_ORDER)[number]);
    if (rank < 0) throw new Error("Invalid fail-threshold");
    const sarifInput = input(env, "upload-sarif");
    if (!["", "false", "true"].includes(sarifInput)) throw new Error("Invalid upload-sarif");
    const args = splitActionArgs(input(env, "args"));
    const cliPath = fileURLToPath(new URL("../cli/index.js", import.meta.url));
    const invoke =
      options.invoke ??
      ((argv: string[]): CliResult =>
        spawnSync(process.execPath, argv, {
          encoding: "utf8",
          env,
          maxBuffer: 10 * 1024 * 1024,
          timeout: 120_000,
          windowsHide: true,
        }));
    const result = invoke([cliPath, command, ...args, "--json"]);
    // A CLI error always wins; a successful process must never clear a threshold
    // failure. Signals, timeouts and launch failures must fail closed as well.
    cliExit = result.status ?? 1;
    if (result.error || result.signal) {
      error("::error::ACKit CLI did not complete (launch failure, signal or timeout)");
      return cliExit || 1;
    }
    if (!result.stdout.trim()) {
      error(`::error::ACKit CLI returned no JSON report (exit ${cliExit})`);
      return cliExit || 1;
    }
    const report: unknown = JSON.parse(result.stdout);
    if (report === null || typeof report !== "object" || Array.isArray(report)) {
      throw new Error("Invalid CLI JSON report");
    }
    const rawFindings = (report as Record<string, unknown>)["findings"] ?? [];
    const findings: Finding[] = FindingSchema.array().parse(rawFindings);
    const activeFindings = findings.filter((finding) => !finding.suppressed);
    const runnerTemp = env["RUNNER_TEMP"] || tmpdir();
    mkdirSync(runnerTemp, { recursive: true });
    const jsonPath = path.join(runnerTemp, "ackit-findings.json");
    const sarifPath = path.join(runnerTemp, "ackit.sarif");
    writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    if (sarifInput === "true") writeFileSync(sarifPath, renderSarif(findings), "utf8");

    const outputPath = env["GITHUB_OUTPUT"];
    if (outputPath) {
      appendFileSync(outputPath, `findings-json=${jsonPath}\n`, "utf8");
      if (sarifInput === "true") appendFileSync(outputPath, `sarif-path=${sarifPath}\n`, "utf8");
    }
    for (const finding of activeFindings.slice(0, 10)) {
      const level =
        finding.severity === "critical" || finding.severity === "high"
          ? "error"
          : finding.severity === "medium"
            ? "warning"
            : "notice";
      log(
        `::${level} file=${escapeCommand(finding.relativePath, true)},line=${finding.line}::${escapeCommand(
          `${finding.ruleId}: ${finding.message}`,
        )}`,
      );
    }
    const summaryPath = env["GITHUB_STEP_SUMMARY"];
    if (summaryPath) {
      const rows = [...SEVERITY_ORDER]
        .reverse()
        .map(
          (severity) =>
            `| ${severity} | ${activeFindings.filter((finding) => finding.severity === severity).length} |`,
        );
      appendFileSync(
        summaryPath,
        `## ACKit — ${activeFindings.length} active finding(s)\n\n` +
          `| Severity | Count |\n|---|---|\n${rows.join("\n")}\n`,
        "utf8",
      );
    }
    const exceeded = activeFindings.some(
      (finding) => SEVERITY_ORDER.indexOf(finding.severity) >= rank,
    );
    if (exceeded) error(`::error::fail-threshold ${threshold} exceeded`);
    return cliExit || (exceeded ? 1 : 0);
  } catch {
    // Never expose raw child errors or report contents (paths/credentials) here.
    error("::error::ACKit Action input, report or output processing failed");
    return cliExit || 1;
  }
}
