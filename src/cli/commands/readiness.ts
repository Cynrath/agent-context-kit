import path from "node:path";
import process from "node:process";
import { loadAckitConfig } from "../../core/config/load.js";
import { buildContextPack } from "../../core/context/pack.js";
import { resolveRepositoryRoot } from "../../core/filesystem/root.js";
import { buildInstructionGraph } from "../../core/instructions/graph.js";
import {
  diffAgainstBaseline,
  readReadinessBaseline,
  writeReadinessBaseline,
} from "../../core/readiness/baseline.js";
import { scoreRepository } from "../../core/readiness/index.js";
import { renderReadinessTerminal } from "../../core/readiness/terminal.js";
import { executeConfiguredScan } from "../../core/scanner/index.js";
import { validateSkills } from "../../core/skills/validate.js";
import { TaskStore } from "../../core/tasks/store.js";
import { emitDiagnostic } from "../../shared/diagnostics.js";
import { EXIT_CODES, type ExitCodeValue } from "../../shared/exit-codes.js";

export interface ReadinessCommandOptions {
  root?: string;
  config?: string;
  json: boolean;
  quiet: boolean;
  debug: boolean;
  failBelow?: string | undefined;
  strict?: boolean | undefined;
  ci?: boolean | undefined;
  baseline?: string | undefined;
  compare?: string | undefined;
  writeBaseline?: string | undefined;
}

function parseFailBelow(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const n = Number.parseInt(value, 10);
  if (!Number.isInteger(n) || String(n) !== value.trim() || n < 0 || n > 100) {
    throw new Error("CLI-READINESS-THRESHOLD");
  }
  return n;
}

export async function runReadinessCommand(
  options: ReadinessCommandOptions,
): Promise<ExitCodeValue> {
  const rootRequested = path.resolve(options.root ?? process.cwd());
  let threshold: number | undefined;
  try {
    threshold = parseFailBelow(options.failBelow);
  } catch {
    emitDiagnostic(
      { code: "CLI-READINESS-THRESHOLD", message: "error: --fail-below must be integer 0..100" },
      { quiet: options.quiet, debug: options.debug },
    );
    return EXIT_CODES.usage;
  }
  if (options.strict || options.ci) {
    if (threshold === undefined) {
      // Try config strictThreshold
      try {
        const resolved = await resolveRepositoryRoot(rootRequested);
        const canonical = resolved.ok ? resolved.root.canonicalPath : rootRequested;
        const loaded = await loadAckitConfig(canonical);
        const readiness = loaded.ok ? (loaded.config as unknown as Record<string, unknown>) : null;
        const strictThreshold =
          readiness !== null
            ? ((readiness["readiness"] as Record<string, unknown> | undefined)?.[
                "strictThreshold"
              ] as number | undefined)
            : undefined;
        if (loaded.ok && strictThreshold !== undefined) {
          threshold = strictThreshold;
        } else {
          threshold = 80;
        }
      } catch {
        threshold = 80;
      }
    }
  }

  let executed: Awaited<ReturnType<typeof executeConfiguredScan>>;
  try {
    executed = await executeConfiguredScan(rootRequested, { configPath: options.config });
  } catch (error) {
    emitDiagnostic(
      { code: "environment-error", message: (error as Error).message },
      { quiet: options.quiet, debug: options.debug },
    );
    return EXIT_CODES.environment;
  }

  const root = executed.root;
  // Gather inputs
  const graph = await buildInstructionGraph(root).catch(() => ({
    nodes: [],
    diagnostics: [],
    schemaVersion: 2 as const,
  }));
  const pack = await buildContextPack(root, { maxTokens: 100000 }).catch(() => ({
    manifest: [],
    totalIncludedTokens: 0,
    maxTokens: 100000,
    markdown: "",
    json: "",
    format: "markdown" as const,
  }));
  const skillsResult = await validateSkills(root).catch(() => ({ skills: [], issues: [] }));
  const skillsInput = skillsResult;
  // tasks
  let taskHealth: {
    dirExists: boolean;
    staleReferences?: number;
    schemaIssues?: number;
    totalTasks?: number;
  } = { dirExists: false };
  try {
    const store = new TaskStore(root.canonicalPath);
    const docs = await store.list(true);
    const doctor = await store.doctor();
    taskHealth = {
      dirExists: true,
      totalTasks: docs.length,
      schemaIssues: doctor.problems.length,
      staleReferences: doctor.problems.filter((p) => p.includes("dependency")).length,
    };
    // If no tasks dir existed, list returns [] but dirExists would still be true after we tried. Need to check filesystem existence
    // Fallback: check if docs empty and no active dir exists -> treat as no docs/tasks
    // We keep dirExists true even if empty, but spec says N/A when no docs/tasks directory. For empty, we still consider exists but with 0 tasks -> not N/A, but we want N/A only when directory missing. Our store.list returns [] both when missing and when empty existing.
    // We check existence via fs stat
    const { promises: fsp } = await import("node:fs");
    try {
      await fsp.access(path.join(root.canonicalPath, "docs/tasks"));
    } catch {
      taskHealth.dirExists = false;
    }
  } catch {
    taskHealth = { dirExists: false };
  }

  const policy = {
    findings: executed.result.findings.filter((f) => f.category === "config-problem"),
  } as unknown;

  const report = scoreRepository(
    {
      graph: graph as never,
      pack: pack as never,
      scan: executed.result,
      skills: skillsInput as never,
      policy: policy as never,
      tasks: taskHealth as never,
    },
    { failBelow: threshold, strict: options.strict ?? options.ci ?? false },
  );

  // Baseline write
  const baselinePath = options.baseline ?? options.writeBaseline;
  if (baselinePath !== undefined) {
    try {
      await writeReadinessBaseline(root.canonicalPath, report, baselinePath);
      if (!options.json && !options.quiet)
        process.stdout.write(
          `readiness baseline written to ${baselinePath} (overall ${report.overall})\n`,
        );
    } catch (e) {
      emitDiagnostic(
        { code: "READINESS-BASELINE-PATH", message: (e as Error).message },
        { quiet: options.quiet, debug: options.debug },
      );
      return EXIT_CODES.usage;
    }
  }

  // Compare
  if (options.compare !== undefined) {
    const baseline = await readReadinessBaseline(root.canonicalPath, options.compare).catch(
      () => null,
    );
    if (baseline === null) {
      emitDiagnostic(
        { code: "baseline-error", message: `cannot read/validate baseline '${options.compare}'` },
        { quiet: options.quiet, debug: options.debug },
      );
      return EXIT_CODES.usage;
    }
    const diff = diffAgainstBaseline(report, baseline);
    (report as unknown as Record<string, unknown>)["baseline"] = diff;
  }

  if (options.json) {
    // pure JSON to stdout
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    process.stdout.write(renderReadinessTerminal(report));
    if (threshold !== undefined) {
      const passed = report.overall >= threshold;
      if (!passed) {
        process.stderr.write(`readiness: ${report.overall} < threshold ${threshold} — failing\n`);
      } else if (!options.quiet) {
        process.stderr.write(`readiness: ${report.overall} >= threshold ${threshold} — pass\n`);
      }
    }
  }

  if (threshold !== undefined && report.overall < threshold) {
    return EXIT_CODES.thresholdExceeded;
  }
  if (options.compare !== undefined) {
    // compare already handled threshold? No extra gate.
  }
  return EXIT_CODES.ok;
}
