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
let globalDir = "";

async function makeRepo(): Promise<{ root: RepositoryRoot; cleanup(): Promise<void> }> {
  const rootPath = await mkdtemp(path.join(tmpdir(), "ackit-instr-codex-"));
  return {
    root: { canonicalPath: rootPath },
    cleanup: () => rm(rootPath, { recursive: true, force: true }),
  };
}

beforeAll(async () => {
  repo = await makeRepo();
  globalDir = await mkdtemp(path.join(tmpdir(), "ackit-instr-global-"));
  const r = repo.root.canonicalPath;
  await writeFile(path.join(r, "AGENTS.md"), "# root agents\n[guide](docs/guide.md)\n");
  await mkdir(path.join(r, "docs"), { recursive: true });
  await writeFile(path.join(r, "docs", "guide.md"), "guide body\n");
  await mkdir(path.join(r, "packages", "web"), { recursive: true });
  await writeFile(path.join(r, "packages", "web", "AGENTS.md"), "# web nested agents\n");
  await mkdir(path.join(r, "apps", "api"), { recursive: true });
  await writeFile(path.join(r, "apps", "api", "AGENTS.md"), "# api base\n");
  await writeFile(path.join(r, "apps", "api", "AGENTS.override.md"), "# api override wins\n");
  await writeFile(path.join(globalDir, "AGENTS.md"), "# codex global\n");
});

afterAll(async () => {
  await repo.cleanup();
  await rm(globalDir, { recursive: true, force: true });
});

describe("codex adapter (REQ-INSTR-005)", () => {
  it("discovers global, project root, nested and override surfaces", async () => {
    const graph = await buildInstructionGraph(repo.root, { codexGlobalDir: globalDir });
    const paths = graph.nodes.map((n) => n.relativePath);
    expect(paths).toContain("AGENTS.md");
    expect(paths).toContain("packages/web/AGENTS.md");
    expect(paths).toContain("apps/api/AGENTS.md");
    expect(paths).toContain("apps/api/AGENTS.override.md");
    expect(graph.nodes.find((n) => n.id === "instr:codex:codex-global")).toBeDefined();
  });

  it("orders the effective chain global → root → nested (deterministic tie-break) → override last", async () => {
    const graph = await buildInstructionGraph(repo.root, { codexGlobalDir: globalDir });
    const chain = resolveEffectiveStack(graph, "codex");
    expect(chain).toEqual([
      "instr:codex:codex-global",
      "instr:codex:AGENTS.md",
      "instr:codex:apps/api/AGENTS.md",
      "instr:codex:packages/web/AGENTS.md",
      "instr:codex:apps/api/AGENTS.override.md",
    ]);
  });

  it("override outranks its same-directory base for scoped resolution", async () => {
    const graph = await buildInstructionGraph(repo.root);
    const base = graph.nodes.find((n) => n.relativePath === "apps/api/AGENTS.md");
    const override = graph.nodes.find((n) => n.relativePath === "apps/api/AGENTS.override.md");
    expect(override?.precedence).toBeGreaterThan(base?.precedence ?? -1);
  });

  it("marks broken references without crashing discovery", async () => {
    const r = repo.root.canonicalPath;
    await writeFile(path.join(r, "apps", "api", "AGENTS.md"), "# api\n[missing](nope.md)\n");
    const graph = await buildInstructionGraph(repo.root);
    const apiNode = graph.nodes.find((n) => n.relativePath === "apps/api/AGENTS.md");
    expect(apiNode?.status).toBe("broken-reference");
    // restore valid content
    await writeFile(path.join(r, "apps", "api", "AGENTS.md"), "# api base\n");
  });

  it("resolves valid references as ok with recorded targets", async () => {
    const r = repo.root.canonicalPath;
    await mkdir(path.join(r, "docs"), { recursive: true });
    await writeFile(path.join(r, "docs", "guide.md"), "guide body\n");
    const graph = await buildInstructionGraph(repo.root);
    const rootNode = graph.nodes.find((n) => n.relativePath === "AGENTS.md");
    expect(rootNode?.status).toBe("ok");
    expect(rootNode?.references).toContain("docs/guide.md");
  });

  it("graph construction is deterministic for identical inputs", async () => {
    const a = await buildInstructionGraph(repo.root, { codexGlobalDir: globalDir });
    const b = await buildInstructionGraph(repo.root, { codexGlobalDir: globalDir });
    expect(b.nodes).toEqual(a.nodes);
    expect(b.diagnostics).toEqual(a.diagnostics);
  });
});
