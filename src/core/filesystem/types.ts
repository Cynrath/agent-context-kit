/**
 * Stable filesystem-engine diagnostic codes (REQ-GOV-007). Codes are part of
 * the machine-readable contract; message text is English-only.
 */
export type FilesystemDiagnosticCode =
  | "FS-ROOT-INVALID"
  | "FS-PATH-ESCAPES-ROOT"
  | "FS-PATH-ABSOLUTE"
  | "FS-TARGET-MISSING"
  | "FS-SYMLINK-BLOCKED"
  | "FS-CYCLE-SKIPPED"
  | "FS-LIMIT-FILES"
  | "FS-LIMIT-BYTES"
  | "FS-LIMIT-DEPTH"
  | "FS-DEADLINE-EXCEEDED"
  | "FS-ABORTED"
  | "FS-READ-FAILED";

export interface FilesystemDiagnostic {
  code: FilesystemDiagnosticCode;
  message: string;
  relativePath?: string;
}

/**
 * Traversal limits (REQ-FS-003). All are optional; breaches produce
 * diagnostics — never silent truncation.
 */
export interface TraversalLimits {
  /** Maximum number of regular files yielded before stopping with a diagnostic. */
  maxFiles?: number | undefined;
  /** Maximum size of one file in bytes; larger files are skipped with a diagnostic. */
  maxFileBytes?: number | undefined;
  /** Maximum cumulative file size in bytes. */
  maxTotalBytes?: number | undefined;
  /** Maximum directory depth below the root (root itself = depth 0; its entries = depth 1). */
  maxDepth?: number | undefined;
  /** Wall-clock budget for the whole traversal, in milliseconds. */
  deadlineMs?: number | undefined;
  /** Number of stat operations kept in flight per batch (deterministic order preserved). Default 16. */
  concurrency?: number | undefined;
}

export const DEFAULT_CONCURRENCY = 16;

export interface WalkEntry {
  relativePath: string;
  absolutePath: string;
  sizeBytes: number;
}
