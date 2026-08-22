import { type FSWatcher, watch } from "node:fs";
import path from "node:path";
import { IGNORED_DIR_NAMES } from "../filesystem/ignore.js";

export interface WatchOptions {
  debounceMs?: number | undefined;
  signal?: AbortSignal | undefined;
  ignoredDirs?: readonly string[] | undefined;
}

export interface WatchHandle {
  stop(): void;
  done: Promise<void>;
}

/**
 * Watch runner (REQ-WATCH-001): coalesces fs events within the debounce
 * window into ONE callback with the changed repo-relative paths; respects
 * ignored directories (.git/node_modules/etc.); AbortSignal (Ctrl+C) stops
 * cleanly so callers can exit 0.
 */
export function startWatch(
  rootPath: string,
  options: WatchOptions & { onChange: (changedPaths: string[]) => void },
): WatchHandle {
  const debounceMs = Math.max(50, options.debounceMs ?? 400);
  const ignored = new Set([...(options.ignoredDirs ?? []), ...IGNORED_DIR_NAMES]);
  let timer: NodeJS.Timeout | undefined;
  const pending = new Set<string>();

  const flush = (): void => {
    timer = undefined;
    if (pending.size === 0) return;
    const paths = [...pending].sort();
    pending.clear();
    try {
      options.onChange(paths);
    } catch {
      // Listener errors must not kill the watcher loop.
    }
  };

  const handleChange = (relativeDir: string, entryName: string): void => {
    const relativeDirPosix = relativeDir.split("\\").join("/");
    for (const segment of relativeDirPosix.split("/")) {
      if (segment !== "" && ignored.has(segment)) return;
    }
    if (ignored.has(entryName)) return;
    pending.add(relativeDirPosix.length === 0 ? entryName : `${relativeDirPosix}/${entryName}`);
    timer ??= setTimeout(flush, debounceMs);
  };

  const watcher: FSWatcher = watch(rootPath, { recursive: true }, (_event, fileName) => {
    if (fileName === null) return;
    const full = fileName.split(path.sep).join("/");
    const slashIndex = full.lastIndexOf("/");
    const dirPart = slashIndex === -1 ? "" : full.slice(0, slashIndex);
    const namePart = slashIndex === -1 ? full : full.slice(slashIndex + 1);
    handleChange(dirPart, namePart);
  });

  watcher.on("error", () => {
    /* keep process alive; diagnostics handled by caller loop */
  });

  const done = new Promise<void>((resolve) => {
    const finish = (): void => {
      clearTimeout(timer);
      watcher.close();
      resolve();
    };
    if (options.signal?.aborted) finish();
    else options.signal?.addEventListener("abort", finish, { once: true });
  });

  return {
    stop: () => {
      clearTimeout(timer);
      watcher.close();
    },
    done,
  };
}
