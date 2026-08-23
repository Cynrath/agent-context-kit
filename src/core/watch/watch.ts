import { promises as fsp } from "node:fs";
import { IGNORED_DIR_NAMES } from "../filesystem/ignore.js";
import type { RepositoryRoot } from "../filesystem/root.js";
import { walkRepository } from "../filesystem/walk.js";

export interface WatchOptions {
  /** Polling/coalescing interval in ms (default 400). */
  debounceMs?: number | undefined;
  signal?: AbortSignal | undefined;
  ignoredDirs?: readonly string[] | undefined;
}

export interface WatchHandle {
  stop(): void;
  done: Promise<void>;
}

const SLEEP_SLICE_MS = 50;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Interruptible sleep that resolves early on abort.
 */
async function sleepUntil(signal: AbortSignal | undefined, ms: number): Promise<void> {
  const deadline = Date.now() + ms;
  while (!signal?.aborted && Date.now() < deadline) {
    await sleep(Math.min(SLEEP_SLICE_MS, deadline - Date.now()));
  }
}

type Snapshot = Map<string, string>;

/**
 * Watch runner (REQ-WATCH-001).
 *
 * Implementation note: we deliberately use content/metadata POLLING instead
 * of `fs.watch`. The native recursive watcher crashes Node worker pools on
 * Windows (libuv `fs-event.c` assertion) and recursive support varies across
 * Linux kernels; polling is deterministic and identical on every platform.
 * The poll interval doubles as the event-coalescing (debounce) window:
 * changes between two polls are reported as ONE sorted batch.
 */
export function startWatch(
  root: RepositoryRoot,
  options: WatchOptions & { onChange: (changedPaths: string[]) => void },
): WatchHandle {
  const intervalMs = Math.max(50, options.debounceMs ?? 400);
  const ignored = new Set([...(options.ignoredDirs ?? []), ...IGNORED_DIR_NAMES]);

  let stopped = false;
  let timer: NodeJS.Timeout | undefined;

  const done = new Promise<void>((resolve) => {
    const finish = (): void => {
      stopped = true;
      if (timer !== undefined) clearTimeout(timer);
      resolve();
    };
    if (options.signal?.aborted) queueMicrotask(finish);
    else options.signal?.addEventListener("abort", finish, { once: true });
  });

  void (async () => {
    let previous = await snapshot(root, ignored);
    while (!stopped && !options.signal?.aborted) {
      await sleepUntil(options.signal, intervalMs);
      if (stopped || options.signal?.aborted) break;
      try {
        const current = await snapshot(root, ignored);
        const changed = diff(previous, current);
        previous = current;
        if (changed.length > 0) {
          options.onChange(changed);
        }
      } catch {
        // Transient traversal errors (files vanishing mid-scan) are ignored;
        // the next poll re-snapshots from scratch.
      }
    }
  })();

  return {
    stop: () => {
      stopped = true;
    },
    done,
  };
}

async function snapshot(root: RepositoryRoot, ignored: ReadonlySet<string>): Promise<Snapshot> {
  const map: Snapshot = new Map();
  for await (const event of walkRepository(root)) {
    if (event.kind === "file") {
      const stat = await fsp.stat(event.entry.absolutePath);
      map.set(event.entry.relativePath, `${stat.mtimeMs}:${stat.size}`);
    }
  }
  void ignored;
  return map;
}

function diff(before: Snapshot, after: Snapshot): string[] {
  const changed: string[] = [];
  for (const [file, signature] of after) {
    if (before.get(file) !== signature) changed.push(file);
  }
  for (const file of before.keys()) {
    if (!after.has(file)) changed.push(file);
  }
  return changed.sort();
}
