/**
 * Canonical read-only status projection (TASK-0081, ADR-0032).
 *
 * One composed answer to: what task, what stage, what blocks completion,
 * what is stale, what next. This module contains NO gate predicates of its
 * own: task/workflow/evidence/verdict/checkpoint/policy facts come from
 * their owning engines' read paths, blockers come verbatim from the
 * completion gate (`TaskStore.completionBlockers`), and next-actions map
 * the gate's STABLE CODES to suggested commands (presentation over the
 * gate's own output — never a second engine).
 *
 * Pure projection: no writes, no journal, no clock reads, no network.
 * Deterministic: identical stored state yields identical reports
 * (insertion-ordered construction throughout; engines already sort).
 */
import { CheckpointStore } from "../checkpoint/index.js";
import { collectStalenessContext, validateCheckpointStaleness } from "../checkpoint/validate.js";
import { EvidenceStore, validateEvidence } from "../evidence/index.js";
import type { EvidenceProblem } from "../evidence/types.js";
import { resolveRepositoryRoot } from "../filesystem/root.js";
import { IntentStore } from "../intent/index.js";
import { TaskStore } from "../tasks/store.js";
import { acceptanceUnchecked, hasRealCompletionNotes } from "../tasks/types.js";
import type { BindingComponentName } from "../verification/index.js";
import { VerdictStore } from "../verification/index.js";
import { getProfile, resolveProfileRequirements, WorkflowStore } from "../workflow/index.js";

/** Stable schema id for the status report (JSON contract). */
export const STATUS_SCHEMA_ID = "ackit.status.v1" as const;

export interface StatusNextAction {
  action: string;
  /** Suggested command (absent for informational/externally-owned steps). */
  command?: string | undefined;
  reason: string;
}

export interface StatusEvidenceProblem {
  code: string;
  criterionId?: string | undefined;
  message: string;
}

export interface StatusReport {
  schemaVersion: typeof STATUS_SCHEMA_ID;
  tool: "ackit";
  /** How the target task was chosen. */
  resolution:
    | { mode: "explicit"; taskId: string }
    | { mode: "active"; taskId: string }
    | { mode: "none" }
    | { mode: "ambiguous"; candidates: string[] };
  task: {
    id: string;
    title: string;
    status: string;
    archived: boolean;
    profile: string | null;
    stage: string | null;
    completionStage: string | null;
    lastAttempt: string | null;
    dependencies: { id: string; completed: boolean }[];
    uncheckedCriteria: number;
    notesReady: boolean;
    intent: { id: string; title: string; status: string } | null;
    requiresEvidence: boolean;
    requiresVerdict: boolean;
  } | null;
  /** Verbatim completion-gate blockers (stable codes, gate order). */
  blockers: string[];
  evidence: { present: boolean; ok: boolean; problems: StatusEvidenceProblem[] } | null;
  verdict: {
    id: string;
    value: string;
    bound: boolean;
    fresh: boolean;
    problemCode: string | null;
    changed: BindingComponentName[];
    independent: boolean;
    reviewedBundleDigest: string | null;
    independenceCode: string | null;
  } | null;
  checkpoint: {
    id: string;
    createdAt: string;
    nextAction: { objective: string; path?: string; command?: string; expectedResult?: string };
    stale: { code: string; message: string }[];
  } | null;
  next: StatusNextAction[];
}

export class StatusError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

/**
 * Build the status report for a task (explicit id) or the single active
 * task. Read-only: every composed call is a documented read path
 * (find/list/load/validate/summary); nothing here writes.
 */
