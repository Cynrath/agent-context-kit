import type { RepositoryRoot } from "../core/filesystem/root.js";
import { runScan, type ScanPipelineOptions } from "../core/scanner/pipeline.js";
import type { ScanResult } from "../core/scanner/types.js";
import { AckitError } from "./errors.js";

/**
 * Scans a repository and returns the stable finding set (REQ-API-001).
 * Thin alias over the internal pipeline with an API-friendly name; behavior
 * is identical to `ackit scan` minus CLI concerns.
 * REQ-V020-J-002: typed errors (AckitError) + AbortSignal cancellation.
 */
export async function scanRepository(
  root: RepositoryRoot,
  options: Omit<ScanPipelineOptions, "rules"> & {
    /** Additional user-supplied rules appended to the built-in catalog. */
    extraRules?: ScanPipelineOptions["rules"];
  } = {},
): Promise<ScanResult> {
  const {
    extraRules = [],
    signal,
    ...rest
  } = options as ScanPipelineOptions & {
    extraRules?: ScanPipelineOptions["rules"];
  };
  if (signal?.aborted) {
    throw new DOMException("scanRepository aborted", "AbortError");
  }
  // Cooperative abort: race signal against the scan
  let abortListener: (() => void) | undefined;
  const abortedPromise = new Promise<never>((_, reject) => {
    if (signal === undefined) return;
    abortListener = () => reject(new DOMException("scanRepository aborted", "AbortError"));
    signal.addEventListener("abort", abortListener, { once: true });
  });
  try {
    const scanPromise = runScan(root, {
      ...(rest as ScanPipelineOptions),
      signal,
      rules: [...extraRules],
    });
    if (signal === undefined) return await scanPromise;
    return await Promise.race([scanPromise, abortedPromise]);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    // Re-throw known typed errors unchanged; wrap unknown strings defensively
    if (error instanceof Error) throw error;
    throw new AckitError("UNKNOWN", String(error), { cause: error });
  } finally {
    if (signal !== undefined && abortListener !== undefined) {
      signal.removeEventListener("abort", abortListener);
    }
  }
}
