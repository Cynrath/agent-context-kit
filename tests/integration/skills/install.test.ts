import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { RepositoryRoot } from "../../../src/core/filesystem/root.js";
import {
  discoverBuiltinSkills,
  installSkills,
  lockHasAbsolutePaths,
  readSkillsLock,
} from "../../../src/core/skills/install.js";
import { validateSkills } from "../../../src/core/skills/validate.js";

const REPO_ROOT = path.resolve(
  path.dirname(
    decodeURIComponent(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, "$1"),
  ),
);

let repo: { root: RepositoryRoot; cleanup(): Promise<void> };

beforeAll(async () => {
  const rootPath = await mkdtemp(path.join(tmpdir(), "ackit-skills-install-"));
  repo = {
    root: { canonicalPath: rootPath },
    cleanup: () => rm(rootPath, { recursive: true, force: true }),
  };
});

afterAll(async () => {
  await repo.cleanup();
});

async function snapshot(rootPath: string): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  async function visit(dir: string): Promise<void> {
    const { readdir } = await import("node:fs/promises");
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) await visit(absolute);
      else
        out.set(toPosix(path.relative(rootPath, absolute)), toChecksum(await readFile(absolute)));
    }
  }
  const { checksumContent } = await import("../../../src/core/instructions/references.js");
  function toChecksum(buffer: Buffer): string {
    return checksumContent(buffer);
  }
  await visit(rootPath);
  return out;
}

function toPosix(value: string): string {
  return value.split("\\").join("/");
}

describe("builtin skills installation (REQ-SKILL-002/003/004)", () => {
  it("ships four valid built-in skills that pass the validation engine", async () => {
    const { skills } = await discoverBuiltinSkills();
    expect(skills.map((skill) => skill.name)).toEqual([
      "ackit-context-optimization",
      "ackit-policy-authoring",
      "ackit-scan-and-fix",
      "ackit-workflow",
    ]);
    // Validate them through the real engine by staging into a temp repo layout.
    const validationRootPath = await mkdtemp(path.join(tmpdir(), "ackit-builtin-validate-"));
    try {
      for (const skill of skills) {
        const target = path.join(validationRootPath, ".agents", "skills", skill.name);
        await mkdir(target, { recursive: true });
        const { cp } = await import("node:fs/promises");
        await cp(skill.sourceDir, target, { recursive: true });
      }
      const result = await validateSkills({ canonicalPath: validationRootPath });
      expect(result.skills.map((skill) => skill.name)).toEqual(skills.map((skill) => skill.name));
      expect(result.issues).toEqual([]);
    } finally {
      await rm(validationRootPath, { recursive: true, force: true });
    }
    void REPO_ROOT;
  });

  it("install on a clean repo creates the tree; second run is a zero diff", async () => {
    const first = await installSkills(repo.root);
    expect(first.every((outcome) => outcome.status === "installed")).toBe(true);
    const before = await snapshot(repo.root.canonicalPath);
    const second = await installSkills(repo.root);
    expect(second.every((outcome) => outcome.status === "up-to-date")).toBe(true);
    const after = await snapshot(repo.root.canonicalPath);
    expect(after.size).toBe(before.size);
    for (const [file, checksum] of before) {
      expect(after.get(file)).toBe(checksum);
    }
  });

  it("refuses pre-existing third-party skills with the same name and leaves them untouched", async () => {
    const conflicting = path.join(
      repo.root.canonicalPath,
      ".agents",
      "skills",
      "ackit-workflow",
      "SKILL.md",
    );
    const original = await readFile(conflicting, "utf8");
    // Simulate a third-party takeover by dropping the lock entry.
    const lock = await readSkillsLock(repo.root);
    lock.skills = lock.skills.filter((entry) => entry.name !== "ackit-workflow");
    const { writeSkillsLock } = await import("../../../src/core/skills/install.js");
    await writeFile(conflicting, "# user customized workflow\n", "utf8");
    await writeSkillsLock(repo.root, lock);

    const outcomes = await installSkills(repo.root);
    const refused = outcomes.find((outcome) => outcome.skill === "ackit-workflow");
    expect(refused?.status).toBe("refused-third-party");
    expect(await readFile(conflicting, "utf8")).not.toBe(original); // still user content

    // Restore owned state for later tests.
    const restored = await installSkills(repo.root, { force: false });
    void restored;
  });

  it("lock file contains zero absolute paths or backslashes", async () => {
    const lock = await readSkillsLock(repo.root);
    expect(lock.skills.length).toBeGreaterThan(0);
    expect(lockHasAbsolutePaths(lock)).toBe(false);
  });

  it("sync updates only lock-tracked entries; user-modified owned skill conflicts unless --force", async () => {
    const builtinsDir = await mkdtemp(path.join(tmpdir(), "ackit-builtin-src-"));
    const targetRepoPath = await mkdtemp(path.join(tmpdir(), "ackit-skills-sync-"));
    try {
      const skillSource = path.join(builtinsDir, "demo-skill");
      await mkdir(skillSource, { recursive: true });
      await writeFile(
        path.join(skillSource, "SKILL.md"),
        "---\nname: demo-skill\ndescription: v1\n---\nv1\n",
        "utf8",
      );

      // Install v1 into an isolated repo.
      const isolated = { root: { canonicalPath: targetRepoPath } as RepositoryRoot };
      const installed = await installSkills(isolated.root, { builtinsDir });
      expect(installed.map((o) => o.status)).toContain("installed");
      const targetSkill = path.join(targetRepoPath, ".agents", "skills", "demo-skill", "SKILL.md");

      // Bump the builtin to v2.
      await writeFile(
        path.join(skillSource, "SKILL.md"),
        "---\nname: demo-skill\ndescription: v2\n---\nv2 content\n",
        "utf8",
      );

      // User modifies the owned skill locally.
      await writeFile(
        targetSkill,
        "---\nname: demo-skill\ndescription: local edit\n---\nlocal\n",
        "utf8",
      );

      const conflicted = await installSkills(isolated.root, { builtinsDir });
      expect(conflicted.map((o) => o.status)).toContain("conflict-user-modified");
      expect(await readFile(targetSkill, "utf8")).toContain("local edit"); // no silent clobber

      const forced = await installSkills(isolated.root, { builtinsDir, force: true });
      expect(forced.map((o) => o.status)).toContain("updated");
      expect(await readFile(targetSkill, "utf8")).toContain("v2 content");

      const lock = await readSkillsLock(isolated.root);
      const entry = lock.skills.find((skill) => skill.name === "demo-skill");
      expect(entry?.checksum).toBe(
        (await import("../../../src/core/instructions/references.js")).checksumContent(
          await readFile(path.join(skillSource, "SKILL.md")),
        ),
      );
    } finally {
      await rm(builtinsDir, { recursive: true, force: true });
      await rm(targetRepoPath, { recursive: true, force: true });
    }
  });
});