export async function buildStatusReport(
  repositoryRoot: string,
  taskId?: string | undefined,
): Promise<StatusReport> {
  const resolved = await resolveRepositoryRoot(repositoryRoot);
  if (!resolved.ok) {
    throw new StatusError("STATUS-NO-ROOT", resolved.diagnostic.message);
  }
  const root = resolved.root;
  const rootPath = root.canonicalPath;
  const tasks = new TaskStore(rootPath);

  let target: string | null = taskId ?? null;
  let resolution: StatusReport["resolution"];
  if (target !== null) {
    if (!/^TASK-\d{4}$/.test(target)) {
      throw new StatusError("STATUS-TASK-ID-INVALID", `invalid task id '${target}'`);
    }
    const found = await tasks.find(target);
    if (found === null) {
      throw new StatusError("STATUS-TASK-UNKNOWN", `unknown task '${target}'`);
    }
    resolution = { mode: "explicit", taskId: target };
  } else {
    const actives = (await tasks.list(false))
      .filter((doc) => doc.meta.status === "active")
      .map((doc) => doc.meta.id)
      .sort();
    if (actives.length === 0) {
      return emptyReport({ mode: "none" });
    }
    if (actives.length > 1) {
      return emptyReport({ mode: "ambiguous", candidates: actives });
    }
    target = actives[0] ?? null;
    if (target === null) return emptyReport({ mode: "none" });
    resolution = { mode: "active", taskId: target };
  }

  const found = await tasks.find(target);
  if (found === null) {
    throw new StatusError("STATUS-TASK-UNKNOWN", `unknown task '${target}'`);
  }
  const doc = found.doc;

  const workflowStore = new WorkflowStore(root);
  const wf = await workflowStore.load(target);

  let profile: string | null = null;
  let stage: string | null = null;
  let completionStage: string | null = null;
  let lastAttempt: string | null = null;
  let requiresEvidence = false;
  let requiresVerdict = false;
  if (wf !== null) {
    profile = wf.profile;
    stage = wf.stage;
    const definition = getProfile(wf.profile);
    completionStage = definition.completionStage;
    const attempts = wf.verificationAttempts;
    lastAttempt = attempts.length > 0 ? (attempts[attempts.length - 1]?.outcome ?? null) : null;
    const effective = resolveProfileRequirements(wf.profile, {});
    requiresEvidence = effective.requiresEvidence;
    requiresVerdict = effective.requiresVerdict;
  }

  const dependencies: { id: string; completed: boolean }[] = [];
  for (const dep of doc.meta.dependencies) {
    const depFound = await tasks.find(dep);
    dependencies.push({ id: dep, completed: depFound?.doc.meta.status === "completed" });
  }

  let intent: { id: string; title: string; status: string } | null = null;
  if (doc.meta.intentRef !== undefined) {
    const intentFound = await new IntentStore(rootPath).find(doc.meta.intentRef);
    if (intentFound !== null) {
      intent = {
        id: intentFound.doc.meta.id,
        title: intentFound.doc.meta.title,
        status: intentFound.doc.meta.status,
      };
    }
  }

  const evidenceStore = new EvidenceStore(root);
  const registry = await evidenceStore.load(target);
  let evidence: StatusReport["evidence"] = null;
  let evidenceProblems: EvidenceProblem[] = [];
  if (registry !== null) {
    const validation = validateEvidence(registry);
    evidenceProblems = validation.problems;
    evidence = {
      present: true,
      ok: validation.ok,
      problems: validation.problems.map((problem) => ({
        code: problem.code,
        ...(problem.criterionId !== undefined ? { criterionId: problem.criterionId } : {}),
        message: problem.message,
      })),
    };
  } else {
    evidence = { present: false, ok: false, problems: [] };
  }

  const verdicts = new VerdictStore(rootPath);
  const latest = await verdicts.latest(target);
  const summary = await verdicts.latestVerdictSummary(target);
  const verdict =
    latest === null
      ? null
      : {
          id: latest.id,
          value: latest.verdict,
          bound: summary?.bound ?? false,
          fresh: summary?.fresh ?? false,
          problemCode: summary?.problemCode ?? null,
          changed: summary?.changed ?? [],
          independent: summary?.independent ?? false,
          reviewedBundleDigest: summary?.reviewedBundleDigest ?? null,
          independenceCode: summary?.independenceCode ?? null,
        };

  const checkpoints = new CheckpointStore(root, rootPath);
  const latestCheckpoint = await checkpoints.latest(target);
  let checkpoint: StatusReport["checkpoint"] = null;
  if (latestCheckpoint !== null) {
    const stale = validateCheckpointStaleness(
      latestCheckpoint,
      rootPath,
      collectStalenessContext(rootPath),
    );
    checkpoint = {
      id: latestCheckpoint.id,
      createdAt: latestCheckpoint.createdAt,
      nextAction: {
        objective: latestCheckpoint.nextAction.objective,
        ...(latestCheckpoint.nextAction.path !== undefined
          ? { path: latestCheckpoint.nextAction.path }
          : {}),
        ...(latestCheckpoint.nextAction.command !== undefined
          ? { command: latestCheckpoint.nextAction.command }
          : {}),
        ...(latestCheckpoint.nextAction.expectedResult !== undefined
          ? { expectedResult: latestCheckpoint.nextAction.expectedResult }
          : {}),
      },
      stale: stale.map((problem) => ({ code: problem.code, message: problem.message })),
    };
  }

  // Blockers verbatim from the completion gate (same engine, same order).
  const blockers = await tasks.completionBlockers(target);

  const next = deriveNextActions(target, blockers, evidenceProblems, checkpoint);

  return {
    schemaVersion: STATUS_SCHEMA_ID,
    tool: "ackit",
    resolution,
    task: {
      id: doc.meta.id,
      title: doc.meta.title,
      status: doc.meta.status,
      archived: found.archived,
      profile,
      stage,
      completionStage,
      lastAttempt,
      dependencies,
      uncheckedCriteria: acceptanceUnchecked(doc.body),
      notesReady: hasRealCompletionNotes(doc.body),
      intent,
      requiresEvidence,
      requiresVerdict,
    },
    blockers,
    evidence,
    verdict,
    checkpoint,
    next,
  };
}

