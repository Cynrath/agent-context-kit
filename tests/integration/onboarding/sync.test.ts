import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { RepositoryRoot } from "../../../src/core/filesystem/root.js";
import { checksumContent } from "../../../src/core/instructions/references.js";
import { planOrApplyInit } from "../../../src/core/onboarding/init.js";
import { type ManagedSyncRow, planOrApplyManagedSync } from "../../../src/core/onboarding/sync.js";
import {
  installSkills,
  lockHasAbsolutePaths,
  readSkillsLock,
} from "../../../src/core/skills/install.js";

/**
 * Managed-asset sync lifecycle (TASK-0072): the 19-scenario matrix from the
 * task's Required tests. All fixtures are throwaway temp repos; no-write
 * claims are proven by full-tree checksum snapshots plus mtime where the
 * filesystem supports it.
 */

function toPosix(value: string): string {
  return value.split("\\").join("/");
}

async function snapshot(rootPath: string): Promise<Map<string, string>> {
  const { readdir } = await import("node:fs/promises");
  const out = new Map<string, string>();
  async function visit(dir: string): Promise<void> {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) await visit(absolute);
      else
        out.set(
          toPosix(path.relative(rootPath, absolute)),
          checksumContent(await readFile(absolute)),
        );
    }
  }
  await visit(rootPath);
  return out;
}

async function expectSameTree(
  before: Map<string, string>,
  after: Map<string, string>,
): Promise<void> {
  expect(after.size).toBe(before.size);
  for (const [file, checksum] of before) {
    expect(after.get(file)).toBe(checksum);
  }
}

function row(rows: ManagedSyncRow[], path: string): ManagedSyncRow | undefined {
  return rows.find((candidate) => candidate.path === path);
}

function rowsByStatus(rows: ManagedSyncRow[], status: ManagedSyncRow["status"]): ManagedSyncRow[] {
  return rows.filter((candidate) => candidate.status === status);
}

/** Isolated fixture factory: temp repo + optional builtin source dir. */
async function makeFixture(options: { builtins?: string[] } = {}): Promise<{
  root: RepositoryRoot;
  rootPath: string;
  builtinsDir: string;
  cleanup(): Promise<void>;
}> {
  const rootPath = await mkdtemp(path.join(tmpdir(), "ackit-sync-"));
  const builtinsDir = await mkdtemp(path.join(tmpdir(), "ackit-sync-builtin-"));
  const names = options.builtins ?? ["demo-skill"];
  for (const name of names) {
    const dir = path.join(builtinsDir, name);
    await mkdir(dir, { recursive: true });
    await writeFile(
      path.join(dir, "SKILL.md"),
      `---\nname: ${name}\ndescription: v1\n---\nv1 content\n`,
      "utf8",
    );
  }
  return {
    root: { canonicalPath: rootPath },
    rootPath,
    builtinsDir,
    cleanup: async () => {
      await rm(rootPath, { recursive: true, force: true });
      await rm(builtinsDir, { recursive: true, force: true });
    },
  };
}

async function bumpBuiltin(builtinsDir: string, name: string, body: string): Promise<void> {
  await writeFile(
    path.join(builtinsDir, name, "SKILL.md"),
    `---\nname: ${name}\ndescription: v2\n---\n${body}\n`,
    "utf8",
  );
}

