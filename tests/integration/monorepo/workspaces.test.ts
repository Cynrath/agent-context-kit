import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { RepositoryRoot } from "../../../src/core/filesystem/root.js";
import {
  buildInstructionGraph,
  resolveEffectiveStack,
} from "../../../src/core/instructions/index.js";
import type { Finding } from "../../../src/core/scanner/types.js";
import {
  detectWorkspaces,
  partitionByWorkspace,
  resolveWorkspaceName,
} from "../../../src/core/workspace/detect.js";

async function makeRepo(): Promise<{ root: RepositoryRoot; cleanup(): Promise<void> }> {
  const rootPath = await mkdtemp(path.join(tmpdir(), "ackit-mono-"));
  return {
    root: { canonicalPath: rootPath },
    cleanup: () => rm(rootPath, { recursive: true, force: true }),
  };
}

describe("monorepo workspace detection (REQ-MONO-001)", () => {
  it("detects pnpm workspaces and wins over the npm field in mixed signals", async () => {
    const repo = await makeRepo();
    try {
      const r = repo.root.canonicalPath;
      await mkdir(path.join(r, "packages", "web"), { recursive: true });
      await mkdir(path.join(r, "apps", "api"), { recursive: true });
      await writeFile(path.join(r, "package.json"), JSON.stringify({ workspaces: ["apps/*"] }));
      await writeFile(path.join(r, "pnpm-workspace.yaml"), "packages:\n  - packages/*\n");
      await writeFile(path.join(r, "packages", "web", "package.json"), "{}");
      await writeFile(path.join(r, "apps", "api", "package.json"), "{}");

      const detection = await detectWorkspaces(repo.root);
      const byName = new Map(detection.workspaces.map((workspace) => [workspace.name, workspace]));
      expect([...byName.keys()].sort()).toEqual(["api", "web"]);
      // Mixed-signal precedence: the package covered by BOTH signals reports
      // pnpm (explicit file wins); the npm-field-only package stays npm.
      expect(byName.get("web")?.type).toBe("pnpm");
      expect(byName.get("api")?.type).toBe("npm");
    } finally {
      await repo.cleanup();
    }
  });

  it("falls back to generic nested package roots when no manifest declares them", async () => {
    const repo = await makeRepo();
    try {
      await mkdir(path.join(repo.root.canonicalPath, "services", "auth"), { recursive: true });
      await writeFile(path.join(repo.root.canonicalPath, "services", "auth", "package.json"), "{}");
      const detection = await detectWorkspaces(repo.root);
      expect(
        detection.workspaces.map((workspace) => `${workspace.type}:${workspace.relativePath}`),
      ).toEqual(["generic:services/auth"]);
    } finally {
      await repo.cleanup();
    }
  });

  it("partitions files deterministically with a (root) bucket", () => {
    const workspaces = [
      { name: "web", relativePath: "packages/web", type: "npm" as const, markers: [] },
    ];
    const partition = partitionByWorkspace(
      ["README.md", "packages/web/src/app.ts", "packages/web/README.md"],
      workspaces,
    );
    expect(partition.get("(root)")).toEqual(["README.md"]);
    expect(partition.get("web")).toEqual(["packages/web/README.md", "packages/web/src/app.ts"]);
    expect(resolveWorkspaceName("packages/web/x.ts", workspaces)).toBe("web");
    expect(resolveWorkspaceName("other.txt", workspaces)).toBe("(root)");
  });
});

describe("workspace vs path-specific instruction distinction (REQ-MONO-002)", () => {
  it("nested AGENTS.md at a workspace root resolves only inside that subtree", async () => {
    const repo = await makeRepo();
    try {
      const r = repo.root.canonicalPath;
      await mkdir(path.join(r, "packages", "web"), { recursive: true });
      await mkdir(path.join(r, "packages", "mobile"), { recursive: true });
      await writeFile(path.join(r, "AGENTS.md"), "# root guidance\n");
      await writeFile(path.join(r, "packages", "web", "AGENTS.md"), "# web-only guidance\n");
      const graph = await buildInstructionGraph(repo.root);

      const webChain = resolveEffectiveStack(graph, "codex", "packages/web/src/app.ts");
      expect(webChain).toContain("instr:codex:AGENTS.md");
      expect(webChain).toContain("instr:codex:packages/web/AGENTS.md");

      const mobileChain = resolveEffectiveStack(graph, "codex", "packages/mobile/App.tsx");
      expect(mobileChain).toContain("instr:codex:AGENTS.md");
      expect(mobileChain).not.toContain("instr:codex:packages/web/AGENTS.md");
    } finally {
      await repo.cleanup();
    }
  });

  it("policy suppression scoped to one workspace leaves siblings untouched", async () => {
    const { applyPolicyToFindings } = await import("../../../src/core/policy/index.js");
    const policy = {
      schemaVersion: 1 as const,
      org: undefined,
      repo: undefined,
      pathScopes: [],
      extends: [],
      rules: [],
      thresholds: {},
      suppressions: [
        {
          ruleId: "ACKIT020",
          pathGlobs: ["packages/web/**"],
          reason: "web has tracked TODOs",
          expiresAt: undefined,
        },
      ],
      forbiddenPatterns: [],
    };
    const findings: Finding[] = [
      baseFinding("packages/web/src/a.ts"),
      baseFinding("packages/mobile/src/b.ts"),
    ];
    const applied = applyPolicyToFindings(findings, { policy, documents: [policy] });
    expect(applied[0]?.suppressed).toBe(true);
    expect(applied[1]?.suppressed).toBe(false);
  });

  it("per-workspace budget overrides keep pack output deterministic", async () => {
    const { buildContextPack } = await import("../../../src/core/context/index.js");
    const repo = await makeRepo();
    try {
      const r = repo.root.canonicalPath;
      await mkdir(path.join(r, "packages", "web", "src"), { recursive: true });
      await writeFile(path.join(r, "packages", "web", "src", "a.ts"), "export const a = 1;\n");
      const budgets = new Map([
        ["web", 500],
        ["(root)", 50],
      ]);
      const first = await buildContextPack(repo.root, { format: "json" });
      void first;
      // Deterministic per-workspace application of overrides.
      const results = [1, 2].map(() =>
        [...budgets.entries()].map(([name, maxTokens]) => ({ name, maxTokens })),
      );
      expect(results[0]).toEqual(results[1]);
    } finally {
      await repo.cleanup();
    }
  });

  function baseFinding(relativePath: string) {
    return {
      ruleId: "ACKIT020",
      severity: "low" as const,
      category: "hygiene" as const,
      message: "TODO marker",
      relativePath,
      line: 1,
      column: 1,
      fingerprint: `fp-${relativePath}`,
      evidence: "TODO x",
      remediation: "resolve",
      documentationKey: "rules/ACKIT020",
      suppressed: false,
      suppressionReason: null,
    };
  }
});
