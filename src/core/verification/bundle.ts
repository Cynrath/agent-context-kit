import { CheckpointStore } from "../checkpoint/index.js";
import { assertNoSecretShapes } from "../context/pack.js";
import { declaredScopeGlobs } from "../drift/check.js";
import { EvidenceStore } from "../evidence/index.js";
import type { RepositoryRoot } from "../filesystem/root.js";
import { changedFiles } from "../git/git.js";
import { IntentStore, intentFingerprint } from "../intent/index.js";
import { TaskStore } from "../tasks/index.js";
import type { TaskDoc } from "../tasks/types.js";
import { resolveLifecycleGates } from "../workflow/gates.js";
import { WorkflowStore } from "../workflow/index.js";
import { VerdictStore } from "./store.js";

/** Bundle header schema id (ADR-0026 §3). */
export const VERIFICATION_BUNDLE_SCHEMA_ID = "ackit.verification-bundle.v1";

export interface BuildBundleOptions {
  /** Include the full diff (byte-capped) instead of omitting it. */
  diff?: boolean | undefined;
  /** Diff byte cap when --diff is used (default 32 KiB). */
  maxDiffBytes?: number | undefined;
  format?: "markdown" | "json" | undefined;
}

export interface VerificationBundle {
  markdown: string;
  json: string;
}

interface BundleParts {
  taskId: string;
  intentBlock: string;
  workflow: { profile: string; stage: string } | null;
  evidenceBlock: string;
  verdictBlock: string;
  checkpointBlock: string;
  surfaceBlock: string;
  diffBlock: string;
  /** Resolved verification-point lifecycle gate (ADR-0028 §3). */
  gateRequirements: string[];
  taskDoc: Pick<TaskDoc, "body" | "relativePath"> & {
    meta: Pick<TaskDoc["meta"], "id" | "title" | "status">;
  };
}

/**
 * Deterministic, bounded verification bundle (ADR-0026 §3): exactly the
 * relevant material for a fresh-context verifier — never a repository dump.
 * The canonical secret gate runs over every emitted surface (defense in depth
 * identical to packs, THREAT_MODEL T26).
 */
export async function buildVerificationBundle(
  root: RepositoryRoot,
  taskId: string,
  options: BuildBundleOptions = {},
): Promise<
  | { ok: true; bundle: VerificationBundle }
  | { ok: false; diagnostic: { code: string; message: string } }
