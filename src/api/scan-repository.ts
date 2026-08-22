import type { RepositoryRoot } from "../core/filesystem/root.js";
import { runScan, type ScanPipelineOptions } from "../core/scanner/pipeline.js";
import type { ScanResult } from "../core/scanner/types.js";

/**
 * Scans a repository and returns the stable finding set (REQ-API-001).
 * Thin alias over the internal pipeline with an API-friendly name; behavior
 * is identical to `ackit scan` minus CLI concerns.
 */
export function scanRepository(
  root: RepositoryRoot,
  options: Omit<ScanPipelineOptions, "rules"> & {
    /** Additional user-supplied rules appended to the built-in catalog. */
    extraRules?: ScanPipelineOptions["rules"];
  } = {},
): Promise<ScanResult> {
  const { extraRules = [], ...rest } = options;
  return runScan(root, { ...rest, rules: [...extraRules] });
}
