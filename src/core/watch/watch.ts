import { type Dirent, type FSWatcher, promises as fsp, watch } from "node:fs";
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
 * Watch runner (REQ-WATCH-001).
 *
 * Implementation note: we deliberately do NOT use `fs.watch(recursive)` —
 * the recursive flag crashes worker-thread pools on Windows (libuv
 * fs-event.c assertion) and is unsupported on some Linux kernels. Instead we
 * watch every directory non-recursively and add/remove dir watchers as the
 * tree changes. Events are coalesced within the debounce window into ONE
 * callback with sorted repo-relative paths; AbortSignal (Ctrl+C) stops
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
  const dirWatchers = new Map<string, FSWatcher>();
  let stopped = false;

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

  const mark = (relativePath: string): void => {
    const segments = relativePath.split("/");
    for (const segment of segments.slice(0, -1)) {
      if (segment !== "" && ignored.has(segment)) return;
    }
    const last = segments[segments.length - 1];
    if (last === undefined || ignored.has(last) || last === rootBase) return;
    pending.add(relativePath);
    timer ??= setTimeout(flush, debounceMs);
  };

  const rootBase = path.basename(rootPath);

  const watchDir = (absoluteDir: string, relativeDir: string): void => {
    if (stopped || dirWatchers.has(absoluteDir)) return;
    let watcher: FSWatcher;
    try {
      watcher = watch(absoluteDir, (_event, fileName) => {
        const name = fileName === null ? "" : fileName.split("\\").join("/");
        if (name.length === 0) return;
        const relative = relativeDir.length === 0 ? name : `${relativeDir}/${name}`;
        // Directory create/delete → attach/detach sub-watchers.
        void fsp.stat(path.join(absoluteDir, name)).then(
          (stat) => {
            if (stat.isDirectory()) {
              for (const segment of relative.split("/")) {
                if (ignored.has(segment)) return;
              }
              watchDir(path.join(absoluteDir, name), relative);
            }
          },
          () => undefined,
        );
        mark(relative);
      });
    } catch {
      return; // directory vanished between listing and watching
    }
    watcher.on("error", () => {
      dirWatchers.delete(absoluteDir);
      void reAddLater(absoluteDir, relativeDir);
    });
    dirWatchers.set(absoluteDir, watcher);
  };

  const reAddLater = (absoluteDir: string, relativeDir: string): void => {
    setTimeout(() => watchDir(absoluteDir, relativeDir), 250);
  };

  const scanDirs = async (): Promise<void> => {
    async function visit(dir: string, relativeDir: string): Promise<void> {
      watchDir(dir, relativeDir);
      let entries: Dirent[];
      try {
        entries = await fsp.readdir(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (ignored.has(entry.name)) continue;
        const childRel = relativeDir.length === 0 ? entry.name : `${relativeDir}/${entry.name}`;
        await visit(path.join(dir, entry.name), childRel);
      }
    }
    await visit(rootPath, "");
  };

  const done = new Promise<void>((resolve) => {
    const finish = (): void => {
      stopped = true;
      clearTimeout(timer);
      for (const watcher of dirWatchers.values()) watcher.close();
      resolve();
    };
    if (options.signal?.aborted) queueMicrotask(finish);
    else options.signal?.addEventListener("abort", finish, { once: true });
  });

  void scanDirs();

  return {
    stop: () => {
      stopped = true;
      clearTimeout(timer);
      for (const watcher of dirWatchers.values()) watcher.close();
    },
    done,
  };
}
