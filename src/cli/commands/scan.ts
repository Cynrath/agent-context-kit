import path from "node:path";
import process from "node:process";
import { compareBaseline, readBaseline, writeBaseline } from "../../core/cache/baseline.js";
import { PolicyError } from "../../core/policy/index.js";
import {
  renderHtmlReport,
  renderMarkdownReport,
  renderSarif,
  renderScanJson,
  renderScanTerminal,
} from "../../core/reporting/index.js";
import {
  type ExecutedScan,
  executeConfiguredScan,
  GitUnavailableError,
  ScanContractError,
} from "../../core/scanner/index.js";
import { startWatch } from "../../core/watch/watch.js";
import { emitDiagnostic } from "../../shared/diagnostics.js";
import { EXIT_CODES, type ExitCodeValue } from "../../shared/exit-codes.js";

export interface ScanCommandOptions {
  format?: string | undefined;
  output?: string | undefined;
  watch?: boolean | undefined;
  root?: string | undefined;
  config?: string | undefined;
  json: boolean;
  quiet: boolean;
  debug: boolean;
  ci: boolean;
  changed?: boolean | undefined;
  staged?: boolean | undefined;
  since?: string | undefined;
  range?: string | undefined;
  baseline?: string | undefined;
  writeBaseline?: string | undefined;
}

/**
 * `ackit scan` (REQ-SCAN-001/007, REQ-BASE-001): pipeline over the fs engine
 * with git-aware incremental sets and baseline compare/write; exit codes per
 * ADR-0007 (1 threshold/--ci exceeded or new-vs-baseline, 2 invalid config,
 * 3 environment).
 */
export async function runScanCommand(options: ScanCommandOptions): Promise<ExitCodeValue> {
  const rootRequested = path.resolve(options.root ?? process.cwd());

  let executed: ExecutedScan;
  try {
    executed = await executeConfiguredScan(rootRequested, {
      configPath: options.config,
      changed: options.changed,
      staged: options.staged,
      since: options.since,
      range: options.range,
    });
  } catch (error) {
    if (
      error instanceof GitUnavailableError ||
      error instanceof ScanContractError ||
      error instanceof PolicyError
    ) {
      const code = (error as { code?: string }).code ?? "scan-error";
      emitDiagnostic(
        { code: String(code).toLowerCase(), message: error.message },
        { quiet: options.quiet, debug: options.debug },
      );
      return EXIT_CODES.usage;
    }
    emitDiagnostic(
      { code: "environment-error", message: (error as Error).message },
      { quiet: options.quiet, debug: options.debug },
    );
    return EXIT_CODES.environment;
  }

  const result = executed.result;

  let newCount: number | null = null;
  let fixedCount: number | null = null;
  if (options.baseline !== undefined) {
    const baseline = await readBaseline(executed.root, options.baseline);
    if (baseline === null) {
      emitDiagnostic(
        {
          code: "baseline-error",
          message: `cannot read/validate baseline '${options.baseline}'`,
        },
        { quiet: options.quiet, debug: options.debug },
      );
      return EXIT_CODES.usage;
    }
    const diff = compareBaseline(result.findings, baseline);
    newCount = diff.newFindings.length;
    fixedCount = diff.fixedCount;
  }

  if (options.writeBaseline !== undefined) {
    await writeBaseline(executed.root, result.findings, options.writeBaseline);
    if (!options.json && !options.quiet) {
      process.stdout.write(
        `baseline written to ${options.writeBaseline} (${result.findings.length} findings)\n`,
      );
    }
  }

  const effectiveFormat = options.json === true ? "json" : (options.format ?? "terminal");
  const reportMeta = { filesScanned: result.filesScanned, policyDigest: executed.policyDigest };
  const renderFor = (format: string): string => {
    switch (format) {
      case "json":
        return renderScanJson(result, { newCount, fixedCount });
      case "sarif":
        return renderSarif(result.findings, { policyDigest: executed.policyDigest });
      case "markdown":
        return renderMarkdownReport(result.findings, reportMeta);
      case "html":
        return renderHtmlReport(result.findings, reportMeta);
      default:
        return (
          renderScanTerminal(result) +
          (newCount !== null && fixedCount !== null
            ? `Baseline delta: ${newCount} new, ${fixedCount} fixed.\n`
            : "")
        );
    }
  };

  if (options.watch === true) {
    if (!options.quiet && !options.json) {
      process.stdout.write(renderFor(effectiveFormat));
      process.stdout.write("watching for changes... (Ctrl+C to stop)\n");
    }
    let rerunning = false;
    const controller = new AbortController();
    process.on("SIGINT", () => controller.abort());
    const rerun = (): void => {
      if (rerunning) return;
      rerunning = true;
      executeConfiguredScan(rootRequested, {
        configPath: options.config,
        changed: options.changed,
        staged: options.staged,
        since: options.since,
        range: options.range,
        signal: controller.signal,
      })
        .then((rerunResult) => {
          result.findings = rerunResult.findings;
          result.filesScanned = rerunResult.result.filesScanned;
          result.diagnostics = rerunResult.result.diagnostics;
          if (!options.quiet && !options.json) process.stdout.write("re-scan complete.\n");
        })
        .catch(() => undefined)
        .finally(() => {
          rerunning = false;
        });
    };
    const handle = startWatch(executed.root, {
      signal: controller.signal,
      onChange: rerun,
    });
    await handle.done;
    if (!options.quiet && !options.json) process.stdout.write("watch stopped cleanly (exit 0).\n");
    return EXIT_CODES.ok;
  }

  const rendered = renderFor(effectiveFormat);
  if (options.output !== undefined) {
    const { writeFile } = await import("node:fs/promises");
    await writeFile(path.resolve(options.output), rendered, "utf8");
    if (!options.quiet && !options.json)
      process.stdout.write(`report written to ${options.output}\n`);
  } else {
    process.stdout.write(rendered);
  }

  const gateRequired = options.ci || newCount !== null;
  if (gateRequired && (executed.exceededThreshold || (newCount !== null && newCount > 0))) {
    if (!options.json && !options.quiet) {
      process.stdout.write(
        `CI gate failed: ${
          newCount !== null && newCount > 0
            ? `${newCount} new finding(s) vs baseline`
            : `threshold '${executed.threshold}' met or exceeded`
        }.\n`,
      );
    }
    return EXIT_CODES.thresholdExceeded;
  }
  return EXIT_CODES.ok;
}
