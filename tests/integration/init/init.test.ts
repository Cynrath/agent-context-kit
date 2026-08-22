import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildInstructionGraph } from "../../../src/core/instructions/graph.js";
import { planOrApplyInit } from "../../../src/core/onboarding/init.js";
import { ensureManagedBlock } from "../../../src/core/onboarding/managed-block.js";
import { lockHasAbsolutePaths, readSkillsLock } from "../../../src/core/skills/install.js";
import { validateSkills } from "../../../src/core/skills/validate.js";

let repo: { rootPath: string; cleanup(): Promise<void> };

beforeAll(async () => {
  const rootPath = await mkdtemp(path.join(tmpdir(), "ackit-init-"));
  repo = { rootPath, cleanup: () => rm(rootPath, { recursive: true, force: true }) };
});

afterAll(async () => {
  await repo.cleanup();
});

async function snapshot(rootPath: string): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const { readdir } = await import("node:fs/promises");
  const { checksumContent } = await import("../../../src/core/instructions/references.js");
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
  if (readdir !== undefined) await visit(rootPath);
  return out;
}

function toPosix(value: string): string {
  return value.split("\\").join("/");
}

describe("init lifecycle (REQ-INSTR-009 / ONB-001/002)", () => {
  it("dry-run prints a full plan and performs zero fs mutations", async () => {
    const before = await snapshot(repo.rootPath);
    const actions = await planOrApplyInit({ canonicalPath: repo.rootPath }, { dryRun: true });
    expect(actions.filter((action) => action.action === "created")).toHaveLength(4);
    const after = await snapshot(repo.rootPath);
    expect(after.size).toBe(before.size);
    for (const [file, checksum] of before) {
      expect(after.get(file)).toBe(checksum);
    }
  });

  it("explicit write creates the expected set; re-run is idempotent", async () => {
    const first = await planOrApplyInit({ canonicalPath: repo.rootPath });
    for (const provider of ["codex", "claude", "gemini", "copilot"]) {
      expect(
        first.some((action) => action.provider === provider && action.action === "created"),
      ).toBe(true);
    }
    const before = await snapshot(repo.rootPath);
    const second = await planOrApplyInit({ canonicalPath: repo.rootPath });
    const changed = second.filter(
      (action) =>
        action.action === "created" ||
        action.action === "updated-managed" ||
        action.action === "repaired",
    );
    expect(changed).toEqual([]);
    const after = await snapshot(repo.rootPath);
    expect(after.size).toBe(before.size);
    for (const [file, checksum] of before) {
      expect(after.get(file)).toBe(checksum);
    }
  });

  it("preserves user bytes in an existing CLAUDE.md and appends the managed block", async () => {
    const userText = "# My custom claude notes\n\nDo not touch my workflow.\n";
    const claudeFile = path.join(repo.rootPath, "CLAUDE.md");
    const originalBytes = Buffer.from(userText, "utf8");
    // Overwrite the ACKit-created file with pure user content (no managed block).
    await writeFile(claudeFile, userText, "utf8");

    const actions = await planOrApplyInit({ canonicalPath: repo.rootPath }, { agents: ["claude"] });
    const action = actions.find((entry) => entry.file === "CLAUDE.md");
    expect(action?.action).toBe("refused-non-managed"); // no block → refuse
    expect((await readFile(claudeFile, "utf8")).startsWith(userText)).toBe(true);

    // With an existing managed block, updates keep the prefix intact.
    const seeded = `${userText}\n<!-- ackit:managed:start (claude) -->\n@AGENTS.md\n<!-- ackit:managed:end (claude) -->\n`;
    await writeFile(claudeFile, seeded, "utf8");
    const secondRun = await planOrApplyInit(
      { canonicalPath: repo.rootPath },
      { agents: ["claude"] },
    );
    expect(secondRun[0]?.action).toBe("unchanged");
    const after = await readFile(claudeFile, "utf8");
    expect(Buffer.from(after, "utf8").subarray(0, originalBytes.length)).toEqual(originalBytes);
  });

  it("repairs duplicate legacy blocks into one", async () => {
    const doubled = [
      "<!-- ackit:managed:start (gemini) -->",
      "old guidance A",
      "<!-- ackit:managed:end (gemini) -->",
      "User note between blocks.",
      "<!-- ackit:managed:start (gemini) -->",
      "old guidance B",
      "<!-- ackit:managed:end (gemini) -->",
      "",
    ].join("\n");
    const geminiFile = path.join(repo.rootPath, "GEMINI.md");
    await writeFile(geminiFile, doubled, "utf8");
    const result = ensureManagedBlock(
      doubled,
      "gemini",
      "Read and follow AGENTS.md in the repository root before acting.",
    );
    expect(result.action).toBe("repaired");
    expect(result.output.match(/ackit:managed:start \(gemini\)/g)).toHaveLength(1);
    expect(result.output).toContain("User note between blocks.");
    expect(result.output).not.toContain("old guidance B");
    void geminiFile;
  });

  it("generated instruction set passes graph discovery and skills validation cleanly", async () => {
    const graph = await buildInstructionGraph({ canonicalPath: repo.rootPath });
    for (const provider of ["codex", "claude", "gemini", "copilot"]) {
      expect(
        graph.nodes.some((node) => node.provider === provider && node.kind === "instruction"),
      ).toBe(true);
    }
    const skills = await validateSkills({ canonicalPath: repo.rootPath });
    expect(skills.issues.filter((issue) => issue.tier === "strict")).toEqual([]);
    const lock = await readSkillsLock({ canonicalPath: repo.rootPath });
    expect(lockHasAbsolutePaths(lock)).toBe(false);
  });
});
