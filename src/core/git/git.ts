import { execFileSync } from "node:child_process";
import path from "node:path";

export class GitUnavailableError extends Error {
  readonly code = "GIT-UNAVAILABLE";
}

function run(rootPath: string, args: string[]): string {
  try {
    return execFileSync("git", ["-C", rootPath, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    const err = error as NodeJS.ErrnoException & { status?: number };
    if (err.code === "ENOENT") {
      throw new GitUnavailableError("git executable not found on PATH");
    }
    throw new GitUnavailableError(
      `git ${args.join(" ")} failed: ${err.message?.split("\n")[0] ?? "unknown"}`,
    );
  }
}

/** Parses `git status --porcelain` entries into repo-relative POSIX paths. */
function parsePorcelain(output: string): string[] {
  const files: string[] = [];
  for (const rawLine of output.split("\n")) {
    if (rawLine.length < 4) continue;
    let entry = rawLine.slice(3);
    if (entry.startsWith('"') && entry.endsWith('"')) {
      entry = entry.slice(1, -1);
    }
    files.push(path.normalize(entry).split("\\").join("/"));
  }
  return files;
}

export function changedFiles(rootPath: string): string[] {
  return parsePorcelain(run(rootPath, ["status", "--porcelain"]));
}

export function stagedFiles(rootPath: string): string[] {
  const out: string[] = [];
  for (const line of run(rootPath, ["status", "--porcelain"]).split("\n")) {
    if (line.length < 4) continue;
    const indexStatus = line[0] ?? " ";
    if (indexStatus !== " " && indexStatus !== "?") {
      let entry = line.slice(3);
      entry = entry.replace(/^"|"$/g, "");
      out.push(path.normalize(entry).split("\\").join("/"));
    }
  }
  return out;
}

export function untrackedFiles(rootPath: string): string[] {
  const out: string[] = [];
  for (const line of run(rootPath, ["status", "--porcelain"]).split("\n")) {
    if (line.length >= 4 && (line[1] === "?" || (line[0] === "?" && line[1] === "?"))) {
      let entry = line.slice(3);
      entry = entry.replace(/^"|"$/g, "");
      out.push(path.normalize(entry).split("\\").join("/"));
    }
  }
  return out;
}

/** Files differing between merge-base(from,to) and `to`. */
export function rangeFiles(rootPath: string, from: string, to = "HEAD"): string[] {
  const output = run(rootPath, ["diff", "--name-only", "-z", `${from}...${to}`]);
  return output
    .split("\0")
    .filter((entry) => entry.length > 0)
    .map((entry) => path.normalize(entry).split("\\").join("/"));
}

export function sinceFiles(rootPath: string, ref: string): string[] {
  return rangeFiles(rootPath, ref, "HEAD");
}

export interface GitFileSets {
  changed: string[];
  staged: string[];
  untracked: string[];
}

export function collectSets(rootPath: string): GitFileSets {
  return {
    changed: changedFiles(rootPath),
    staged: stagedFiles(rootPath),
    untracked: untrackedFiles(rootPath),
  };
}
