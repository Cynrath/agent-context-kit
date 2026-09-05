/**
 * Portable verification-bound handoff (TASK-0082, ADR-0027 extended).
 *
 * Extends the v1 markdown handoff pack in place (renderHandoffPack is
 * untouched — v1 readers see byte-identical output): `ackit.handoff.v2`
 * wraps the v1 pack with a machine-readable section binding task/workflow
 * state, evidence/verdict pointers + digests, staleness, the TASK-0081
 * next-action contract, a redaction manifest, and provider-neutral
 * resume instructions.
 *
 * No duplicate subsystem, no auto-execution, no cloud sync: import
 * VALIDATES a handoff against CURRENT disk state and renders its resume
 * context, or refuses with a stable code. Import never mutates
 * task/workflow/evidence/verdict/ledger state (read-only by construction).
 */
import { z } from "zod";
import { assertNoSecretShapes, scrubAbsolutePaths } from "../context/pack.js";
import { EvidenceStore } from "../evidence/index.js";
import { resolveRepositoryRoot } from "../filesystem/root.js";
import { IntentStore } from "../intent/index.js";
import { buildStatusReport } from "../status/projection.js";
import { TaskStore } from "../tasks/store.js";
import {
  type BindingComponentName,
  type ComputedStateBinding,
  compareStoredBinding,
  computeStateBinding,
  StateBindingError,
  VerdictStore,
} from "../verification/index.js";
import { renderHandoffPack } from "./resume.js";
import { CheckpointStore } from "./store.js";
import { CHECKPOINT_PROBLEM_CODES, CheckpointSchema } from "./types.js";
import { collectStalenessContext, validateCheckpointStaleness } from "./validate.js";

/** Machine-readable handoff schema id (this task). */
export const HANDOFF_SCHEMA_ID_V2 = "ackit.handoff.v2";

/**
 * v1 handoff designator: the markdown pack era has no machine version
 * marker (identified by content). v1 markdown is never machine-imported
 * (no digests to bind) — see HANDOFF-V1-UNBOUND.
 */
export const HANDOFF_SCHEMA_ID_V1 = "ackit.handoff.v1";

const hex64 = z.string().regex(/^[0-9a-f]{64}$/, "digest hex expected");

export const HANDOFF_PROBLEM_CODES = {
  invalid: "HANDOFF-INVALID",
  /** v1 markdown carries no digests — re-export with --format json. */
  v1Unbound: "HANDOFF-V1-UNBOUND",
  taskUnknown: "HANDOFF-TASK-UNKNOWN",
  /** Stored binding differs from recomputed current state (TASK-0079 engine). */
  stateStale: "VERDICT-STATE-STALE",
} as const;

export class HandoffError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

const statusNextActionSchema = z.strictObject({
  action: z.string().min(1).max(500),
  command: z.string().max(500).optional(),
  reason: z.string().min(1).max(1000),
});

/**
 * Machine-readable handoff (ackit.handoff.v2). Strict: unknown fields
 * rejected (untrusted input on import, THREAT_MODEL T16). No absolute
 * paths, no secrets, no clock reads inside — digests + repo-relative
 * identifiers + stored texts only.
 */
export const HandoffV2Schema = z.strictObject({
  schemaVersion: z.literal(HANDOFF_SCHEMA_ID_V2),
  tool: z.literal("ackit"),
  task: z.strictObject({
    id: z.string().regex(/^TASK-\d{4}$/),
    title: z.string().min(1).max(500),
    status: z.string().min(1).max(32),
  }),
  workflow: z.strictObject({ profile: z.string(), stage: z.string().optional() }).nullable(),
  checkpoint: CheckpointSchema,
  checkpointStaleness: z
    .array(z.strictObject({ code: z.string(), message: z.string().max(2000) }))
    .max(8),
  evidence: z.strictObject({
    present: z.boolean(),
    ok: z.boolean(),
    problems: z
      .array(
        z.strictObject({
          code: z.string(),
          criterionId: z.string().optional(),
          message: z.string().max(2000),
        }),
      )
      .max(128),
  }),
  verification: z.strictObject({
    stateDigest: hex64,
    bundleDigest: hex64,
    components: z.strictObject({
      sourceState: hex64,
      taskContract: hex64,
      intent: hex64,
      artifacts: hex64,
      workflow: hex64,
      config: hex64,
      policy: hex64,
      evidence: hex64,
    }),
    gitUnavailable: z.boolean(),
    verdict: z
      .strictObject({
        id: z.string(),
        value: z.string(),
        bound: z.boolean(),
        fresh: z.boolean(),
        problemCode: z.string().nullable(),
        changed: z.array(z.string()).max(8),
        independent: z.boolean(),
        reviewedBundleDigest: hex64.nullable(),
        independenceCode: z.string().nullable(),
      })
      .nullable(),
  }),
  /** TASK-0081 next-action contract, embedded verbatim. */
  status: z.strictObject({
    blockers: z.array(z.string().max(2000)).max(128),
    next: z.array(statusNextActionSchema).max(64),
  }),
  redaction: z.strictObject({
    secrets: z.literal("asserted-absent"),
    secretGate: z.literal("ackit-canonical"),
    absolutePaths: z.literal("scrubbed"),
    scrubbedCount: z.number().int().min(0),
  }),
  instructions: z.strictObject({
    audience: z.literal("provider-neutral"),
    steps: z.array(z.string().min(1).max(1000)).min(1).max(16),
  }),
  /** The v1 human pack (scrubbed + secret-gated), embedded for readers. */
  markdown: z.string().min(1).max(256_000),
});

