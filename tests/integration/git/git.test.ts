import { execFileSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  changedFiles,
  GitUnavailableError,
  rangeFiles,
  stagedFiles,
  untrackedFiles,
} from "../../../src/core/git/git.js";

function git(cwd: string, args: string[]): void {
  execFileSync("git", ["-C", cwd, ...args], { stdio: "ignore" });
}

async function initRepo(name: string): Promise<string> {
  const rootPath = await mkdtemp(path.join(tmpdir(), `ackit-${name}-`));
  git(rootPath, ["init"]);
  git(rootPath, ["config", "user.email", "test@example.com"]);
  git(rootPath, ["config", "user.name", "Test"]);
  return rootPath;
}

describe("git module (REQ-BASE-003)", () => {
  let repoA = "";
  let nonGit = "";

  beforeAll(async () => {
    repoA = await initRepo("git-a");
    await writeFile(path.join(repoA, "committed.txt"), "base\n");
    git(repoA, ["add", "."]);
    git(repoA, ["commit", "-m", "init"]);
    await writeFile(path.join(repoA, "modified.txt"), "worktree change\n");
    await writeFile(path.join(repoA, "untracked.txt"), "untracked\n");
    await writeFile(path.join(repoA, "second.txt"), "second commit\n");
    git(repoA, ["add", "second.txt"]);
    git(repoA, ["commit", "-m", "second"]);
    // Stage AFTER the second commit so it stays pending in the index.
    await writeFile(path.join(repoA, "staged.txt"), "staged content\n");
    git(repoA, ["add", "staged.txt"]);

    nonGit = await mkdtemp(path.join(tmpdir(), "ackit-nongit-"));
  }, 60_000);

  afterAll(async () => {
    await rm(repoA, { recursive: true, force: true });
    await rm(nonGit, { recursive: true, force: true });
  });

  it("collects changed/staged/untracked sets via porcelain output", () => {
    const changed = changedFiles(repoA);
    const staged = stagedFiles(repoA);
    const untracked = untrackedFiles(repoA);
    expect(staged).toContain("staged.txt");
    expect(untracked).toContain("untracked.txt");
    expect(changed).toContain("modified.txt");
    expect(changed).toContain("staged.txt");
    expect(changed).not.toContain("second.txt"); // committed before the working-tree edits
  });

  it("rangeFiles resolves a..HEAD via merge-base diff", () => {
    const files = rangeFiles(repoA, "HEAD~1", "HEAD");
    expect(files).toContain("second.txt");
  });

  it("non-git directory raises GitUnavailableError with clear message", async () => {
    expect(() => changedFiles(nonGit)).toThrow(GitUnavailableError);
    expect(() => stagedFiles(nonGit)).toThrow(/failed|not found/);
  });
});
