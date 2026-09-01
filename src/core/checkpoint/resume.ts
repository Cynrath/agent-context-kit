import { assertNoSecretShapes } from "../context/pack.js";
import type { Checkpoint } from "./types.js";

/**
 * Deterministic resume context (ADR-0027 §3): a concise markdown block a
 * fresh agent (any provider) reads to continue exactly where work stopped —
 * with zero conversation dependence. Rendered surfaces pass the canonical
 * secret gate (THREAT_MODEL T26).
 */
export function renderResumeContext(
  checkpoint: Checkpoint,
  task: { id: string; title: string; status: string },
  intent: { id: string; title: string; problem: string; desiredOutcome: string } | null,
): string {
  const lines: string[] = [
    `# Resume ${checkpoint.taskId}`,
    "",
    `Task: ${task.id} — ${task.title} [${task.status}]`,
    `Workflow: ${checkpoint.workflow.profile}${checkpoint.workflow.stage !== undefined ? ` (stage ${checkpoint.workflow.stage})` : ""}`,
    checkpoint.intentRef !== undefined ? `Intent: ${checkpoint.intentRef}` : "",
    intent !== null ? `Intent summary: ${intent.problem} → ${intent.desiredOutcome}` : "",
    "",
    "## Completed work",
    ...(checkpoint.completedWork.length === 0
      ? ["(none recorded)"]
      : checkpoint.completedWork.map((item) => `- ${item}`)),
    "",
    "## Pending work",
    ...(checkpoint.pendingWork.length === 0
      ? ["(none recorded)"]
      : checkpoint.pendingWork.map((item) => `- ${item}`)),
    "",
    checkpoint.decisions.length > 0
      ? ["## Decisions", ...checkpoint.decisions.map((item) => `- ${item}`), ""]
      : [],
    checkpoint.failures.length > 0
      ? ["## Failures", ...checkpoint.failures.map((item) => `- ${item}`), ""]
      : [],
    checkpoint.blockers.length > 0
      ? ["## Blockers", ...checkpoint.blockers.map((item) => `- ${item}`), ""]
      : [],
    "## Next action",
    checkpoint.nextAction.objective,
    checkpoint.nextAction.path !== undefined ? `File: ${checkpoint.nextAction.path}` : "",
    checkpoint.nextAction.command !== undefined ? `Command: ${checkpoint.nextAction.command}` : "",
    checkpoint.nextAction.expectedResult !== undefined
      ? `Expected result: ${checkpoint.nextAction.expectedResult}`
      : "",
  ].flat();
  const output = `${lines.filter((line) => line !== "").join("\n")}\n`;
  assertNoSecretShapes(output);
  return output;
}

/**
 * Self-contained handoff pack (ADR-0027 §3): resume context plus the full
 * task document body and checkpoint summary, for a fresh implementer or
 * verifier on any machine. Deterministic; secret-gated.
 */
export function renderHandoffPack(
  checkpoint: Checkpoint,
  task: { id: string; title: string; status: string; body: string; relativePath: string },
  intent: { id: string; title: string; problem: string; desiredOutcome: string } | null,
): string {
  const resume = renderResumeContext(checkpoint, task, intent);
  const lines: string[] = [
    "# ACKit Handoff Pack",
    "",
    `Checkpoint: ${checkpoint.id} of ${checkpoint.taskId} (created ${checkpoint.createdAt})`,
    `Recorded git head: ${checkpoint.gitUnavailable ? "(git was unavailable)" : checkpoint.gitHead}`,
    `Recorded changed areas: ${checkpoint.changedAreas.length}`,
    "",
    resume,
    "",
    "## Task document",
    `Source: ${task.relativePath}`,
    "",
    "````",
    task.body.replace(/````/g, "`'`'`'"),
    "````",
  ];
  const output = lines.join("\n");
  assertNoSecretShapes(output);
  return output;
}