export type HandoffV2 = z.infer<typeof HandoffV2Schema>;

export interface BuiltHandoff {
  /** Machine section (the trust anchor). */
  json: string;
  /** Embedded v1 markdown pack (identical to --format md output). */
  markdown: string;
  binding: ComputedStateBinding;
}

export interface ValidatedHandoff {
  handoff: HandoffV2;
  /** Resume text to display (the validated embedded pack). */
  resume: string;
  changed: BindingComponentName[];
}

/**
 * Build a deterministic portable handoff over CURRENT state. Fails closed
 * (binding errors, missing task/checkpoint, secret-shaped content) with
 * stable codes instead of emitting a silently unbound document.
 */
export async function buildHandoff(
  repositoryRoot: string,
  taskId: string,
): Promise<
  { ok: true; handoff: BuiltHandoff } | { ok: false; diagnostic: { code: string; message: string } }
> {
  if (!/^TASK-\d{4}$/.test(taskId)) {
    return {
      ok: false,
      diagnostic: { code: "HANDOFF-TASK-UNKNOWN", message: `unknown task '${taskId}'` },
    };
  }
  const resolved = await resolveRepositoryRoot(repositoryRoot);
  if (!resolved.ok) {
    return {
      ok: false,
      diagnostic: { code: "HANDOFF-INVALID", message: resolved.diagnostic.message },
    };
  }
  const root = resolved.root;
  const rootPath = root.canonicalPath;
  const tasks = new TaskStore(rootPath);
  const found = await tasks.find(taskId);
  const checkpoints = new CheckpointStore(root, rootPath);
  const checkpoint = await checkpoints.latest(taskId);
  if (found === null || checkpoint === null) {
    return {
      ok: false,
      diagnostic: {
        code: "HANDOFF-TASK-UNKNOWN",
        message: `task or checkpoint missing for '${taskId}'`,
      },
    };
  }

  let binding: ComputedStateBinding;
  try {
    binding = await computeStateBinding(rootPath, taskId);
  } catch (error) {
    const code =
      error instanceof StateBindingError ? error.code : "VERIFICATION-BINDING-UNAVAILABLE";
    return { ok: false, diagnostic: { code, message: (error as Error).message } };
  }

  const verdicts = new VerdictStore(rootPath);
  const summary = await verdicts.latestVerdictSummary(taskId);
  const latest = await verdicts.latest(taskId);

  const intents = new IntentStore(rootPath);
  const intent =
    checkpoint.intentRef !== undefined ? await intents.find(checkpoint.intentRef) : null;

  // v1 pack first (unchanged renderer = v1 byte-compatibility). Redaction
  // (below) deep-scrubs the whole handoff object — including this markdown
  // and every composed free-text field (titles, checkpoint texts, status
  // reasons) — with the shared G4 scrubber, so transfer artifacts never
  // carry machine-local paths. Digests/ids/codes cannot match the scrub
  // patterns (no slashes), so they pass through byte-identical.
  const rawMarkdown = renderHandoffPackSafe(
    checkpoint,
    {
      id: found.doc.meta.id,
      title: found.doc.meta.title,
      status: found.doc.meta.status,
      body: found.doc.body,
      relativePath: found.doc.relativePath,
    },
    intent !== null
      ? {
          id: intent.doc.meta.id,
          title: intent.doc.meta.title,
          problem: intent.doc.meta.problem,
          desiredOutcome: intent.doc.meta.desiredOutcome,
        }
      : null,
  );
  if (!rawMarkdown.ok) return rawMarkdown;
  const markdown = rawMarkdown.markdown;
  try {
    assertNoSecretShapes(markdown);
  } catch (error) {
    return {
      ok: false,
      diagnostic: { code: "HANDOFF-INVALID", message: (error as Error).message },
    };
  }

  // TASK-0081 status contract, composed (blockers + next ride the handoff).
  const status = await buildStatusReport(rootPath, taskId);

  const checkpointStaleness = validateCheckpointStaleness(
    checkpoint,
    rootPath,
    collectStalenessContext(rootPath),
  );

  const evidenceStore = new EvidenceStore(root);
  const registry = await evidenceStore.load(taskId);
  const evidenceProblems = status.evidence?.problems ?? [];

  const handoff: HandoffV2 = {
    schemaVersion: HANDOFF_SCHEMA_ID_V2,
    tool: "ackit",
    task: { id: found.doc.meta.id, title: found.doc.meta.title, status: found.doc.meta.status },
    workflow:
      checkpoint.workflow.stage !== undefined
        ? { profile: checkpoint.workflow.profile, stage: checkpoint.workflow.stage }
        : { profile: checkpoint.workflow.profile },
    checkpoint,
    checkpointStaleness: checkpointStaleness.map((problem) => ({
      code: problem.code,
      message: problem.message,
    })),
    evidence: {
      present: registry !== null,
      ok: status.evidence?.ok ?? false,
      problems: evidenceProblems.map((problem) => ({
        code: problem.code,
        ...(problem.criterionId !== undefined ? { criterionId: problem.criterionId } : {}),
        message: problem.message,
      })),
    },
    verification: {
      stateDigest: binding.stateDigest,
      bundleDigest: binding.bundleDigest,
      components: binding.components,
      gitUnavailable: binding.gitUnavailable,
      verdict:
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
            },
    },
    status: { blockers: status.blockers, next: status.next },
    redaction: {
      secrets: "asserted-absent",
      secretGate: "ackit-canonical",
      absolutePaths: "scrubbed",
      scrubbedCount: 0,
    },
    instructions: {
      audience: "provider-neutral",
      steps: [
        `Run \`ackit status ${taskId}\` to see the task, stage, blockers, staleness, and next actions.`,
        `Validate this handoff with \`ackit checkpoint import <file>\` — it is refused when state moved on.`,
        `Resume with \`ackit task resume ${taskId}\`, then follow the handoff next-actions in order.`,
        `Re-verify (fresh bundle + fresh verdict) after any implementation, criteria, intent, plan/spec/decision, workflow, config/policy, or evidence change.`,
        `Never auto-execute: a handoff restores context only; each step runs explicitly.`,
      ],
    },
    markdown,
  };
  // Whole-object redaction pass (see above): every string field scrubbed
  // with the shared scrubber; the manifest carries the honest count.
  const redaction = scrubHandoffStrings(handoff);
  handoff.redaction.scrubbedCount = redaction.scrubbed;
  const parsed = HandoffV2Schema.safeParse(handoff);
  if (!parsed.success) {
    return {
      ok: false,
      diagnostic: {
        code: "HANDOFF-INVALID",
        message: `handoff failed schema validation (${parsed.error.issues.length} issue(s))`,
      },
    };
  }
  const json = `${JSON.stringify(parsed.data, null, 2)}\n`;
  try {
    assertNoSecretShapes(json);
  } catch (error) {
    return {
      ok: false,
      diagnostic: { code: "HANDOFF-INVALID", message: (error as Error).message },
    };
  }
  // Return the redacted, schema-validated values (never the pre-scrub locals).
  return { ok: true, handoff: { json, markdown: parsed.data.markdown, binding } };
}

