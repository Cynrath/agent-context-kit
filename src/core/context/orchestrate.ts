import path from "node:path";
import { loadAckitConfig } from "../config/index.js";
import type { RepositoryRoot } from "../filesystem/root.js";
import { buildInstructionGraph } from "../instructions/index.js";
import { policyDigest, resolvePolicy } from "../policy/index.js";
import { validateSkills } from "../skills/index.js";
import { TaskStore } from "../tasks/store.js";
import type { PackContextSection } from "./pack.js";

/**
 * Stable advisory code (REQ-GOV-007) embedded in the policy-summary section
 * when policy resolution fails unexpectedly. The summary stays advisory, but
 * the failure is never silent: the explicit unavailable state plus this code
 * surface in every emitted pack artifact.
 */
export const CONTEXT_POLICY_SUMMARY_UNAVAILABLE = "context-policy-summary-failed";

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
    // Advisory by contract, but never silent (REQ-GOV-007): the explicit
    // unavailable state plus the stable code below surface the failure. No
    // raw error text is embedded — it could carry absolute paths or
    // machine-specific internals.
    policyLine = `policy status: unavailable (${CONTEXT_POLICY_SUMMARY_UNAVAILABLE})`;
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

/**
 * Task-aware pack context (TASK-0049 / ADR-0027 §5): deterministic ranking
 * inputs computed from the task document (declared scope + reference paths),
 * the referenced intent, the latest checkpoint, and the git changed set.
 * Shared by the CLI `ackit pack --task` and `--resume` so no parallel
 * implementation can drift.
 */
export async function buildTaskPackContext(
  root: RepositoryRoot,
  taskId: string,
): Promise<
  | {
      ok: true;
      taskId: string;
      taskContext: import("./pack.js").TaskPackContext;
      resumeSection: PackContextSection | null;
      taskDoc: { id: string; title: string; body: string; relativePath: string };
    }
  | { ok: false; diagnostic: { code: string; message: string } }
> {
  const repositoryRoot = root.canonicalPath;
  const store = new TaskStore(repositoryRoot);
  const found = await store.find(taskId);
  if (found === null) {
    return {
      ok: false,
      diagnostic: { code: "PACK-TASK-UNKNOWN", message: `unknown task '${taskId}'` },
    };
  }

  const { extractSection } = await import("../tasks/types.js");
  const affected = extractSection(found.doc.body, "Affected files") ?? "";
  const declaredScopeGlobs = affected
    .split("\n")
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter((line) => line.length > 0 && !line.startsWith("("));

  const referencePaths: string[] = [found.doc.relativePath];
  const metaExtra = found.doc.meta as {
    intentRef?: string | undefined;
    specRefs?: string[] | undefined;
    decisionRefs?: string[] | undefined;
    planRef?: string | undefined;
  };
  if (metaExtra.intentRef !== undefined) {
    const { IntentStore } = await import("../intent/store.js");
    const intent = await new IntentStore(repositoryRoot).find(metaExtra.intentRef);
    if (intent !== null) referencePaths.push(intent.doc.relativePath);
  }
  for (const ref of [
    ...(metaExtra.specRefs ?? []),
    ...(metaExtra.decisionRefs ?? []),
    ...(metaExtra.planRef !== undefined ? [metaExtra.planRef] : []),
  ]) {
    referencePaths.push(ref);
  }

  let changedFiles: string[] = [];
  try {
    const { changedFiles: gitChanged } = await import("../git/git.js");
    changedFiles = gitChanged(repositoryRoot);
  } catch {
    changedFiles = [];
  }

  let resumeSection: PackContextSection | null = null;
  try {
    const { CheckpointStore, renderResumeContext } = await import("../checkpoint/index.js");
    const checkpoints = new CheckpointStore(root, repositoryRoot);
    const latest = await checkpoints.latest(taskId);
    if (latest !== null) {
      const resume = renderResumeContext(
        latest,
        { id: found.doc.meta.id, title: found.doc.meta.title, status: found.doc.meta.status },
        null,
      );
      resumeSection = { id: "task-resume", title: "Task Resume", body: resume };
    }
  } catch {
    resumeSection = null;
  }

  return {
    ok: true,
    taskId,
    taskContext: { declaredScopeGlobs, referencePaths, changedFiles },
    resumeSection,
    taskDoc: {
      id: found.doc.meta.id,
      title: found.doc.meta.title,
      body: found.doc.body,
      relativePath: found.doc.relativePath,
    },
  };
}
