import { type Dirent, promises as fsp } from "node:fs";
import path from "node:path";
import { isInsideRoot } from "./paths.js";
import { describeError, type RepositoryRoot } from "./root.js";
import {
  DEFAULT_CONCURRENCY,
  type FilesystemDiagnostic,
  type TraversalLimits,
  type WalkEntry,
} from "./types.js";

export interface WalkOptions {
  limits?: TraversalLimits | undefined;
  signal?: AbortSignal | undefined;
}

export type WalkEvent =
  | { kind: "file"; entry: WalkEntry }
  | { kind: "directory"; relativePath: string; depth: number }
  | { kind: "diagnostic"; diagnostic: FilesystemDiagnostic };

interface PendingStat {
  name: string;
  relativePath: string;
  isSymbolic: boolean;
  depth: number;
}

/**
 * Deterministic breadth-first traversal of the repository (ADR-0005):
 *
 * - Directory entries are sorted by name and stats are processed in
 *   concurrency-sized batches; `Promise.all` preserves array order, so event
 *   order is stable regardless of concurrency.
 * - Symlinks/junctions/reparse points are followed only when their canonical
 *   target stays inside the root; otherwise a diagnostic is emitted and the
 *   entry is skipped.
 * - A visited-set of canonical directory paths terminates cyclic structures
 *   deterministically.
 * - All limit breaches emit diagnostics instead of truncating silently.
 */
export async function* walkRepository(
  root: RepositoryRoot,
  options: WalkOptions = {},
): AsyncGenerator<WalkEvent> {
  const limits = options.limits ?? {};
  const concurrency = Math.max(1, limits.concurrency ?? DEFAULT_CONCURRENCY);
  const deadline = limits.deadlineMs === undefined ? undefined : Date.now() + limits.deadlineMs;
  const visitedDirectories = new Set<string>();
  let filesYielded = 0;
  let bytesSeen = 0;

  interface QueueItem {
    absolutePath: string;
    relativePath: string;
    depth: number;
  }

  const queue: QueueItem[] = [{ absolutePath: root.canonicalPath, relativePath: "", depth: 0 }];
  visitedDirectories.add(root.canonicalPath);

  while (queue.length > 0) {
    if (options.signal?.aborted) {
      yield {
        kind: "diagnostic",
        diagnostic: { code: "FS-ABORTED", message: "traversal aborted" },
      };
      return;
    }
    if (deadline !== undefined && Date.now() > deadline) {
      yield {
        kind: "diagnostic",
        diagnostic: {
          code: "FS-DEADLINE-EXCEEDED",
          message: `traversal exceeded ${limits.deadlineMs}ms budget`,
        },
      };
      return;
    }
    const current = queue.shift() as QueueItem;
    if (limits.maxDepth !== undefined && current.depth >= limits.maxDepth) {
      yield {
        kind: "diagnostic",
        diagnostic: {
          code: "FS-LIMIT-DEPTH",
          message: `depth limit ${limits.maxDepth} reached; deeper directories pruned`,
          relativePath: current.relativePath || ".",
        },
      };
      continue;
    }
    let dirents: Dirent[];
    try {
      yield { kind: "directory", relativePath: current.relativePath, depth: current.depth };
      dirents = await fsp.readdir(current.absolutePath, { withFileTypes: true });
    } catch (error) {
      yield {
        kind: "diagnostic",
        diagnostic: {
          code: "FS-READ-FAILED",
          message: `readdir failed: ${describeError(error)}`,
          relativePath: current.relativePath || ".",
        },
      };
      continue;
    }
    dirents.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    const pending: PendingStat[] = dirents.map((dirent) => ({
      name: dirent.name,
      relativePath:
        current.relativePath.length === 0 ? dirent.name : `${current.relativePath}/${dirent.name}`,
      isSymbolic: dirent.isSymbolicLink(),
      depth: current.depth + 1,
    }));
    for (let offset = 0; offset < pending.length; offset += concurrency) {
      const batch = pending.slice(offset, offset + concurrency);
      const settled = await Promise.all(batch.map((item) => inspectEntry(item, root)));
      for (const outcome of settled) {
        if (outcome.kind === "file") {
          if (limits.maxFileBytes !== undefined && outcome.entry.sizeBytes > limits.maxFileBytes) {
            yield {
              kind: "diagnostic",
              diagnostic: {
                code: "FS-LIMIT-BYTES",
                message: `file exceeds the ${limits.maxFileBytes}-byte per-file limit; skipped`,
                relativePath: outcome.entry.relativePath,
              },
            };
            continue;
          }
          filesYielded += 1;
          bytesSeen += outcome.entry.sizeBytes;
          yield { kind: "file", entry: outcome.entry };
          if (limits.maxFiles !== undefined && filesYielded >= limits.maxFiles) {
            yield {
              kind: "diagnostic",
              diagnostic: {
                code: "FS-LIMIT-FILES",
                message: `file-count limit ${limits.maxFiles} reached; traversal stopped`,
              },
            };
            return;
          }
          if (limits.maxTotalBytes !== undefined && bytesSeen >= limits.maxTotalBytes) {
            yield {
              kind: "diagnostic",
              diagnostic: {
                code: "FS-LIMIT-BYTES",
                message: `total-bytes limit ${limits.maxTotalBytes} reached; traversal stopped`,
              },
            };
            return;
          }
        } else if (outcome.kind === "directory") {
          if (!visitedDirectories.has(outcome.absolutePath)) {
            visitedDirectories.add(outcome.absolutePath);
            queue.push({
              absolutePath: outcome.absolutePath,
              relativePath: outcome.relativePath,
              depth: outcome.depth,
            });
          } else {
            yield {
              kind: "diagnostic",
              diagnostic: {
                code: "FS-CYCLE-SKIPPED",
                message:
                  "directory already visited (symlink cycle); subtree skipped deterministically",
                relativePath: outcome.relativePath,
              },
            };
          }
        } else {
          yield { kind: "diagnostic", diagnostic: outcome.diagnostic };
        }
        if (options.signal?.aborted || (deadline !== undefined && Date.now() > deadline)) {
          yield {
            kind: "diagnostic",
            diagnostic: options.signal?.aborted
              ? { code: "FS-ABORTED", message: "traversal aborted" }
              : {
                  code: "FS-DEADLINE-EXCEEDED",
                  message: `traversal exceeded ${limits.deadlineMs}ms budget`,
                },
          };
          return;
        }
      }
    }
  }
}