describe("managed-asset sync — instruction surfaces (scenarios 1-7)", () => {
  let fixture: Awaited<ReturnType<typeof makeFixture>>;

  beforeAll(async () => {
    fixture = await makeFixture();
  });

  afterAll(async () => {
    await fixture.cleanup();
  });

  it("1. clean repo: dry-run plans would-create for all surfaces and writes nothing", async () => {
    const before = await snapshot(fixture.rootPath);
    const plan = await planOrApplyManagedSync(fixture.root, {
      dryRun: true,
      builtinsDir: fixture.builtinsDir,
    });
    expect(plan.mode).toBe("dry-run");
    expect(plan.readOnly).toBe(true);
    expect(row(plan.rows, "AGENTS.md")?.status).toBe("would-create");
    expect(row(plan.rows, "CLAUDE.md")?.status).toBe("would-create");
    expect(row(plan.rows, "GEMINI.md")?.status).toBe("would-create");
    expect(row(plan.rows, ".github/copilot-instructions.md")?.status).toBe("would-create");
    expect(row(plan.rows, ".agents/skills/demo-skill")?.status).toBe("would-create");
    await expectSameTree(before, await snapshot(fixture.rootPath));
  });

  it("2. existing user AGENTS.md without managed block → refused, bytes and mtime untouched", async () => {
    const userText = "# Human-authored instructions\n\nKeep my workflow.\n";
    const agentsPath = path.join(fixture.rootPath, "AGENTS.md");
    await writeFile(agentsPath, userText, "utf8");
    const before = await readFile(agentsPath, "utf8");
    const mtimeBefore = (await stat(agentsPath)).mtimeMs;

    const plan = await planOrApplyManagedSync(fixture.root, {
      dryRun: true,
      builtinsDir: fixture.builtinsDir,
    });
    expect(row(plan.rows, "AGENTS.md")?.status).toBe("refused-non-managed");

    // apply mode must also refuse (never writes user content)
    const applied = await planOrApplyManagedSync(fixture.root, {
      builtinsDir: fixture.builtinsDir,
    });
    expect(row(applied.rows, "AGENTS.md")?.status).toBe("refused-non-managed");
    expect(applied.blocked).toBe(true);
    expect(await readFile(agentsPath, "utf8")).toBe(before);
    expect((await stat(agentsPath)).mtimeMs).toBe(mtimeBefore);
  });

  it("3. managed AGENTS.md + user text outside the block → only the block updates, prefix preserved", async () => {
    const userPrefix = "# Human intro\n\nMy own rules stay here.\n\n";
    const blockV1 = [
      "<!-- ackit:managed:start (codex) -->",
      "old canonical text",
      "<!-- ackit:managed:end (codex) -->",
      "",
    ].join("\n");
    const agentsPath = path.join(fixture.rootPath, "AGENTS.md");
    await writeFile(agentsPath, userPrefix + blockV1, "utf8");

    const applied = await planOrApplyManagedSync(fixture.root, {
      builtinsDir: fixture.builtinsDir,
    });
    // With a managed block present the surface is ACKit-eligible again.
    const agentsRow = row(applied.rows, "AGENTS.md");
    expect(agentsRow?.status === "updated-managed" || agentsRow?.status === "up-to-date").toBe(
      true,
    );
    const after = await readFile(agentsPath, "utf8");
    expect(after.startsWith(userPrefix)).toBe(true); // user bytes preserved
    expect(after).toContain("ackit:managed:start (codex)");
    expect(after).not.toContain("old canonical text"); // only the block changed
  });

  it("4. canonical block unchanged → up-to-date with ZERO file write (mtime + checksum)", async () => {
    // Re-apply until stable, then prove the next run does not touch the file.
    await planOrApplyManagedSync(fixture.root, { builtinsDir: fixture.builtinsDir });
    const agentsPath = path.join(fixture.rootPath, "AGENTS.md");
    const before = await readFile(agentsPath, "utf8");
    const mtimeBefore = (await stat(agentsPath)).mtimeMs;

    const result = await planOrApplyManagedSync(fixture.root, { builtinsDir: fixture.builtinsDir });
    expect(row(result.rows, "AGENTS.md")?.status).toBe("up-to-date");
    expect(await readFile(agentsPath, "utf8")).toBe(before);
    expect((await stat(agentsPath)).mtimeMs).toBe(mtimeBefore); // no write at all
  });

  it("5. rule H: package VERSION changes but canonical content does not → zero writes", async () => {
    // Seed a fully-synced fixture, then simulate an ACKit upgrade by passing a
    // different version string while builtin content stays identical.
    await planOrApplyManagedSync(fixture.root, { builtinsDir: fixture.builtinsDir });
    const before = await snapshot(fixture.rootPath);
    const agentsPath = path.join(fixture.rootPath, "AGENTS.md");
    const claudePath = path.join(fixture.rootPath, "CLAUDE.md");
    const mtimes = await Promise.all([
      (await stat(agentsPath)).mtimeMs,
      (await stat(claudePath)).mtimeMs,
    ]);

    const upgraded = await planOrApplyManagedSync(fixture.root, {
      builtinsDir: fixture.builtinsDir,
      version: "99.0.0-simulated-upgrade", // version alone must NOT rewrite
    });
    expect(rowsByStatus(upgraded.rows, "up-to-date")).toHaveLength(upgraded.rows.length);
    expect(upgraded.inSync).toBe(true);
    expect(upgraded.blocked).toBe(false);
    await expectSameTree(before, await snapshot(fixture.rootPath));
    const mtimesAfter = await Promise.all([
      (await stat(agentsPath)).mtimeMs,
      (await stat(claudePath)).mtimeMs,
    ]);
    expect(mtimesAfter).toEqual(mtimes); // instruction files untouched
  });

  it("6. canonical content changes → managed block updates in place", async () => {
    // Simulate a canonical-content change by editing the installed block to a
    // stale value; sync must refresh ONLY the block (user prefix preserved).
    const agentsPath = path.join(fixture.rootPath, "AGENTS.md");
    const current = await readFile(agentsPath, "utf8");
    const stale = current.replace(
      /(<!-- ackit:managed:start \(codex\) -->)[\s\S]*?(<!-- ackit:managed:end \(codex\) -->)/,
      "$1\nstale v0.2-era guidance\n$2",
    );
    await writeFile(agentsPath, stale, "utf8");

    const applied = await planOrApplyManagedSync(fixture.root, {
      builtinsDir: fixture.builtinsDir,
    });
    expect(row(applied.rows, "AGENTS.md")?.status).toBe("updated-managed");
    const after = await readFile(agentsPath, "utf8");
    expect(after).not.toContain("stale v0.2-era guidance");
    expect(after).toContain("Docs-first, task-first"); // canonical content restored
  });

  it("7. provider shims follow the same ownership behavior (CLAUDE/GEMINI/copilot)", async () => {
    // CLAUDE.md user-authored without markers → refused like AGENTS.md.
    const claudePath = path.join(fixture.rootPath, "CLAUDE.md");
    await writeFile(claudePath, "# My claude config\n\nDon't touch.\n", "utf8");
    const plan = await planOrApplyManagedSync(fixture.root, {
      dryRun: true,
      builtinsDir: fixture.builtinsDir,
    });
    expect(row(plan.rows, "CLAUDE.md")?.status).toBe("refused-non-managed");

    // GEMINI.md currently canonical → up-to-date after the earlier apply.
    expect(row(plan.rows, "GEMINI.md")?.status).toBe("up-to-date");
    // copilot shim: .github/copilot-instructions.md was created earlier → up-to-date.
    expect(row(plan.rows, ".github/copilot-instructions.md")?.status).toBe("up-to-date");
  });
});

