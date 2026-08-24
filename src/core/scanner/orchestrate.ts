import path from "node:path";
import { loadAckitConfig } from "../config/load.js";
import type { AckitConfig } from "../config/schema.js";
import type { RepositoryRoot } from "../filesystem/root.js";
import { resolveRepositoryRoot } from "../filesystem/root.js";
import { changedFiles, rangeFiles, sinceFiles, stagedFiles } from "../git/git.js";
import {
  applyPolicyToFindings,
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

    const result = await runScan(root, {
      rules: defaultRegistry.getAll(),
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