> {
  const rootPath = root.canonicalPath;
  const tasks = new TaskStore(rootPath);
  const found = await tasks.find(taskId);
  if (found === null) {
    return {
      ok: false,
      diagnostic: { code: "BUNDLE-TASK-UNKNOWN", message: `unknown task '${taskId}'` },
    };
  }

  const workflowStore = new WorkflowStore(root);
  const wf = await workflowStore.load(taskId);

  let intentBlock = "(no intent referenced)";
  const metaExtra = found.doc.meta as { intentRef?: string | undefined };
  if (metaExtra.intentRef !== undefined) {
    const intents = new IntentStore(rootPath);
    const intent = await intents.find(metaExtra.intentRef);
    if (intent !== null) {
      const fingerprint = intentFingerprint(intent.doc.meta);
      intentBlock = [
        `${intent.doc.meta.id}: ${intent.doc.meta.title} [${intent.doc.meta.status}]`,
        `fingerprint: ${fingerprint}`,
        `problem: ${intent.doc.meta.problem}`,
        `desired outcome: ${intent.doc.meta.desiredOutcome}`,
        `non-goals: ${intent.doc.meta.nonGoals.join("; ") || "(none)"}`,
        `acceptance criteria: ${
          intent.doc.meta.acceptanceCriteria.map((c) => `${c.id} ${c.requirement}`).join(" | ") ||
          "(none in intent)"
        }`,
      ].join("\n");
    } else {
      intentBlock = `(intent '${metaExtra.intentRef}' referenced but not found)`;
    }
  }

  const evidenceStore = new EvidenceStore(root);
  const evidence = await evidenceStore.load(taskId);
  const evidenceBlock =
    evidence === null
      ? "(no evidence registry — run 'ackit evidence sync')"
      : evidence.criteria
          .map(
            (c) =>
              `${c.id} [${c.status}] ${c.requirement}${
                c.evidence.length > 0
                  ? `\n    evidence: ${c.evidence.map((e) => `${e.type}: ${e.ref}`).join(" / ")}`
                  : ""
              }`,
          )
          .join("\n");

  const verdictStore = new VerdictStore(rootPath);
  const verdicts = await verdictStore.list(taskId);
  const verdictBlock =
    verdicts.length === 0
      ? "(no verdicts registered yet — you are the fresh verifier)"
      : verdicts
          .map(
            (v) =>
              `${v.id} ${v.verdict} by ${v.verifier.agent} (${v.verifier.context}, ${v.verifier.issuedAt})${
                v.findings.length > 0
                  ? `\n    findings: ${v.findings
                      .map(
                        (f) =>
                          `${f.severity} ${f.code}${f.criterion !== undefined ? `@${f.criterion}` : ""}: ${f.message}`,
                      )
                      .join(" | ")}`
                  : ""
              }`,
          )
          .join("\n");

  const checkpoints = new CheckpointStore(root, rootPath);
  const checkpoint = await checkpoints.latest(taskId);
  const checkpointBlock =
    checkpoint === null
      ? "(no checkpoint)"
      : [
          `${checkpoint.id} at git ${
            checkpoint.gitUnavailable ? "(git was unavailable)" : checkpoint.gitHead
          } (${checkpoint.createdAt})`,
          `next action: ${checkpoint.nextAction.objective}`,
          checkpoint.nextAction.path !== undefined
            ? `next path: ${checkpoint.nextAction.path}`
            : "",
        ]
          .filter((line) => line.length > 0)
          .join("\n");

  // Implementation surface: declared scope vs current changed set (bounded).
  const globs = declaredScopeGlobs(found.doc);
  let changed: string[] = [];
  try {
    changed = changedFiles(rootPath);
  } catch {
    changed = [];
  }
  const surfaceBlock = [
    `declared affected areas: ${globs.join(", ") || "(none declared)"}`,
    `current changed/untracked files (${changed.length}): ${changed.join(", ") || "(none)"}`,
  ].join("\n");

  let diffBlock = "(diff omitted — pass --diff for the capped full diff)";
  if (options.diff === true) {
    try {
      const { execFileSync } = await import("node:child_process");
      const out = execFileSync("git", ["-C", rootPath, "diff", "HEAD"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
      const cap = options.maxDiffBytes ?? 32_768;
      const truncated = Buffer.byteLength(out) > cap;
      const capped = truncated ? `${out.slice(0, cap)}\n(diff truncated at byte cap)` : out;
      diffBlock = capped;
    } catch {
      diffBlock = "(diff unavailable — git error or clean tree)";
    }
  }

  // Verification-point lifecycle gate (ADR-0028 §3): the bundle header lists
  // the resolved requirements so the verifier sees exactly which apply.
  const { gates } = resolveLifecycleGates([]);
  const verificationGate = gates.find((gate) => gate.point === "verification");
  const gateRequirements: string[] = [];
  if (verificationGate !== undefined) {
    if (verificationGate.requireArtifacts.length > 0) {
      gateRequirements.push(`artifacts: ${verificationGate.requireArtifacts.join(", ")}`);
    }
    if (verificationGate.requireEvidenceVerified) {
      gateRequirements.push("evidence verified required");
    }
    if (verificationGate.requireVerdict) {
      gateRequirements.push("verdict required");
    }
    if (verificationGate.requireCleanDrift) {
      gateRequirements.push("clean drift required");
    }
    if (verificationGate.message !== null) {
      gateRequirements.push(`note: ${verificationGate.message}`);
    }
  }

  const parts: BundleParts = {
    taskId,
    intentBlock,
    workflow: wf !== null ? { profile: wf.profile, stage: wf.stage } : null,
    evidenceBlock,
    verdictBlock,
    checkpointBlock,
    surfaceBlock,
    diffBlock,
    gateRequirements,
    taskDoc: {
      meta: {
        id: found.doc.meta.id,
        title: found.doc.meta.title,
        status: found.doc.meta.status,
      },
      body: found.doc.body,
      relativePath: found.doc.relativePath,
    },
  };
  return { ok: true, bundle: render(parts) };
}

function render(parts: BundleParts): VerificationBundle {
  const lines: string[] = [
    `schema: ${VERIFICATION_BUNDLE_SCHEMA_ID}`,
    `task: ${parts.taskId}`,
    "",
    "# ACKit Verification Bundle",
    "",
    "You are an INDEPENDENT verifier with a fresh context. Review the material",
    "below, judge semantic compliance against the acceptance criteria, and emit",
    "an ackit.verdict.v1 verdict (PASS | PASS_WITH_WARNINGS | REWORK_REQUIRED |",
    "BLOCKED). You should not implement the feature you are judging.",
    "",
    "## Intent",
    "",
    parts.intentBlock,
    "",
    "## Workflow",
    "",
    parts.workflow === null
      ? "(no workflow state — legacy task)"
      : `profile: ${parts.workflow.profile}, stage: ${parts.workflow.stage}`,
    "",
    "## Task document",
    "",
    `source: ${parts.taskDoc.relativePath} [${parts.taskDoc.meta.status}]`,
    "",
    "````",
    parts.taskDoc.body.replace(/````/g, "`'`'`'"),
    "````",
    "",
    "## Acceptance criteria + evidence",
    "",
    parts.evidenceBlock,
    "",
    "## Registered verdicts",
    "",
    parts.verdictBlock,
    "",
    "## Latest checkpoint",
    "",
    parts.checkpointBlock,
    "",
    "## Implementation surface",
    "",
    parts.surfaceBlock,
    "",
    "## Implementation diff",
    "",
    parts.diffBlock,
    "",
    "## Verification-point gate requirements",
    "",
    ...(parts.gateRequirements.length > 0
      ? parts.gateRequirements.map((line) => `- ${line}`)
      : ["- (none declared)"]),
    "",
    "## Verdict instructions",
    "",
    "- Compare the implementation surface, diff, and evidence against every criterion.",
    "- Blocking findings must carry the criterion id and a stable upper-snake code.",
    "- PASS-family verdicts cannot carry blocking findings (registration rejects them).",
    "- Register your verdict with: ackit verification record <task> --verdict <file>",
  ];
  const markdown = `${lines.join("\n")}\n`;
  assertNoSecretShapes(markdown);
  const json = JSON.stringify(
    {
      schemaVersion: VERIFICATION_BUNDLE_SCHEMA_ID,
      tool: "ackit",
      task: parts.taskId,
      intent: parts.intentBlock,
      workflow: parts.workflow,
      taskDocument: {
        relativePath: parts.taskDoc.relativePath,
        status: parts.taskDoc.meta.status,
        body: parts.taskDoc.body,
      },
      evidence: parts.evidenceBlock,
      verdicts: parts.verdictBlock,
      checkpoint: parts.checkpointBlock,
      implementationSurface: parts.surfaceBlock,
      diff: parts.diffBlock,
    },
    null,
    2,
  );
  assertNoSecretShapes(json);
  return { markdown, json };
}
