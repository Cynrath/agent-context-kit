import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { analyzeOptimize, applyFixes, naiveLineDiff } from "../../../src/core/context/optimize.js";
import type { RepositoryRoot } from "../../../src/core/filesystem/root.js";

const CATEGORIES_EXPECTED: readonly string[] = [
  "conflicting-instructions",
  "redundant-content",
  "stale-reference",
  "oversized-context-doc",
  "duplicate-skill",
  "mis-scoped-applyto",
  "missing-workflow-skill",
  "missing-task-docs",
  "budget-overrun",
];

let dirty: { root: RepositoryRoot; cleanup(): Promise<void> };
let healthy: { root: RepositoryRoot; cleanup(): Promise<void> };

beforeAll(async () => {
  dirty = await makeDirtyFixture();
  healthy = await makeHealthyFixture();
});

afterAll(async () => {
  await dirty.cleanup();
  await healthy.cleanup();
});

async function makeDirtyFixture(): Promise<{ root: RepositoryRoot; cleanup(): Promise<void> }> {
  const rootPath = await mkdtemp(path.join(tmpdir(), "ackit-opt-dirty-"));
  const r = rootPath;
  // Conflicting conventions.
  await writeFile(
    path.join(r, "AGENTS.md"),
    "Always use pnpm as the package manager.\n[broken](gone.md)\n",
  );
  await writeFile(path.join(r, "CLAUDE.md"), "Use npm as the package manager.\n");
  // Oversized root instruction (pad beyond threshold).
  const huge = Array.from({ length: 400 }, () => "filler line for size").join("\n");
  await writeFile(path.join(r, "GEMINI.md"), huge);
  // Duplicate skill across two locations + mis-scoped applyTo.
  for (const dir of ["a", "b"]) {
    const skillDir = path.join(
      r,
      dir === "a" ? ".agents" : "ws",
      dir === "a" ? "skills" : path.join(".agents", "skills"),
      "dup-skill",
    );
    await mkdir(skillDir, { recursive: true });
    await writeFile(
      path.join(skillDir, "SKILL.md"),
      "---\nname: dup-skill\ndescription: duplicated\n---\nbody\n",
    );
  }
  // Redundant-content pair for the advisor.
  await mkdir(path.join(r, "dup1"), { recursive: true });
  await mkdir(path.join(r, "dup2"), { recursive: true });
  await writeFile(
    path.join(r, "dup1", "AGENTS.md"),
    "# Team process\nRun the same steps each week.\n",
  );
  await writeFile(
    path.join(r, "dup2", "AGENTS.md"),
    "# team process\nRun the SAME steps each week!\n",
  );
  await mkdir(path.join(r, ".github", "instructions"), { recursive: true });
  await writeFile(
    path.join(r, ".github", "instructions", "orphan.instructions.md"),
    '---\napplyTo: "**/*.orphan-ext"\n---\nnever applies\n',
  );
  return {
    root: { canonicalPath: rootPath },
    cleanup: () => rm(rootPath, { recursive: true, force: true }),
  };
}

async function makeHealthyFixture(): Promise<{ root: RepositoryRoot; cleanup(): Promise<void> }> {
  const rootPath = await mkdtemp(path.join(tmpdir(), "ackit-opt-healthy-"));
  await mkdir(path.join(rootPath, "docs", "tasks", "active"), { recursive: true });
  await writeFile(
    path.join(rootPath, "docs", "tasks", "active", "TASK-0001-seeded.md"),
    '---\nid: "TASK-0001"\ntitle: "Seeded"\nstatus: pending\nschemaVersion: 2\ndependencies:\n  []\ncreatedAt: "2026-08-22"\ncompletedAt: null\n---\nbody\n',
  );
  const skillDir = path.join(rootPath, ".agents", "skills");
  await mkdir(skillDir, { recursive: true });
  // Install builtins through the ownership engine so ackit-workflow exists.
  const { installSkills } = await import("../../../src/core/skills/install.js");
  await installSkills({ canonicalPath: rootPath });
  void skillDir;
  return {
    root: { canonicalPath: rootPath },
    cleanup: () => rm(rootPath, { recursive: true, force: true }),
  };
}

