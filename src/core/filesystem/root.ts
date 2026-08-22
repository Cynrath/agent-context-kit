import { promises as fsp } from "node:fs";
import path from "node:path";
import { FilesystemEngine } from "./engine.js";
import type { FilesystemDiagnostic } from "./types.js";

export interface RepositoryRoot {
  /** Canonical (realpath'd) native-separator absolute path of the repository root. */
  canonicalPath: string;
}

export type RootResolutionResult =
  | { ok: true; root: RepositoryRoot }
  | { ok: false; diagnostic: FilesystemDiagnostic };

/**
 * Resolves the canonical repository root once per process run
 * (ADR-0005): requested path → absolute → realpath → must be a directory.
 * Every later containment check compares against this single canonical root.
 */
export async function resolveRepositoryRoot(requested?: string): Promise<RootResolutionResult> {
  const requestedAbsolute = path.resolve(requested ?? process.cwd());
  try {
    const real = await fsp.realpath(requestedAbsolute);
    const stat = await fsp.stat(real);
    if (!stat.isDirectory()) {
      return {
        ok: false,
        diagnostic: {
          code: "FS-ROOT-INVALID",
          message: "repository root must be a directory",
          relativePath: requested,
        },
      };
    }
    return { ok: true, root: { canonicalPath: real } };
  } catch (error) {
    return {
      ok: false,
      diagnostic: {
        code: "FS-ROOT-INVALID",
        message: `cannot resolve repository root: ${describeError(error)}`,
        relativePath: requested,
      },
    };
  }
}

/**
 * Convenience constructor used by commands and tests.
 */
export async function createFilesystemEngine(
  requested?: string,
): Promise<
  { ok: true; engine: FilesystemEngine } | { ok: false; diagnostic: FilesystemDiagnostic }
> {
  const resolved = await resolveRepositoryRoot(requested);
  if (!resolved.ok) {
    return resolved;
  }
  return { ok: true, engine: new FilesystemEngine(resolved.root) };
}

export function describeError(error: unknown): string {
  if (error instanceof Error) {
    const code = (error as NodeJS.ErrnoException).code;
    return code ? `${code}: ${error.message}` : error.message;
  }
  return String(error);
}
