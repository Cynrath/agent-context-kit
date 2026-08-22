import { type Dirent, promises as fsp } from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { isInsideRoot } from "../filesystem/paths.js";
import type { RepositoryRoot } from "../filesystem/root.js";

export interface DetectedWorkspace {
  /** Directory name of the workspace root. */
  name: string;
  /** Repo-relative POSIX directory path. */
  relativePath: string;
  type: "pnpm" | "npm" | "yarn" | "generic";
  /** Signals that contributed to this workspace entry. */
  markers: string[];
}

export interface WorkspaceDetection {
  workspaces: DetectedWorkspace[];
  diagnostics: string[];
}

async function readIfExists(file: string): Promise<string | null> {
  try {
    return await fsp.readFile(file, "utf8");
  } catch {
    return null;
  }
}

function _uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}

/**
 * Lightweight monorepo detection (REQ-MONO-001): metadata parsing only, no
 * framework dependencies. Precedence: explicit pnpm file > npm/yarn
 * workspaces field > generic nested package roots. Nx/Turbo marker files add
 * advisory labels without changing membership.
 */
export async function detectWorkspaces(root: RepositoryRoot): Promise<WorkspaceDetection> {
  const diagnostics: string[] = [];
  const found = new Map<string, DetectedWorkspace>();

  const add = (
    name: string,
    relativePath: string,
    type: DetectedWorkspace["type"],
    marker: string,
  ): void => {
    if (
      !isInsideRoot(root.canonicalPath, path.join(root.canonicalPath, ...relativePath.split("/")))
    ) {
      diagnostics.push(
        `workspace candidate '${relativePath}' escapes the repository root; ignored`,
      );
      return;
    }
    const existing = found.get(relativePath);
    if (existing === undefined) {
      found.set(relativePath, { name, relativePath, type, markers: [marker] });
      return;
    }
    if (!existing.markers.includes(marker)) existing.markers.push(marker);
  };

  const addGlobCandidates = async (
    globs: readonly string[],
    type: DetectedWorkspace["type"],
    marker: string,
  ): Promise<void> => {
    for (const glob of globs) {
      if (glob.startsWith("!")) continue;
      const cleanDir = toPosix(glob)
        .replace(/\/\*\*$/, "")
        .replace(/\/\*$/, "");
      if (cleanDir.length === 0) continue;
      const baseDir = path.join(root.canonicalPath, ...cleanDir.split("/"));
      const isChildWildcard = /\/\*$/.test(toPosix(glob)) || /\/\*\*$/.test(toPosix(glob));
      if (!isChildWildcard) {
        if (await isPackageDir(baseDir)) {
          add(path.basename(cleanDir), toPosix(cleanDir), type, marker);
        }
        continue;
      }
      // `dir/*` style: every direct child directory of `dir` with a package.json.
      let entries: Dirent[];
      try {
        entries = await fsp.readdir(baseDir, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const childAbsolute = path.join(baseDir, entry.name);
        if (await isPackageDir(childAbsolute)) {
          const rel = `${cleanDir}/${entry.name}`;
          add(entry.name, rel, type, marker);
        }
      }
    }
  };

  // 1) pnpm-workspace.yaml
  const pnpmRaw = await readIfExists(path.join(root.canonicalPath, "pnpm-workspace.yaml"));
  const pnpmGlobs: string[] = [];
  if (pnpmRaw !== null) {
    try {
      const parsed = parse(pnpmRaw) as { packages?: unknown };
      if (Array.isArray(parsed.packages)) {
        for (const pkg of parsed.packages) {
          if (typeof pkg === "string") pnpmGlobs.push(pkg);
        }
      } else {
        diagnostics.push("pnpm-workspace.yaml has no packages list; ignoring file");
      }
    } catch {
      diagnostics.push("pnpm-workspace.yaml is malformed; ignoring file");
    }
    await addGlobCandidates(pnpmGlobs, "pnpm", "pnpm-workspace.yaml");
  }

  // 2) npm/yarn workspaces field in the ROOT package.json
  const rootPkgRaw = await readIfExists(path.join(root.canonicalPath, "package.json"));
  const fieldGlobs: string[] = [];
  if (rootPkgRaw !== null) {
    try {
      const pkg = JSON.parse(rootPkgRaw) as { workspaces?: unknown };
      if (typeof pkg.workspaces === "string") fieldGlobs.push(pkg.workspaces);
      else if (Array.isArray(pkg.workspaces))
        fieldGlobs.push(...pkg.workspaces.filter((w): w is string => typeof w === "string"));
      else if (pkg.workspaces !== undefined && typeof pkg.workspaces === "object") {
        const nested = pkg.workspaces as { packages?: unknown };
        if (Array.isArray(nested.packages)) {
          for (const w of nested.packages) if (typeof w === "string") fieldGlobs.push(w);
        }
      }
    } catch {
      diagnostics.push("root package.json is malformed JSON; skipping workspaces field");
    }
    await addGlobCandidates(fieldGlobs, "npm", "package.json#workspaces");
  }

  // 3) Fallback: direct child directories with their own package.json.
  if (found.size === 0 && pnpmGlobs.length === 0 && fieldGlobs.length === 0) {
    let entries: Dirent[];
    try {
      entries = await fsp.readdir(root.canonicalPath, { withFileTypes: true });
    } catch {
      entries = [];
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (await isPackageDir(path.join(root.canonicalPath, entry.name))) {
        add(entry.name, toPosix(entry.name), "generic", "nested package.json");
        continue;
      }
      // Depth-2 generic roots (e.g., services/auth).
      let nested: Dirent[];
      try {
        nested = await fsp.readdir(path.join(root.canonicalPath, entry.name), {
          withFileTypes: true,
        });
      } catch {
        continue;
      }
      for (const child of nested) {
        if (!child.isDirectory()) continue;
        const rel = `${entry.name}/${child.name}`;
        if (await isPackageDir(path.join(root.canonicalPath, ...rel.split("/")))) {
          add(child.name, rel, "generic", "nested package.json");
        }
      }
    }
  }

  // Advisory markers for task-graph tools.
  for (const marker of ["nx.json", "turbo.json"]) {
    if ((await readIfExists(path.join(root.canonicalPath, marker))) !== null) {
      diagnostics.push(`${marker} present; task-graph execution remains out of scope`);
    }
  }

  return {
    workspaces: [...found.values()].sort((a, b) => (a.relativePath < b.relativePath ? -1 : 1)),
    diagnostics,
  };
}

/** Partitions repo-relative files into workspaces plus a "(root)" bucket. */
export function partitionByWorkspace(
  relativePaths: readonly string[],
  workspaces: readonly DetectedWorkspace[],
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  const push = (bucket: string, value: string): void => {
    const arr = map.get(bucket) ?? [];
    arr.push(value);
    map.set(bucket, arr);
  };
  for (const file of relativePaths) {
    let assigned = false;
    for (const workspace of workspaces) {
      if (file === workspace.relativePath || file.startsWith(`${workspace.relativePath}/`)) {
        push(workspace.name, file);
        assigned = true;
        break;
      }
    }
    if (!assigned) push("(root)", file);
  }
  for (const [bucket, files] of map) map.set(bucket, files.sort());
  return map;
}

export function resolveWorkspaceName(
  relativePath: string,
  workspaces: readonly DetectedWorkspace[],
): string {
  for (const workspace of workspaces) {
    if (
      relativePath === workspace.relativePath ||
      relativePath.startsWith(`${workspace.relativePath}/`)
    ) {
      return workspace.name;
    }
  }
  return "(root)";
}

async function isPackageDir(dir: string): Promise<boolean> {
  try {
    await fsp.access(path.join(dir, "package.json"));
    return true;
  } catch {
    return false;
  }
}

function toPosix(value: string): string {
  return value.split("\\").join("/");
}