/**
 * v1 pack rendering with fail-closed diagnostics: the shared renderer
 * throws on secret-shaped content (fail, never leak) — converted here to
 * the handoff's stable diagnostic so export refuses instead of crashing.
 */
function renderHandoffPackSafe(
  checkpoint: Parameters<typeof renderHandoffPack>[0],
  task: Parameters<typeof renderHandoffPack>[1],
  intent: Parameters<typeof renderHandoffPack>[2],
): { ok: true; markdown: string } | { ok: false; diagnostic: { code: string; message: string } } {
  try {
    return { ok: true, markdown: renderHandoffPack(checkpoint, task, intent) };
  } catch (error) {
    return {
      ok: false,
      diagnostic: { code: "HANDOFF-INVALID", message: (error as Error).message },
    };
  }
}

/**
 * Deep-scrub every string in a handoff object with the shared G4 scrubber
 * (scrubAbsolutePaths). Digests, ids, codes, and enum literals contain no
 * absolute-path shapes and pass through byte-identical; only operator-
 * authored free text changes. Returns the total replacement count for the
 * redaction manifest. Operates on plain JSON-cloned data (no class
 * instances cross this boundary).
 */
function scrubHandoffStrings(value: unknown): { scrubbed: number } {
  let scrubbed = 0;
  const visit = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (let index = 0; index < node.length; index++) {
        const entry: unknown = node[index];
        if (typeof entry === "string") {
          const result = scrubAbsolutePaths(entry);
          scrubbed += result.scrubbed;
          node[index] = result.content;
        } else {
          visit(entry);
        }
      }
      return;
    }
    if (typeof node === "object" && node !== null) {
      const record = node as Record<string, unknown>;
      for (const [key, entry] of Object.entries(record)) {
        if (typeof entry === "string") {
          const result = scrubAbsolutePaths(entry);
          scrubbed += result.scrubbed;
          record[key] = result.content;
        } else {
          visit(entry);
        }
      }
    }
  };
  visit(value);
  return { scrubbed };
}

