import path from "node:path";
import { loadAckitConfig } from "../config/load.js";
import type { AckitConfig } from "../config/schema.js";
import type { RepositoryRoot } from "../filesystem/root.js";
import { resolveRepositoryRoot } from "../filesystem/root.js";
import { changedFiles, rangeFiles, sinceFiles, stagedFiles } from "../git/git.js";
import {
  applyPolicyToFindings,
  forbiddenPatternToRule,
  PolicyError,
  policyDigest,
  resolvePolicy,
} from "../policy/index.js";
import { runScan } from "./pipeline.js";
import { defaultRegistry } from "./registry.js";
import type { Finding, ScanResult } from "./types.js";
import { severityAtLeast } from "./types.js";

/**
 * Canonical scan orchestration (audit 6B): BOTH the CLI and the MCP server
 * must run this exact path — config → offline policy → incremental git sets
 * → pipeline → policy application → threshold decision — so neither surface
 * can drift into a weaker parallel implementation.
 */
export interface ExecuteScanOptions {
  configPath?: string | undefined;
  changed?: boolean | undefined;
  staged?: boolean | undefined;
  since?: string | undefined;
  range?: string | undefined;
  signal?: AbortSignal | undefined;
}

export class ScanContractError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ScanContractError";
  }
}

export class GitUnavailableError extends Error {
  readonly code = "GIT-UNAVAILABLE";
}

export interface ExecutedScan {
  root: RepositoryRoot;
  result: ScanResult;
  /** Post-policy findings (same array reference as result.findings). */
  findings: Finding[];
  config: AckitConfig;
  policyDigest: string;
  threshold: "low" | "medium" | "high" | "critical";
  exceededThreshold: boolean;
}