function gitStatusClean(rootPath: string): boolean {
  try {
    execFileSync("git", ["-C", rootPath, "init"], { stdio: "ignore" });
    execFileSync("git", ["-C", rootPath, "config", "user.email", "t@e.com"], { stdio: "ignore" });
    execFileSync("git", ["-C", rootPath, "config", "user.name", "T"], { stdio: "ignore" });
    execFileSync("git", ["-C", rootPath, "add", "-A"], { stdio: "ignore" });
    execFileSync("git", ["-C", rootPath, "commit", "-m", "base"], { stdio: "ignore" });
    const status = execFileSync("git", ["-C", rootPath, "status", "--porcelain"], {
      encoding: "utf8",
    });
    return status.trim().length === 0;
  } catch {
    return false;
  }
}

describe("optimize advisor (REQ-CTX-005)", () => {
  // Synchronous git fixture seeding (init + config + add + commit) involves
  // several process spawns that can exceed the default 5 s budget on cold
  // Windows runners; the assertions themselves are timing-independent.
  it("default run is read-only: dirty fixture analyzed while git stays clean", async () => {
    expect(gitStatusClean(dirty.root.canonicalPath)).toBe(true);
    const suggestions = await analyzeOptimize(dirty.root, { maxTokens: 1500 });
    const categories = new Set<string>(suggestions.map((suggestion) => suggestion.category));
    for (const category of CATEGORIES_EXPECTED) {
      expect(categories.has(category), `missing category ${category}`).toBe(true);
    }
    const status = execFileSync("git", ["-C", dirty.root.canonicalPath, "status", "--porcelain"], {
      encoding: "utf8",
    });
    expect(status.trim()).toBe("");
  }, 60_000);

  it("--fix refuses to silently write user-owned conflicting content (proposal only)", async () => {
    // The pnpm-vs-npm conflict lives in user files; fix mode must not touch them.
    const claudeBefore = await import("node:fs/promises").then((fsp) =>
      fsp.readFile(path.join(dirty.root.canonicalPath, "CLAUDE.md"), "utf8"),
    );
    const outcomes = await applyFixes(dirty.root, [
      {
        id: "conflicting-instructions0",
        category: "conflicting-instructions",
        severity: "high",
        message: "user conflict",
        evidencePaths: ["AGENTS.md", "CLAUDE.md"],
        remediation: "align manually",
        fixable: false,
      },
    ]);
    const claudeAfter = await import("node:fs/promises").then((fsp) =>
      fsp.readFile(path.join(dirty.root.canonicalPath, "CLAUDE.md"), "utf8"),
    );
    expect(claudeAfter).toBe(claudeBefore);
    expect(outcomes).toEqual([]); // non-fixable → nothing applied
  });

  it("dry-run proposal output is deterministic and diff-shaped", () => {
    const beforeText = "# managed start\nold line A\nkeep me\n";
    const afterText = "# managed start\nnew line B\nkeep me\n";
    const first = naiveLineDiff(beforeText, afterText);
    const second = naiveLineDiff(beforeText, afterText);
    expect(first).toEqual(second);
    expect(first.some((line) => line.startsWith("- old line A"))).toBe(true);
    expect(first.some((line) => line.startsWith("+ new line B"))).toBe(true);
    expect(first.some((line) => line === "  keep me")).toBe(true);
  });

  it("managed block round-trip preserves surrounding user text exactly", async () => {
    const { ensureManagedBlock } = await import("../../../src/core/onboarding/managed-block.js");
    const userPrefix = "User preamble.\n\n";
    const withBlock = `${userPrefix}<!-- ackit:managed:start (claude) -->\nstale\n<!-- ackit:managed:end (claude) -->\ntrailing user note\n`;
    const refreshed = ensureManagedBlock(withBlock, "claude", "@AGENTS.md");
    expect(refreshed.output.startsWith(userPrefix)).toBe(true);
    expect(refreshed.output.endsWith("trailing user note\n")).toBe(true);
    expect(refreshed.output).toContain("@AGENTS.md");
  });

  it("healthy repository produces zero suggestions (noise guard)", async () => {
    const suggestions = await analyzeOptimize(healthy.root);
    expect(suggestions).toEqual([]);
  });
});
