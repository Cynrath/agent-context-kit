import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runCli } from "../../../src/cli/index.js";
import type { RepositoryRoot } from "../../../src/core/filesystem/root.js";
import { readSkillsLock, writeSkillsLock } from "../../../src/core/skills/install.js";
import { EXIT_CODES } from "../../../src/shared/exit-codes.js";

/**
 * CLI-level regression tests for the `skills install --force` /
 * `skills sync --force` wiring fix (v0.4.1 maintenance).
 *
 * The subcommand actions previously read `force` from the parent
 * `skillsCommand.opts()` (which never carries `--force`), so the flag was
 * silently ignored and owned-modified skills stayed conflicted. These tests
 * drive the real Commander parsing via `runCli` into isolated temp repos.
 */

async function makeRepo(): Promise<{ root: RepositoryRoot; cleanup(): Promise<void> }> {
  const rootPath = await mkdtemp(path.join(tmpdir(), "ackit-skills-force-cli-"));
  return {
    root: { canonicalPath: rootPath },
    cleanup: () => rm(rootPath, { recursive: true, force: true }),
  };
}

function targetOf(repo: RepositoryRoot, skill = "ackit-workflow"): string {
  return path.join(repo.canonicalPath, ".agents", "skills", skill, "SKILL.md");
}

async function canonicalWorkflowSkill(): Promise<string> {
  const { discoverBuiltinSkills } = await import("../../../src/core/skills/install.js");
  const { skills } = await discoverBuiltinSkills();
  const workflow = skills.find((skill) => skill.name === "ackit-workflow");
  if (workflow === undefined) throw new Error("ackit-workflow builtin missing");
  return readFile(path.join(workflow.sourceDir, "SKILL.md"), "utf8");
}

describe("skills install/sync --force CLI wiring (v0.4.1)", () => {
  it("skills install without --force keeps owned local edits as conflict", async () => {
    const repo = await makeRepo();
    try {
      expect(
        await runCli(["node", "ackit", "--root", repo.root.canonicalPath, "skills", "install"]),
      ).toBe(EXIT_CODES.ok);
      await writeFile(targetOf(repo.root), "# local edit\n", "utf8");
      const code = await runCli([
        "node",
        "ackit",
        "--root",
        repo.root.canonicalPath,
        "skills",
        "install",
      ]);
      expect(code).toBe(EXIT_CODES.securityBoundary);
      expect(await readFile(targetOf(repo.root), "utf8")).toBe("# local edit\n");
    } finally {
      await repo.cleanup();
    }
  });

  it("skills install --force discards owned local edits", async () => {
    const repo = await makeRepo();
    try {
      expect(
        await runCli(["node", "ackit", "--root", repo.root.canonicalPath, "skills", "install"]),
      ).toBe(EXIT_CODES.ok);
      await writeFile(targetOf(repo.root), "# local edit\n", "utf8");
      const code = await runCli([
        "node",
        "ackit",
        "--root",
        repo.root.canonicalPath,
        "skills",
        "install",
        "--force",
      ]);
      expect(code).toBe(EXIT_CODES.ok);
      expect(await readFile(targetOf(repo.root), "utf8")).toBe(await canonicalWorkflowSkill());
    } finally {
      await repo.cleanup();
    }
  });

  it("skills sync --force discards owned local edits", async () => {
    const repo = await makeRepo();
    try {
      expect(
        await runCli(["node", "ackit", "--root", repo.root.canonicalPath, "skills", "install"]),
      ).toBe(EXIT_CODES.ok);
      await writeFile(targetOf(repo.root), "# local edit\n", "utf8");
      const code = await runCli([
        "node",
        "ackit",
        "--root",
        repo.root.canonicalPath,
        "skills",
        "sync",
        "--force",
      ]);
      expect(code).toBe(EXIT_CODES.ok);
      expect(await readFile(targetOf(repo.root), "utf8")).toBe(await canonicalWorkflowSkill());
    } finally {
      await repo.cleanup();
    }
  });

  it("third-party collision stays refused even with --force (both subcommands)", async () => {
    for (const subcommand of ["install", "sync"] as const) {
      const repo = await makeRepo();
      try {
        expect(
          await runCli(["node", "ackit", "--root", repo.root.canonicalPath, "skills", "install"]),
        ).toBe(EXIT_CODES.ok);
        const lock = await readSkillsLock(repo.root);
        lock.skills = lock.skills.filter((entry) => entry.name !== "ackit-workflow");
        await writeSkillsLock(repo.root, lock);
        await writeFile(targetOf(repo.root), "# third party\n", "utf8");
        const code = await runCli([
          "node",
          "ackit",
          "--root",
          repo.root.canonicalPath,
          "skills",
          subcommand,
          "--force",
        ]);
        expect(code, `skills ${subcommand} --force must still refuse third-party`).toBe(
          EXIT_CODES.securityBoundary,
        );
        expect(await readFile(targetOf(repo.root), "utf8")).toBe("# third party\n");
      } finally {
        await repo.cleanup();
      }
    }
  });
});
