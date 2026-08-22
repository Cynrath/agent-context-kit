import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { RepositoryRoot } from "../../../src/core/filesystem/root.js";
import {
  buildInstructionGraph,
  resolveEffectiveStack,
} from "../../../src/core/instructions/graph.js";

let repo: { root: RepositoryRoot; cleanup(): Promise<void> };

beforeAll(async () => {
  const rootPath = await mkdtemp(path.join(tmpdir(), "ackit-instr-prov-"));
  repo = {
    root: { canonicalPath: rootPath },
    cleanup: () => rm(rootPath, { recursive: true, force: true }),
  };
  const r = rootPath;

  // Copilot: repo-wide + two path-specific instruction files.
  await mkdir(path.join(r, ".github", "instructions"), { recursive: true });
  await writeFile(path.join(r, ".github", "copilot-instructions.md"), "# copilot repo-wide\n");
  await writeFile(
    path.join(r, ".github", "instructions", "ts.instructions.md"),
    '---\napplyTo: "**/*.ts"\n---\nUse strict TypeScript.\n',
  );
  await writeFile(
    path.join(r, ".github", "instructions", "docs.instructions.md"),
    '---\napplyTo:\n  - "docs/**/*.md"\n---\nDocs tone guide.\n',
  );

  // Claude + Gemini roots.
  await writeFile(path.join(r, "CLAUDE.md"), "# claude root\n");
  await mkdir(path.join(r, "sub"), { recursive: true });
  await writeFile(path.join(r, "sub", "CLAUDE.md"), "# claude nested\n");

  // Skills catalog surfaces.
  await mkdir(path.join(r, ".agents", "skills", "release-helper"), { recursive: true });
  await writeFile(
    path.join(r, ".agents", "skills", "release-helper", "SKILL.md"),
    "---\nname: release-helper\ndescription: Guides releases.\n---\nSteps here.\n",
  );
});

afterAll(async () => {
  await repo.cleanup();
});

describe("copilot applyTo semantics (REQ-INSTR-004)", () => {
  it("associates ts.instructions.md only with matching paths", async () => {
    const graph = await buildInstructionGraph(repo.root);
    const chainForTs = resolveEffectiveStack(graph, "copilot", "src/app.ts");
    expect(chainForTs).toEqual([
      "instr:copilot:.github/copilot-instructions.md",
      "instr:copilot:.github/instructions/ts.instructions.md",
    ]);
    const chainForDocs = resolveEffectiveStack(graph, "copilot", "docs/guide.md");
    expect(chainForDocs).toContain("instr:copilot:.github/instructions/docs.instructions.md");
    expect(chainForDocs).not.toContain("instr:copilot:.github/instructions/ts.instructions.md");
    const chainWithoutPath = resolveEffectiveStack(graph, "copilot");
    expect(chainWithoutPath).toEqual(["instr:copilot:.github/copilot-instructions.md"]);
  });

  it("keeps provider chains isolated (claude does not see codex/copilot nodes)", async () => {
    const graph = await buildInstructionGraph(repo.root);
    const claudeChain = resolveEffectiveStack(graph, "claude");
    expect(claudeChain.every((id) => id.startsWith("instr:claude:"))).toBe(true);
    const nested = resolveEffectiveStack(graph, "claude");
    expect(nested).toContain("instr:claude:CLAUDE.md");
    expect(nested).toContain("instr:claude:sub/CLAUDE.md");
    expect(nested.indexOf("instr:claude:sub/CLAUDE.md")).toBeGreaterThan(
      nested.indexOf("instr:claude:CLAUDE.md"),
    );
  });

  it("links SKILL.md files as skill-kind nodes with frontmatter identity", async () => {
    const graph = await buildInstructionGraph(repo.root);
    const skillNode = graph.nodes.find((n) => n.id === "skill:release-helper");
    expect(skillNode).toBeDefined();
    expect(skillNode?.kind).toBe("skill");
    expect(skillNode?.relativePath).toBe(".agents/skills/release-helper/SKILL.md");
  });

  it("reports unknown instruction-like files only via absence — no crash on foreign names", async () => {
    await writeFile(path.join(repo.root.canonicalPath, "CURSOR.md"), "foreign\n");
    const graph = await buildInstructionGraph(repo.root);
    expect(graph.nodes.some((n) => n.relativePath === "CURSOR.md")).toBe(false);
    expect(graph.diagnostics).toHaveLength(0);
  });
});
