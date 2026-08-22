import { promises as fsp } from "node:fs";
import path from "node:path";
import { isInsideRoot, normalizeRelativePath } from "./paths.js";
import type { RepositoryRoot } from "./root.js";
import { describeError } from "./root.js";
import type { FilesystemDiagnostic } from "./types.js";

export interface ResolvedInRoot {
  ok: true;
  /** Canonical absolute path (native separators). */
  absolutePath: string;
  /** Canonical POSIX relative path from the root. */
  relativePath: string;
}

export type ResolveFailure =
  | { ok: false; diagnostic: FilesystemDiagnostic }
  | { ok: false; notFound: true; diagnostic: FilesystemDiagnostic };

/**
 * The security bedrock (ADR-0005): every file access requested by feature
 * code goes through here. Chain: requested string → normalized POSIX
 * relative → joined under canonical root → realpath → containment check.
 * Symlinks/junctions/reparse points are followed only when their resolved
 * target stays inside the root; anything else is denied with a stable
 * diagnostic (exit-class 4 territory for callers).
 */
export class FilesystemEngine {
  constructor(private readonly root: RepositoryRoot) {}

  get canonicalRoot(): string {
    return this.root.canonicalPath;
  }

  async resolveWithinRoot(requestedRelative: string): Promise<ResolvedInRoot | ResolveFailure> {
    const normalized = normalizeRelativePath(requestedRelative);
    if (!normalized.ok) {
      const code = normalized.reason === "absolute" ? "FS-PATH-ABSOLUTE" : "FS-PATH-ESCAPES-ROOT";
      return {
        ok: false,
        diagnostic: {
          code,
          message: `path rejected before filesystem access (${normalized.reason}): ${requestedRelative}`,
        },
      };
    }
    if (normalized.value.length === 0) {
      return { ok: true, absolutePath: this.root.canonicalPath, relativePath: "" };
    }
    const joined = path.join(this.root.canonicalPath, ...normalized.value.split("/"));
    let real: string;
    try {
      real = await fsp.realpath(joined);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return {
          ok: false,
          notFound: true,
          diagnostic: {
            code: "FS-TARGET-MISSING",
            message: "path does not exist inside the repository",
            relativePath: normalized.value,
          },
        };
      }
      return {
        ok: false,
        diagnostic: {
          code: "FS-READ-FAILED",
          message: `realpath failed: ${describeError(error)}`,
          relativePath: normalized.value,
        },
      };
    }
    if (!isInsideRoot(this.root.canonicalPath, real)) {
      return {
        ok: false,
        diagnostic: {
          code: "FS-PATH-ESCAPES-ROOT",
          message: "resolved symlink/reparse target leaves the repository root; access denied",
          relativePath: normalized.value,
        },
      };
    }
    return {
      ok: true,
      absolutePath: real,
      relativePath: toPosixFrom(real, this.root.canonicalPath),
    };
  }

  /**
   * Reads a file fully after boundary validation.
   */
  async readFileWithinRoot(
    requestedRelative: string,
  ): Promise<
    | { ok: true; content: Buffer; relativePath: string }
    | { ok: false; diagnostic: FilesystemDiagnostic }
  > {
    const resolved = await this.resolveWithinRoot(requestedRelative);
    if (!resolved.ok) {
      return resolved;
    }
    try {
      const content = await fsp.readFile(resolved.absolutePath);
      return { ok: true, content, relativePath: resolved.relativePath };
    } catch (error) {
      return {
        ok: false,
        diagnostic: {
          code: "FS-READ-FAILED",
          message: `read failed: ${describeError(error)}`,
          relativePath: resolved.relativePath,
        },
      };
    }
  }
}

function toPosixFrom(absoluteReal: string, canonicalRoot: string): string {
  const relative = path.relative(canonicalRoot, absoluteReal);
  return relative.split(path.sep).join("/");
}
