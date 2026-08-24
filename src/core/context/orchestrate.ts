import path from "node:path";
import { loadAckitConfig } from "../config/index.js";
import type { RepositoryRoot } from "../filesystem/root.js";
import { buildInstructionGraph } from "../instructions/index.js";
import { policyDigest, resolvePolicy } from "../policy/index.js";
import { validateSkills } from "../skills/index.js";
import { TaskStore } from "../tasks/store.js";
import type { PackContextSection } from "./pack.js";

/**
 * Canonical context-pack orchestration (REQ-CTX-001): collects the effective
 * instruction graph, active tasks, skills catalog, effective policy summary
 * and repository metadata into the deterministic REQ-CTX-001 section set.
 *
 * BOTH the CLI `ackit pack` command and the MCP `ackit_pack` tool must call
 * this exact function so neither surface can drift into a weaker parallel
 * implementation (single source of truth, mirroring executeConfiguredScan).
 */
export async function buildCanonicalContextSections(
  root: RepositoryRoot,
  options: { signal?: AbortSignal | undefined } = {},
): Promise<PackContextSection[]> {
  const repositoryRoot = root.canonicalPath;
  const ensureLive = (): void => {
    if (options.signal?.aborted) throw new Error("context section collection aborted");
  };
  ensureLive();

  const graph = await buildInstructionGraph(root);
  ensureLive();
  const skills = await validateSkills(root);
  ensureLive();
  const store = new TaskStore(repositoryRoot);
  const activeTasks = (await store.list(false)).filter((doc) => doc.meta.status === "active");
  ensureLive();

  let policyLine = "policy digest: n/a";
  try {
    const configForPolicy = await loadAckitConfig(repositoryRoot);
    if (configForPolicy.ok) {
      const resolvedPolicy = await resolvePolicy(root, {
        entryFiles: configForPolicy.config.policy.extends,
      });
      policyLine = `policy digest: ${policyDigest(resolvedPolicy.policy)}`;
    }
  } catch {
    // Policy summary is advisory in pack context sections.
  }

  let pkgMeta = "";
  try {
    const fsMod = await import("node:fs/promises");
    const rawPkg = await fsMod.readFile(path.join(repositoryRoot, "package.json"), "utf8");
    const parsed = JSON.parse(rawPkg) as { name?: string; description?: string };
    pkgMeta = `${parsed.name ?? "?"}${parsed.description ? ` — ${parsed.description}` : ""}`;
  } catch {
    pkgMeta = "(no package.json)";
  }

  return [
    {
      id: "instruction-graph",
      title: "Instruction Graph Summary",
      body: `Nodes: ${graph.nodes.length}\nProviders: ${[...new Set(graph.nodes.map((n) => n.provider))].join(", ")}`,
    },
    {
      id: "active-tasks",
      title: "Active Tasks",
      body:
        activeTasks.length > 0
          ? activeTasks.map((doc) => `${doc.meta.id}: ${doc.meta.title}`).join("\n")
          : "(no active task)",
    },
    {
      id: "skills-catalog",
      title: "Skills Catalog",
      body:
        skills.skills.length > 0
          ? skills.skills.map((s) => `${s.name} — ${s.description}`).join("\n")
          : "(no skills discovered)",
    },
    { id: "policy-summary", title: "Policy Summary", body: policyLine },
    { id: "repository-metadata", title: "Repository Metadata", body: pkgMeta },
  ];
}