function emptyReport(resolution: StatusReport["resolution"]): StatusReport {
  const next: StatusNextAction[] =
    resolution.mode === "ambiguous"
      ? [
          {
            action: `disambiguate the active task (${resolution.candidates.join(", ")})`,
            command: `ackit status <TASK-ID>`,
            reason: "more than one active task; status targets exactly one",
          },
        ]
      : [
          {
            action: "create a task",
            command: `ackit task create "<title>"`,
            reason: "no active task to report on",
          },
        ];
  return {
    schemaVersion: STATUS_SCHEMA_ID,
    tool: "ackit",
    resolution,
    task: null,
    blockers: [],
    evidence: null,
    verdict: null,
    checkpoint: null,
    next,
  };
}

/**
 * Next-action derivation (ADR-0032 §3): EVERY completion-gate blocker maps
 * to at least one action by its STABLE CODE prefix (the codes are the
 * contract — that is why they are stable). Unknown future codes fall
 * through to an explicit inspect action, so derivation can never
 * contradict the gate by omission. Criterion-level detail comes from the
 * evidence engine's own problem list (structured composition, not string
 * parsing).
 */
function deriveNextActions(
  taskId: string,
  blockers: string[],
  evidenceProblems: EvidenceProblem[],
  checkpoint: StatusReport["checkpoint"],
): StatusNextAction[] {
  const next: StatusNextAction[] = [];
  const seen = new Set<string>();
  const push = (action: StatusNextAction): void => {
    const key = `${action.action}‖${action.command ?? ""}`;
    if (seen.has(key)) return;
    seen.add(key);
    next.push(action);
  };

  if (blockers.some((b) => b.includes("only active tasks can complete"))) {
    push({
      action: `start task ${taskId}`,
      command: `ackit task start ${taskId}`,
      reason: "only active tasks can complete",
    });
  }
  for (const blocker of blockers) {
    if (blocker.includes("unchecked acceptance criteria")) {
      push({
        action: "document acceptance and sync evidence",
        command: `ackit evidence sync ${taskId}`,
        reason: blocker,
      });
    } else if (blocker.includes("completion notes missing")) {
      push({
        action: "write real completion notes in the task document",
        reason: blocker,
      });
    } else if (blocker.startsWith("dependency '") || blocker.startsWith("TASK_DEPENDENCY")) {
      const dep = /dependency '([^']+)'/.exec(blocker)?.[1] ?? blocker;
      push({
        action: `complete dependency ${dep}`,
        command: `ackit task complete ${dep}`,
        reason: blocker,
      });
    } else if (blocker.startsWith("MISSING_REQUIRED_ARTIFACT")) {
      push({
        action: "create the missing required artifact (evidence registry)",
        command: `ackit evidence sync ${taskId}`,
        reason: blocker,
      });
    } else if (
      blocker.startsWith("CRITERION_UNVERIFIED") ||
      blocker.startsWith("REQUIRED_EVIDENCE_MISSING") ||
      blocker.startsWith("EVIDENCE_REF_INVALID") ||
      blocker.startsWith("EVIDENCE-") ||
      blocker.startsWith("EVIDENCE_")
    ) {
      pushEvidenceActions(taskId, evidenceProblems, blocker, push);
    } else if (blocker.startsWith("MISSING_VERIFIER_VERDICT")) {
      push({
        action: "obtain an independent fresh review",
        command: `ackit verification bundle ${taskId} --format json --out .ackit/reviews/bundle.json`,
        reason: blocker,
      });
    } else if (blocker.startsWith("VERDICT_BLOCKING")) {
      push({
        action: "address the verdict findings, then re-verify with a fresh bundle and verdict",
        command: `ackit verification bundle ${taskId} --format json --out .ackit/reviews/bundle.json`,
        reason: blocker,
      });
    } else if (
      blocker.startsWith("VERDICT-STATE-STALE") ||
      blocker.startsWith("VERDICT-BINDING-MISSING")
    ) {
      push({
        action: "re-verify against current state (fresh bundle + fresh verdict)",
        command: `ackit verification bundle ${taskId} --format json --out .ackit/reviews/bundle.json`,
        reason: blocker,
      });
    } else if (blocker.startsWith("VERDICT-INDEPENDENCE-UNPROVEN")) {
      push({
        action: "obtain an independent fresh review and register it with --bundle",
        command: `ackit verification bundle ${taskId} --format json --out .ackit/reviews/bundle.json`,
        reason: blocker,
      });
    } else if (blocker.startsWith("WORKFLOW_STAGE_INVALID")) {
      const advance = /completion stage '([^']+)'/.exec(blocker)?.[1];
      push({
        action:
          advance !== undefined
            ? `advance the workflow to stage '${advance}'`
            : "advance the workflow to its completion stage",
        command: `ackit workflow advance ${taskId}${advance !== undefined ? ` --to ${advance}` : ""}`,
        reason: blocker,
      });
    } else if (blocker.startsWith("VERIFICATION_ATTEMPT_FAILED")) {
      push({
        action: "fix the failure, then record a passing verification attempt",
        command: `ackit workflow verify ${taskId} --outcome pass`,
        reason: blocker,
      });
    } else if (/UNPLANNED|DRIFT/.test(blocker)) {
      push({
        action: "inspect the blocking drift finding",
        command: `ackit drift check ${taskId}`,
        reason: blocker,
      });
    } else if (!blocker.includes("only active tasks can complete")) {
      push({ action: "inspect the blocker", reason: blocker });
    }
  }

  if (checkpoint !== null) {
    push({
      action: `recorded next action: ${checkpoint.nextAction.objective}`,
      ...(checkpoint.nextAction.command !== undefined
        ? { command: checkpoint.nextAction.command }
        : {}),
      reason: `checkpoint ${checkpoint.id} next action`,
    });
  }

  if (blockers.length === 0) {
    push({
      action: `complete task ${taskId}`,
      command: `ackit task complete ${taskId}`,
      reason: "all completion gates pass",
    });
  }
  return next;
}

