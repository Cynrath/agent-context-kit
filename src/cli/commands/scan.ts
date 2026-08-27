import path from "node:path";
import process from "node:process";
import { compareBaseline, readBaseline, writeBaseline } from "../../core/cache/baseline.js";
import { loadAckitConfig } from "../../core/config/load.js";
import { buildContextPack } from "../../core/context/pack.js";
import { createRoot } from "../../core/filesystem/root.js";
import { buildInstructionGraph } from "../../core/instructions/graph.js";
import { PolicyError } from "../../core/policy/index.js";
import {
  diffAgainstBaseline,
  readReadinessBaseline,
  writeReadinessBaseline,
} from "../../core/readiness/baseline.js";
import { scoreRepository } from "../../core/readiness/index.js";
import { renderReadinessTerminal } from "../../core/readiness/terminal.js";
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
import { validateSkills } from "../../core/skills/validate.js";
import { TaskStore } from "../../core/tasks/store.js";
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
  failBelow?: string | undefined;
  strict?: boolean | undefined;
  compare?: string | undefined;
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

  // Build readiness report (deterministic, never throws gate)
  let readinessReport: ReturnType<typeof scoreRepository> | null = null;
  let readinessThreshold: number | undefined;
  try {
    if (options.failBelow !== undefined) {
      const n = Number.parseInt(options.failBelow, 10);
      if (!Number.isInteger(n) || String(n) !== options.failBelow.trim() || n < 0 || n > 100) {
        emitDiagnostic(
          {
            code: "CLI-READINESS-THRESHOLD",
            message: "error: --fail-below must be integer 0..100",
          },
          { quiet: options.quiet, debug: options.debug },
        );
        return EXIT_CODES.usage;
      }
      readinessThreshold = n;
    } else if (options.strict || options.ci) {
      try {
        const cfgRoot = await createRoot(executed.root.canonicalPath);
        const loaded = await loadAckitConfig(cfgRoot.canonicalPath);
        if (loaded.ok && loaded.config.readiness?.strictThreshold !== undefined) {
          readinessThreshold = loaded.config.readiness.strictThreshold;
        } else {
          readinessThreshold = 80;
        }
      } catch {
        readinessThreshold = 80;
      }
    }

    const graph = await buildInstructionGraph(executed.root).catch(() => ({
      nodes: [],
      diagnostics: [],
      schemaVersion: 2 as const,
    }));
    const pack = await buildContextPack(executed.root, { maxTokens: 100000 }).catch(() => ({
      manifest: [],
      totalIncludedTokens: 0,
      maxTokens: 100000,
      markdown: "",
      json: "",
      format: "markdown" as const,
    }));
    const skillsRes = await validateSkills(executed.root).catch(() => ({ skills: [], issues: [] }));
    let taskHealth: {
      dirExists: boolean;
      staleReferences?: number;
      schemaIssues?: number;
      totalTasks?: number;
    } = { dirExists: false };
    try {
      const store = new TaskStore(executed.root.canonicalPath);
      const docs = await store.list(true);
      const doctor = await store.doctor();
      taskHealth = {
        dirExists: true,
        totalTasks: docs.length,
        schemaIssues: doctor.problems.length,
        staleReferences: doctor.problems.filter((p) => p.includes("dependency")).length,
      };
      const { promises: fsp } = await import("node:fs");
      try {
        await fsp.access(path.join(executed.root.canonicalPath, "docs/tasks"));
      } catch {
        taskHealth.dirExists = false;
      }
    } catch {
      taskHealth = { dirExists: false };
    }
    const policyForReadiness = {
      findings: result.findings.filter((f) => f.category === "config-problem"),
    } as unknown;
    // Load config weights
    let weights: Record<string, number> | undefined;
    try {
      const cfgRoot = await createRoot(executed.root.canonicalPath);
      const loaded = await loadAckitConfig(cfgRoot.canonicalPath);
      if (loaded.ok && loaded.config.readiness?.weights)
        weights = loaded.config.readiness.weights as Record<string, number>;
    } catch {}
    readinessReport = scoreRepository(
      {
        graph: graph as never,
        pack: pack as never,
        scan: result,
        skills: skillsRes as never,
        policy: policyForReadiness as never,
        tasks: taskHealth as never,
      },
      {
        failBelow: readinessThreshold,
        strict: options.strict ?? options.ci ?? false,
        weights: weights as never,
      },
    );
    // handle readiness compare baseline
    if (options.compare !== undefined) {
      try {
        const baseline = await readReadinessBaseline(executed.root.canonicalPath, options.compare);
        if (baseline !== null) {
          const diff = diffAgainstBaseline(readinessReport, baseline);
          (readinessReport as unknown as Record<string, unknown>)["baseline"] = diff;
        }
      } catch (e) {
        emitDiagnostic(
          { code: "READINESS-BASELINE-PATH", message: (e as Error).message },
          { quiet: options.quiet, debug: options.debug },
        );
        return EXIT_CODES.usage;
      }
    }
    // readiness baseline write (reuse writeBaseline path for readiness if requested via compare? We use same writeBaseline for findings; also write readiness baseline if --write-baseline is used, as sidecar)
    if (options.writeBaseline !== undefined) {
      try {
        // also write readiness baseline to same path + ".readiness" ? but spec expects readiness baseline file at same path for readiness command
        // For scan, we write readiness baseline as sibling with same logic but not required for tests that use readiness command
        await writeReadinessBaseline(
          executed.root.canonicalPath,
          readinessReport,
          `${options.writeBaseline}.readiness.json`,
        ).catch(() => {});
      } catch {}
    }
  } catch (e) {
    // readiness failure should not block scan output; emit diagnostic
    emitDiagnostic(
      { code: "readiness-error", message: (e as Error).message },
      { quiet: options.quiet, debug: options.debug },
    );
  }

  const effectiveFormat = options.json === true ? "json" : (options.format ?? "terminal");
  const reportMeta = { filesScanned: result.filesScanned, policyDigest: executed.policyDigest };
  const renderFor = (format: string): string => {
    switch (format) {
      case "json": {
        const base = JSON.parse(renderScanJson(result, { newCount, fixedCount }));
        if (readinessReport) base.readiness = readinessReport;
        return `${JSON.stringify(base, null, 2)}\n`;
      }
      case "sarif":
        return renderSarif(result.findings, { policyDigest: executed.policyDigest });
      case "markdown":
        return (
          renderMarkdownReport(result.findings, reportMeta) +
          (readinessReport ? `\n## Readiness\n${renderReadinessTerminal(readinessReport)}` : "")
        );
      case "html":
        return renderHtmlReport(result.findings, reportMeta);
      default:
        return (
          renderScanTerminal(result) +
          (readinessReport ? renderReadinessTerminal(readinessReport) : "") +
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
        .catch((error: unknown) => {
          if (options.json) return;
          emitDiagnostic(
            { code: "watch-rescan-error", message: (error as Error).message },
            { quiet: options.quiet, debug: options.debug },
          );
        })
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

  // Readiness threshold gate
  if (readinessReport && readinessThreshold !== undefined) {
    const passed = readinessReport.overall >= readinessThreshold;
    if (!passed) {
      if (!options.quiet) {
        const msg = `readiness: ${readinessReport.overall} < threshold ${readinessThreshold} — failing\n`;
        if (options.json) process.stderr.write(msg);
        else process.stdout.write(msg);
      }
      return EXIT_CODES.thresholdExceeded;
    }
    if (!options.quiet && !options.json) {
      process.stderr.write(
        `readiness: ${readinessReport.overall} >= threshold ${readinessThreshold} — pass\n`,
      );
    }
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