export async function executeConfiguredScan(
  requestedRoot: string,
  options: ExecuteScanOptions = {},
): Promise<ExecutedScan> {
  const rootRequested = path.resolve(requestedRoot);
  const loaded = await loadAckitConfig(rootRequested, { configPath: options.configPath });
  if (!loaded.ok) {
    const first = loaded.errors[0];
    throw new ScanContractError(
      first?.code ?? "CFG-INVALID",
      first !== undefined ? `${first.code}: ${first.message}` : "invalid configuration",
    );
  }
  const config: AckitConfig = loaded.config;

  const rootResolution = await resolveRepositoryRoot(rootRequested);
  if (!rootResolution.ok) {
    throw new ScanContractError(
      rootResolution.diagnostic.code,
      `${rootResolution.diagnostic.code}: ${rootResolution.diagnostic.message}`,
    );
  }
  const root = rootResolution.root;

  let filterPaths: Set<string> | undefined;
  if (
    options.changed ||
    options.staged ||
    options.since !== undefined ||
    options.range !== undefined
  ) {
    const paths = new Set<string>();
    try {
      if (options.changed) for (const file of changedFiles(root.canonicalPath)) paths.add(file);
      if (options.staged) for (const file of stagedFiles(root.canonicalPath)) paths.add(file);
      if (options.since !== undefined)
        for (const file of sinceFiles(root.canonicalPath, options.since)) paths.add(file);
      if (options.range !== undefined) {
        const [from, to] = options.range.split("..");
        for (const file of rangeFiles(root.canonicalPath, from ?? "HEAD", to ?? "HEAD"))
          paths.add(file);
      }
    } catch (error) {
      throw new GitUnavailableError((error as Error).message);
    }
    filterPaths = paths;
  }

  try {
    const resolvedPolicy = await resolvePolicy(root, {
      entryFiles: config.policy.extends,
    });
    const pd = policyDigest(resolvedPolicy.policy);

    // Compute config digest for cache key binding.
    const { stableStringify } = await import("../config/load.js");
    const { createHash } = await import("node:crypto");
    const configDigest = createHash("sha256").update(stableStringify(config)).digest("hex");

    // Build the ACTIVE rule plan (audit item 2):
    // 1. Start with built-in catalog.
    // 2. Filter out policy-disabled rules (enabled:false) BEFORE evaluation.
    // 3. Append declarative forbiddenPatterns as first-class ScanRules.
    const builtin = defaultRegistry.getAll();
    const disabledIds = new Set(
      resolvedPolicy.policy.rules.filter((r) => r.enabled === false).map((r) => r.ruleId),
    );
    const activeBuiltin = builtin.filter((rule) => !disabledIds.has(rule.id));
    const forbiddenRules = resolvedPolicy.policy.forbiddenPatterns.map((fp) =>
      forbiddenPatternToRule(fp),
    );
    const activeRulePlan: import("./types.js").ScanRule[] = [...activeBuiltin, ...forbiddenRules];

    const result = await runScan(root, {
      rules: activeRulePlan,
      limits: config.limits,
      userExcludeGlobs: config.scan.exclude,
      filterPaths,
      signal: options.signal,
      cache: {
        root,
        configDigest,
        policyDigest: pd,
      },
    });

    // Rule packs integration (TASK-0012): pure evaluation over repoFiles already in memory.
    // Load packs offline, evaluate, and merge findings/diagnostics.
    let packDiagnostics: import("../scanner/types.js").ScanDiagnostic[] = [];
    let packFindings: import("../scanner/types.js").Finding[] = [];
    if (config.policy.rulePacks.length > 0) {
      try {
        const { loadRulePacks } = await import("../policy/packs/load.js");
        const { evaluateRulePacks } = await import("../policy/packs/evaluate.js");
        const loaded = await loadRulePacks(root, config.policy.rulePacks);
        packDiagnostics = loaded.diagnostics;
        if (loaded.packs.length > 0) {
          // collect repoFiles for pack evaluation: reuse targets from result? Re-collect text targets
          const { collectScanTargets } = await import("../filesystem/scan-targets.js");
          const collection = await collectScanTargets(root, {
            limits: config.limits,
            userExcludeGlobs: config.scan.exclude,
          });
          const textFiles: { relativePath: string; content: string }[] = [];
          const textTargets = collection.targets.filter((t) => t.kind === "text");
          const fsp = await import("node:fs/promises");
          for (const t of textTargets) {
            try {
              const content = await fsp.readFile(t.absolutePath, "utf8");
              textFiles.push({ relativePath: t.relativePath, content });
            } catch {
              // skip unreadable
            }
          }
          // ensure ackit.yml and package.json are included even if not textTargets (e.g., excluded)
          for (const must of ["ackit.yml", "package.json", "AGENTS.md"]) {
            if (!textFiles.some((f) => f.relativePath === must)) {
              try {
                const p = (await import("node:path")).default.join(root.canonicalPath, must);
                const content = await fsp.readFile(p, "utf8");
                textFiles.push({ relativePath: must, content });
              } catch {
                // missing is fine
              }
            }
          }
          let instructionGraph: import("../instructions/types.js").InstructionGraph | undefined;
          try {
            const { buildInstructionGraph } = await import("../instructions/graph.js");
            instructionGraph = await buildInstructionGraph(root);
          } catch {
            instructionGraph = undefined;
          }
          const packEval = evaluateRulePacks(loaded.packs, {
            repoFiles: textFiles,
            config,
            instructionGraph,
            signal: options.signal,
          });
          packFindings = packEval.findings;
          packDiagnostics = [...packDiagnostics, ...packEval.diagnostics];
        }
        result.diagnostics.push(...packDiagnostics);
        result.findings.push(...packFindings);
        result.findings.sort((a, b) => {
          if (a.relativePath !== b.relativePath) return a.relativePath < b.relativePath ? -1 : 1;
          if (a.ruleId !== b.ruleId) return a.ruleId < b.ruleId ? -1 : 1;
          if (a.line !== b.line) return a.line - b.line;
          return a.column - b.column;
        });
      } catch (e) {
        // pack load failure surfaces as diagnostic, not crash
        const msg = (e as Error).message;
        result.diagnostics.push({ code: "POL-PACK-LOAD-FAILED", message: msg });
      }
    }
    result.findings = applyPolicyToFindings(result.findings, {
      policy: resolvedPolicy.policy,
      documents: resolvedPolicy.documents,
    });

    const threshold = resolvedPolicy.policy.thresholds.severity ?? config.scan.severityThreshold;
    const exceededThreshold = result.findings.some(
      (finding) => !finding.suppressed && severityAtLeast(finding.severity, threshold),
    );

    return {
      root,
      result,
      findings: result.findings,
      config,
      policyDigest: policyDigest(resolvedPolicy.policy),
      threshold,
      exceededThreshold,
    };
  } catch (error) {
    if (error instanceof PolicyError) throw error;
    throw error;
  }
}