type InspectOutcome =
  | { kind: "file"; entry: WalkEntry }
  | { kind: "directory"; absolutePath: string; relativePath: string; depth: number }
  | { kind: "skip"; diagnostic: FilesystemDiagnostic };

async function inspectEntry(item: PendingStat, root: RepositoryRoot): Promise<InspectOutcome> {
  const absoluteJoined = path.join(root.canonicalPath, ...item.relativePath.split("/"));
  try {
    if (item.isSymbolic) {
      const realTarget = await fsp.realpath(absoluteJoined);
      if (!isInsideRoot(root.canonicalPath, realTarget)) {
        return {
          kind: "skip",
          diagnostic: {
            code: "FS-SYMLINK-BLOCKED",
            message: "symlink/junction target resolves outside the repository root; skipped",
            relativePath: item.relativePath,
          },
        };
      }
      const stat = await fsp.stat(realTarget);
      if (stat.isDirectory()) {
        return {
          kind: "directory",
          absolutePath: realTarget,
          relativePath: item.relativePath,
          depth: item.depth,
        };
      }
      return {
        kind: "file",
        entry: { relativePath: item.relativePath, absolutePath: realTarget, sizeBytes: stat.size },
      };
    }
    const lstat = await fsp.lstat(absoluteJoined);
    if (lstat.isDirectory()) {
      return {
        kind: "directory",
        absolutePath: absoluteJoined,
        relativePath: item.relativePath,
        depth: item.depth,
      };
    }
    if (lstat.isFile()) {
      return {
        kind: "file",
        entry: {
          relativePath: item.relativePath,
          absolutePath: absoluteJoined,
          sizeBytes: lstat.size,
        },
      };
    }
    return {
      kind: "skip",
      diagnostic: {
        code: "FS-SYMLINK-BLOCKED",
        message: "special filesystem object skipped (not a regular file/directory)",
        relativePath: item.relativePath,
      },
    };
  } catch (error) {
    return {
      kind: "skip",
      diagnostic: {
        code: "FS-READ-FAILED",
        message: `stat failed: ${describeError(error)}`,
        relativePath: item.relativePath,
      },
    };
  }
}