describe("managed-asset sync — skills ownership (scenarios 8-13)", () => {
  it("8, 10, 12. third-party collision / user-modified owned / force scope", async () => {
    const fixture = await makeFixture();
    try {
      // Install v1 (owned): 4 instruction surfaces + 1 skill created.
      const installed = await planOrApplyManagedSync(fixture.root, {
        builtinsDir: fixture.builtinsDir,
      });
      expect(rowsByStatus(installed.rows, "installed")).toHaveLength(5);
      expect(row(installed.rows, ".agents/skills/demo-skill")?.status).toBe("installed");
      const skillPath = path.join(fixture.rootPath, ".agents", "skills", "demo-skill", "SKILL.md");

      // 8. third-party takeover: drop the lock entry, modify content.
      const lock = await readSkillsLock(fixture.root);
      lock.skills = lock.skills.filter((entry) => entry.name !== "demo-skill");
      const { writeSkillsLock } = await import("../../../src/core/skills/install.js");
      await writeFile(skillPath, "# third-party skill\n", "utf8");
      await writeSkillsLock(fixture.root, lock);
      const thirdParty = await planOrApplyManagedSync(fixture.root, {
        dryRun: true,
        builtinsDir: fixture.builtinsDir,
      });
      expect(row(thirdParty.rows, ".agents/skills/demo-skill")?.status).toBe("refused-third-party");
      expect(await readFile(skillPath, "utf8")).toBe("# third-party skill\n"); // untouched

      // force must NOT rescue a third-party name.
      const forcedThirdParty = await planOrApplyManagedSync(fixture.root, {
        force: true,
        builtinsDir: fixture.builtinsDir,
      });
      expect(row(forcedThirdParty.rows, ".agents/skills/demo-skill")?.status).toBe(
        "refused-third-party",
      );
      expect(await readFile(skillPath, "utf8")).toBe("# third-party skill\n"); // still untouched (12)

      // Restore ownership: remove the third-party file so reinstall recreates
      // fresh ACKit ownership (installSkills refuses third-party names even
      // with --force, by design).
      const { rm } = await import("node:fs/promises");
      await rm(path.join(fixture.rootPath, ".agents", "skills", "demo-skill"), {
        recursive: true,
        force: true,
      });
      await installSkills(fixture.root, { builtinsDir: fixture.builtinsDir });

      // 10. owned + user-modified + builtin changed → conflict, file untouched.
      await bumpBuiltin(fixture.builtinsDir, "demo-skill", "v2 content");
      await writeFile(skillPath, "---\nname: demo-skill\ndescription: local\n---\nlocal\n", "utf8");
      const conflicted = await planOrApplyManagedSync(fixture.root, {
        dryRun: true,
        builtinsDir: fixture.builtinsDir,
      });
      expect(row(conflicted.rows, ".agents/skills/demo-skill")?.status).toBe(
        "conflict-user-modified",
      );
      expect(await readFile(skillPath, "utf8")).toContain("local"); // no silent clobber

      // apply (no force) also conflicts and does not write.
      const applyConflicted = await planOrApplyManagedSync(fixture.root, {
        builtinsDir: fixture.builtinsDir,
      });
      expect(row(applyConflicted.rows, ".agents/skills/demo-skill")?.status).toBe(
        "conflict-user-modified",
      );
      expect(applyConflicted.blocked).toBe(true);
      expect(await readFile(skillPath, "utf8")).toContain("local");

      // 11. force overwrites ONLY the ACKit-owned skill.
      const forced = await planOrApplyManagedSync(fixture.root, {
        force: true,
        builtinsDir: fixture.builtinsDir,
      });
      expect(row(forced.rows, ".agents/skills/demo-skill")?.status).toBe("updated");
      expect(await readFile(skillPath, "utf8")).toContain("v2 content");
    } finally {
      await fixture.cleanup();
    }
  });

  it("9. owned skill unchanged locally + builtin changed → update", async () => {
    const fixture = await makeFixture();
    try {
      await planOrApplyManagedSync(fixture.root, { builtinsDir: fixture.builtinsDir });
      await bumpBuiltin(fixture.builtinsDir, "demo-skill", "v2 content");
      const checkResult = await planOrApplyManagedSync(fixture.root, {
        check: true,
        builtinsDir: fixture.builtinsDir,
      });
      expect(checkResult.inSync).toBe(false); // would-update-managed pending
      // read-only: no writes yet
      const skillPath = path.join(fixture.rootPath, ".agents", "skills", "demo-skill", "SKILL.md");
      expect(await readFile(skillPath, "utf8")).toContain("v1 content");

      const applied = await planOrApplyManagedSync(fixture.root, {
        builtinsDir: fixture.builtinsDir,
      });
      expect(row(applied.rows, ".agents/skills/demo-skill")?.status).toBe("updated");
      expect(await readFile(skillPath, "utf8")).toContain("v2 content");
    } finally {
      await fixture.cleanup();
    }
  });

  it("12b. user instruction files are never overwritten even with --force", async () => {
    const fixture = await makeFixture();
    try {
      const agentsPath = path.join(fixture.rootPath, "AGENTS.md");
      await writeFile(agentsPath, "# Human-authored\n\nPrecious user text.\n", "utf8");
      const forced = await planOrApplyManagedSync(fixture.root, {
        force: true,
        builtinsDir: fixture.builtinsDir,
      });
      expect(row(forced.rows, "AGENTS.md")?.status).toBe("refused-non-managed");
      expect(await readFile(agentsPath, "utf8")).toBe("# Human-authored\n\nPrecious user text.\n");
    } finally {
      await fixture.cleanup();
    }
  });

  it("13. lock contains no absolute paths", async () => {
    const fixture = await makeFixture();
    try {
      await planOrApplyManagedSync(fixture.root, { builtinsDir: fixture.builtinsDir });
      const lock = await readSkillsLock(fixture.root);
      expect(lock.skills.length).toBeGreaterThan(0);
      expect(lockHasAbsolutePaths(lock)).toBe(false);
      // sync rows also carry only repository-relative paths
      const rows = (
        await planOrApplyManagedSync(fixture.root, {
          check: true,
          builtinsDir: fixture.builtinsDir,
        })
      ).rows;
      for (const entry of rows) {
        expect(path.isAbsolute(entry.path)).toBe(false);
        expect(entry.path).not.toMatch(/^[A-Za-z]:/);
        expect(entry.path.includes("\\")).toBe(false);
      }
    } finally {
      await fixture.cleanup();
    }
  });
});

