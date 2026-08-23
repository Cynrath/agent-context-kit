import { promises as fsp } from "node:fs";
import path from "node:path";
import ignore, { type Ignore } from "ignore";
import picomatch from "picomatch";

/**
 * Ignore engine (REQ-FS-005): gitignore semantics plus built-in excludes
 * plus user excludes, with explainable decisions for debug mode.
 *
 * Layering (first match wins, evaluated in order):
 * 1. built-in structural excludes (.git, dependency dirs, build artifacts)
 * 2. per-directory .gitignore stack (root → current directory; deeper wins)
 * 3. user exclude globs from configuration
 */
export const IGNORED_DIR_NAMES: readonly string[] = [
  ".git",
  "node_modules",
  "vendor",
  "dist",
  "build",
  "out",
  "coverage",
  ".ackit",
  "artifacts",
];

export const BUILTIN_IGNORED_DIRECTORIES = new Set([
  ".git",
  "node_modules",
  "vendor",
  "dist",
  "build",
  "out",
  "coverage",
  ".ackit",
  "artifacts",
]);

export type IgnoreSource =
  | { layer: "builtin"; pattern: string }
  | { layer: "gitignore"; file: string }
  | { layer: "user-exclude"; pattern: string };

export interface IgnoreDecision {
  ignored: boolean;
  source?: IgnoreSource | undefined;
}

export interface IgnoreEngineOptions {
  userExcludeGlobs?: readonly string[] | undefined;
}

const ROOT_KEY = "";

export class IgnoreEngine {
  private readonly userMatcher: ((candidate: string) => boolean) | undefined;
  private readonly gitignoreCache = new Map<string, Ignore>();

  constructor(private readonly options: IgnoreEngineOptions = {}) {
    this.userMatcher =
      options.userExcludeGlobs && options.userExcludeGlobs.length > 0
        ? picomatch([...options.userExcludeGlobs], { dot: true })
        : undefined;
  }

  /** Structural decision used to prune directories during traversal. */
  isDirectoryIgnored(relativeDirPath: string): boolean {
    if (relativeDirPath.length === 0) {
      return false;
    }
    return this.decideFile(relativeDirPath).ignored;
  }

  /**
   * Full decision for a file or directory path with the explaining source.
   */
  decideFile(relativePath: string): IgnoreDecision {
    const segments = relativePath.split("/");
    const pathSegments = segments.slice(0, -1);
    for (const segment of pathSegments) {
      if (segment !== undefined && BUILTIN_IGNORED_DIRECTORIES.has(segment)) {
        return { ignored: true, source: { layer: "builtin", pattern: segment } };
      }
    }
    const lastSegment = segments[segments.length - 1];
    if (lastSegment !== undefined && BUILTIN_IGNORED_DIRECTORIES.has(lastSegment)) {
      return { ignored: true, source: { layer: "builtin", pattern: lastSegment } };
    }
    const dirs = ancestorDirectories(segments);
    for (const dir of dirs) {
      const matcher = this.gitignoreCache.get(gitignoreKey(dir));
      if (matcher?.ignores(relativePath)) {
        return {
          ignored: true,
          source: { layer: "gitignore", file: gitignoreDisplayPath(dir) },
        };
      }
    }
    if (this.userMatcher?.(relativePath)) {
      const pattern =
        findMatchingGlob(this.options.userExcludeGlobs ?? [], relativePath) ?? "(user glob)";
      return { ignored: true, source: { layer: "user-exclude", pattern } };
    }
    return { ignored: false };
  }

  /** Test seam: injects a gitignore layer for one directory without filesystem access. */
  injectGitignoreForTest(relativeDir: string, content: string): void {
    this.gitignoreCache.set(gitignoreKey(relativeDir), ignore().add(content));
  }

  /**
   * Lazily loads the .gitignore of one repository-relative directory into the
   * stack cache. Called by the traversal composer when entering a directory.
   * Missing files are cached as empty matchers so they are not re-read.
   */
  async loadGitignore(canonicalRoot: string, relativeDir: string): Promise<void> {
    const key = gitignoreKey(relativeDir);
    if (this.gitignoreCache.has(key)) {
      return;
    }
    const absolute =
      relativeDir === ROOT_KEY
        ? path.join(canonicalRoot, ".gitignore")
        : path.join(canonicalRoot, ...relativeDir.split("/"), ".gitignore");
    try {
      const content = await fsp.readFile(absolute, "utf8");
      this.gitignoreCache.set(key, ignore().add(content));
    } catch {
      this.gitignoreCache.set(key, ignore().add([]));
    }
  }
}

/** Ancestor directory chain of a relative path, root-first: ["", "a", "a/b"]. */
function ancestorDirectories(segments: string[]): string[] {
  const dirs: string[] = [ROOT_KEY];
  for (let index = 0; index < segments.length - 1; index += 1) {
    const previous = dirs[index] ?? ROOT_KEY;
    const segment = segments[index] ?? "";
    dirs.push(previous.length === 0 ? segment : `${previous}/${segment}`);
  }
  return dirs;
}

function gitignoreKey(relativeDir: string): string {
  return relativeDir;
}

function gitignoreDisplayPath(relativeDir: string): string {
  return relativeDir.length === 0 ? ".gitignore" : `${relativeDir}/.gitignore`;
}

function findMatchingGlob(globs: readonly string[], candidate: string): string | undefined {
  return globs.find((glob) => picomatch(glob, { dot: true })(candidate));
}