/**
 * Parse handoff file content (no trust on read): v2 JSON validates by
 * schema; v1 markdown is identified by content and refused with an
 * explicit migration code (it carries no digests to bind); anything else
 * is invalid. Secrets are re-gated on the way in.
 */
export function parseHandoffFile(content: string): HandoffV2 {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    if (content.includes("# ACKit Handoff Pack")) {
      throw new HandoffError(
        HANDOFF_PROBLEM_CODES.v1Unbound,
        "v1 markdown handoff carries no digests to bind — re-export with 'ackit checkpoint export <task> --format json'",
      );
    }
    throw new HandoffError(HANDOFF_PROBLEM_CODES.invalid, "handoff file is not valid JSON");
  }
  const result = HandoffV2Schema.safeParse(parsed);
  if (!result.success) {
    throw new HandoffError(
      HANDOFF_PROBLEM_CODES.invalid,
      `handoff failed schema validation (${result.error.issues.length} issue(s))`,
    );
  }
  try {
    assertNoSecretShapes(content);
  } catch (error) {
    throw new HandoffError(HANDOFF_PROBLEM_CODES.invalid, (error as Error).message);
  }
  return result.data;
}

/**
 * Validate a parsed handoff against CURRENT disk state (read-only).
 * Fresh: the embedded bundle/state digests still match recomputed state
 * (TASK-0079 engine + code) and the embedded checkpoint still validates.
 * Anything else refuses with a stable code — never silently accepted.
 */
export async function validateHandoff(
  repositoryRoot: string,
  handoff: HandoffV2,
): Promise<ValidatedHandoff> {
  const resolved = await resolveRepositoryRoot(repositoryRoot);
  if (!resolved.ok) {
    throw new HandoffError(HANDOFF_PROBLEM_CODES.invalid, resolved.diagnostic.message);
  }
  const rootPath = resolved.root.canonicalPath;
  const tasks = new TaskStore(rootPath);
  const found = await tasks.find(handoff.task.id);
  if (found === null) {
    throw new HandoffError(
      HANDOFF_PROBLEM_CODES.taskUnknown,
      `handoff task '${handoff.task.id}' does not exist locally — apply it in the repository it was exported from (copied state must match)`,
    );
  }
  let current: ComputedStateBinding;
  try {
    current = await computeStateBinding(rootPath, handoff.task.id);
  } catch (error) {
    const code =
      error instanceof StateBindingError ? error.code : "VERIFICATION-BINDING-UNAVAILABLE";
    throw new HandoffError(code, (error as Error).message);
  }
  const { fresh, changed } = compareStoredBinding(
    { components: handoff.verification.components, stateDigest: handoff.verification.stateDigest },
    current,
  );
  if (!fresh) {
    throw new HandoffError(
      HANDOFF_PROBLEM_CODES.stateStale,
      `handoff is stale (changed: ${changed.join(", ")}) — re-export after re-verifying against current state`,
    );
  }
  // Bundle-reference consistency: with equal state digests the bundle
  // digest is a pure function of state, so any difference proves the
  // handoff record was tampered with (fail closed as corrupt, not stale).
  if (handoff.verification.bundleDigest !== current.bundleDigest) {
    throw new HandoffError(
      HANDOFF_PROBLEM_CODES.invalid,
      "handoff bundle digest does not match its bound state (tampering suspected) — re-export from a trusted state",
    );
  }
  const stale = validateCheckpointStaleness(
    handoff.checkpoint,
    rootPath,
    collectStalenessContext(rootPath),
  );
  const blocking = stale.filter((problem) => problem.code === CHECKPOINT_PROBLEM_CODES.stale);
  if (blocking.length > 0) {
    throw new HandoffError(
      blocking[0]?.code ?? CHECKPOINT_PROBLEM_CODES.stale,
      blocking[0]?.message ?? "handoff checkpoint is stale",
    );
  }
  return { handoff, resume: handoff.markdown, changed };
}