describe("managed-asset sync — modes, determinism, idempotence (14-19)", () => {
  it("14. dry-run performs zero writes (full-tree snapshot)", async () => {
    const fixture = await makeFixture();
    try {
      const before = await snapshot(fixture.rootPath);
      const plan = await planOrApplyManagedSync(fixture.root, {
        dryRun: true,
        builtinsDir: fixture.builtinsDir,
      });
      expect(plan.mode).toBe("dry-run");
      await expectSameTree(before, await snapshot(fixture.rootPath));
    } finally {
      await fixture.cleanup();
    }
  });

  it("15. check performs zero writes and gates correctly (exit semantics via inSync)", async () => {
    const fixture = await makeFixture();
    try {
      const before = await snapshot(fixture.rootPath);
      const check = await planOrApplyManagedSync(fixture.root, {
        check: true,
        builtinsDir: fixture.builtinsDir,
      });
      expect(check.mode).toBe("check");
      expect(check.readOnly).toBe(true);
      expect(check.inSync).toBe(false); // everything would-create
      await expectSameTree(before, await snapshot(fixture.rootPath));

      // after apply, check reports in-sync
      await planOrApplyManagedSync(fixture.root, { builtinsDir: fixture.builtinsDir });
      const green = await planOrApplyManagedSync(fixture.root, {
        check: true,
        builtinsDir: fixture.builtinsDir,
      });
      expect(green.inSync).toBe(true);
      expect(green.blocked).toBe(false);
    } finally {
      await fixture.cleanup();
    }
  });

  it("16. JSON output deterministic across runs (CLI envelope carries ackit.managed-sync.v1)", async () => {
    const fixture = await makeFixture();
    try {
      await planOrApplyManagedSync(fixture.root, { builtinsDir: fixture.builtinsDir });
      const run1 = await planOrApplyManagedSync(fixture.root, {
        check: true,
        builtinsDir: fixture.builtinsDir,
      });
      const run2 = await planOrApplyManagedSync(fixture.root, {
        check: true,
        builtinsDir: fixture.builtinsDir,
      });
      expect(JSON.stringify(run1)).toBe(JSON.stringify(run2));

      // Pin the CLI JSON envelope end-to-end (regression guard for the
      // verifier's schema-label warning): runCli executes in-process, so
      // capture stdout and assert the schema identifier string.
      const { runCli } = await import("../../../src/cli/index.js");
      const chunks: string[] = [];
      const originalWrite = process.stdout.write;
      process.stdout.write = ((chunk: string) => {
        chunks.push(String(chunk));
        return true;
      }) as typeof process.stdout.write;
      let exitCode = 0;
      try {
        exitCode = await runCli([
          "node",
          "ackit",
          "--root",
          fixture.rootPath,
          "--json",
          "sync",
          "--check",
        ]);
      } finally {
        process.stdout.write = originalWrite;
      }
      expect(exitCode).toBe(1); // fixture seam skills are pending, not up-to-date
      const envelope = JSON.parse(chunks.join("")) as {
        schemaVersion: string;
        command: string;
        mode: string;
        inSync: boolean;
        rows: unknown[];
      };
      expect(envelope.schemaVersion).toBe("ackit.managed-sync.v1");
      expect(envelope.command).toBe("sync");
      expect(envelope.mode).toBe("check");
      expect(envelope.inSync).toBe(false);
      expect(Array.isArray(envelope.rows)).toBe(true);
    } finally {
      await fixture.cleanup();
    }
  });

  it("17. repeated sync is idempotent (second run all up-to-date, zero writes)", async () => {
    const fixture = await makeFixture();
    try {
      await planOrApplyManagedSync(fixture.root, { builtinsDir: fixture.builtinsDir });
      const before = await snapshot(fixture.rootPath);
      const second = await planOrApplyManagedSync(fixture.root, {
        builtinsDir: fixture.builtinsDir,
      });
      expect(rowsByStatus(second.rows, "up-to-date")).toHaveLength(second.rows.length);
      expect(second.inSync).toBe(true);
      await expectSameTree(before, await snapshot(fixture.rootPath));
    } finally {
      await fixture.cleanup();
    }
  });

  it("18. packaged-layout discovery: the built dist CLI discovers builtin templates", async () => {
    // The discovery walker resolves templates/skills by walking up from the
    // module directory. Two proofs:
    // (a) src build: discoverBuiltinSkills with no override finds the builtins;
    // (b) packaged artifact: the BUILT dist CLI (dist/ adjacent to templates/
    //     — exactly the tarball layout) installs all builtins into a temp
    //     consumer with no discovery seam, then reports up-to-date.
    const repoRoot = path.resolve(
      path.dirname(
        decodeURIComponent(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, "$1"),
      ),
      "..",
      "..",
      "..",
    );
    const { discoverBuiltinSkills } = await import("../../../src/core/skills/install.js");
    const discovered = await discoverBuiltinSkills();
    expect(discovered.skills.length).toBeGreaterThan(0);
    expect(discovered.skills.map((skill) => skill.name)).toContain("ackit-workflow");

    const { execFileSync } = await import("node:child_process");
    const { existsSync } = await import("node:fs");
    const cli = path.join(repoRoot, "dist", "cli", "index.js");
    const consumer = await mkdtemp(path.join(tmpdir(), "ackit-sync-distconsumer-"));
    try {
      const first = execFileSync(
        process.execPath,
        [cli, "--root", consumer, "--json", "skills", "install"],
        { encoding: "utf8" },
      );
      const outcomes = (JSON.parse(first) as { outcomes: Array<{ skill: string; status: string }> })
        .outcomes;
      expect(outcomes.map((outcome) => outcome.skill).sort()).toEqual([
        "ackit-context-optimization",
        "ackit-policy-authoring",
        "ackit-scan-and-fix",
        "ackit-workflow",
      ]);
      expect(outcomes.every((outcome) => outcome.status === "installed")).toBe(true);
      const sample = path.join(consumer, ".agents", "skills", "ackit-workflow", "SKILL.md");
      expect(existsSync(sample)).toBe(true);

      const second = execFileSync(
        process.execPath,
        [cli, "--root", consumer, "--json", "skills", "install"],
        { encoding: "utf8" },
      );
      const rerun = (JSON.parse(second) as { outcomes: Array<{ status: string }> }).outcomes;
      expect(rerun.every((outcome) => outcome.status === "up-to-date")).toBe(true);
    } finally {
      await rm(consumer, { recursive: true, force: true });
    }
  });

  it("19. legacy repositories retain current behavior (init/skills engines unchanged)", async () => {
    const fixture = await makeFixture();
    try {
      // init still works exactly as before on a fresh legacy-shaped repo.
      const initActions = await planOrApplyInit(fixture.root, { dryRun: true });
      expect(initActions.filter((action) => action.action === "created")).toHaveLength(4);
      const applied = await planOrApplyInit(fixture.root, { agents: ["codex"] });
      expect(
        applied.some((action) => action.provider === "codex" && action.action === "created"),
      ).toBe(true);
      // skills install path unchanged: same statuses the sync engine maps.
      const skills = await installSkills(fixture.root, { builtinsDir: fixture.builtinsDir });
      expect(skills.map((outcome) => outcome.status)).toEqual(["installed"]);
    } finally {
      await fixture.cleanup();
    }
  });
});