function pushEvidenceActions(
  taskId: string,
  evidenceProblems: EvidenceProblem[],
  blocker: string,
  push: (action: StatusNextAction) => void,
): void {
  if (evidenceProblems.length === 0) {
    push({
      action: "sync and verify evidence",
      command: `ackit evidence sync ${taskId}`,
      reason: blocker,
    });
    return;
  }
  for (const problem of evidenceProblems) {
    const criterion = problem.criterionId ?? "AC-???";
    push({
      action: `record qualifying evidence for ${criterion}`,
      command: `ackit evidence verify ${taskId} --criterion ${criterion} --type test --ref "<proof>"`,
      reason: `${problem.code}: ${problem.message}`,
    });
  }
}

/**
 * Deterministic human rendering (fixture-pinned): fixed section order,
 * sorted collections from the engines, no clock reads, no paths beyond
 * repo-relative identifiers already present in the composed state.
 */
export function renderStatusReport(report: StatusReport): string {
  const lines: string[] = [];
  if (report.task === null) {
    lines.push("status: no task to report on");
    if (report.resolution.mode === "ambiguous") {
      lines.push(`active tasks: ${report.resolution.candidates.join(", ")}`);
    }
    lines.push("");
    lines.push("next:");
    for (const item of report.next) lines.push(`- ${formatNext(item)}`);
    lines.push("");
    return `${lines.join("\n")}`;
  }
  const task = report.task;
  const resolved = report.resolution.mode === "explicit" ? "(explicit)" : "(single active task)";
  lines.push(`task: ${task.id} — ${task.title} ${resolved}`);
  lines.push(`status: ${task.status}${task.archived ? " (archived)" : ""}`);
  lines.push(
    task.profile === null
      ? "workflow: (no workflow state — legacy task)"
      : `workflow: profile '${task.profile}', stage '${task.stage}' (completion stage '${task.completionStage}')`,
  );
  if (task.lastAttempt !== null) lines.push(`latest verification attempt: ${task.lastAttempt}`);
  lines.push(
    task.dependencies.length === 0
      ? "dependencies: (none)"
      : `dependencies: ${task.dependencies.map((d) => `${d.id} (${d.completed ? "completed" : "open"})`).join(", ")}`,
  );
  if (task.intent !== null) {
    lines.push(`intent: ${task.intent.id} — ${task.intent.title} [${task.intent.status}]`);
  }
  lines.push("");
  if (report.blockers.length === 0) {
    lines.push("blockers: (none — completion eligible)");
  } else {
    lines.push("blockers:");
    for (const blocker of report.blockers) lines.push(`- ${blocker}`);
  }
  lines.push("");
  lines.push("stale:");
  if (report.verdict === null) {
    lines.push("- verdict: (none registered)");
  } else {
    const verdict = report.verdict;
    const freshness = verdict.bound
      ? verdict.fresh
        ? "fresh"
        : `STALE (${verdict.problemCode}${verdict.changed.length > 0 ? `: ${verdict.changed.join(", ")}` : ""})`
      : `unbound (${verdict.problemCode})`;
    const independence = verdict.independent
      ? "independent"
      : `NOT independent (${verdict.independenceCode})`;
    lines.push(`- verdict ${verdict.id} (${verdict.value}): ${freshness}; ${independence}`);
  }
  if (report.checkpoint === null) {
    lines.push("- checkpoint: (none)");
  } else {
    const stale =
      report.checkpoint.stale.length === 0
        ? "fresh"
        : `STALE (${report.checkpoint.stale.map((s) => s.code).join(", ")})`;
    lines.push(
      `- checkpoint ${report.checkpoint.id}: ${stale}; next action: ${report.checkpoint.nextAction.objective}`,
    );
  }
  if (report.evidence?.present === true && !report.evidence.ok) {
    lines.push(
      `- evidence: ${report.evidence.problems.length} problem(s): ${report.evidence.problems.map((p) => p.code).join(", ")}`,
    );
  }
  lines.push("");
  lines.push("next:");
  for (const item of report.next) lines.push(`- ${formatNext(item)}`);
  lines.push("");
  return `${lines.join("\n")}`;
}

function formatNext(item: StatusNextAction): string {
  const command = item.command !== undefined ? ` \`${item.command}\`` : "";
  return `${item.action}${command} — ${item.reason}`;
}
