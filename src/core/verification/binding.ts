import { execFileSync } from "node:child_process";
import { createHash, timingSafeEqual } from "node:crypto";
import type { Stats } from "node:fs";
import { promises as fsp } from "node:fs";
import path from "node:path";
import { declaredScopeGlobs } from "../drift/check.js";
import { criteriaFromTaskDoc } from "../evidence/sync.js";
import { INTENT_DIR } from "../intent/store.js";
import type { TaskDoc } from "../tasks/types.js";
import { collapseWhitespace, domainDigest } from "./canonical.js";

/**
 * Deterministic local state binding (TASK-0079, ADR-0030): the contract that
 * ties a verifier verdict to the exact state it approved. A stale or replayed
 * verdict must not satisfy completion after relevant state changes.
 *
 * This is deterministic LOCAL binding, explicitly NOT identity crypto: no
 * proof of verifier identity, no PKI, no signing infrastructure, no
 * blockchain, no proof that a person/model actually read the bundle
 * (TASK-0080 handles verifier independence next).
 *
 * Bound field classes (components) and their canonical forms:
 * - sourceState: git HEAD + sorted repo-relative content digests of the
 *   changed/untracked working set (staged, unstaged, relevant untracked).
 * - taskContract: task identity + acceptance-criteria requirements +
 *   dependency/gate metadata + intent/spec/plan/decision references +
 *   declared scope (never status/completedAt/notes/paths).
 * - intent: normalized semantic intent subset (never status/source).
 * - artifacts: repo-relative identity + content digests of referenced
 *   plan/spec/decision documents.
 * - workflow: profile + stage (never history timestamps/attempts).
 * - config: effective verification-relevant config subset
 *   (workflow/review/autonomy only).
 * - policy: effective verification-relevant policy subset
 *   (autonomy/review only).
 * - evidence: criterion id + requirement + verified/unverified + evidence
 *   type + ref (never recordedAt/updatedAt).
 */

/** Version of the binding record format (stored on every bound verdict). */
export const STATE_BINDING_VERSION = 1 as const;

/** Component names in canonical order (diagnostics + iteration). */
export const BINDING_COMPONENT_NAMES = [
  "sourceState",
  "taskContract",
  "intent",
  "artifacts",
  "workflow",
  "config",
  "policy",
  "evidence",
] as const;
export type BindingComponentName = (typeof BINDING_COMPONENT_NAMES)[number];

export type StateBindingComponents = Record<BindingComponentName, string>;

/**
 * Computed current-state binding. `stateDigest` identifies the full bound
 * state; `bundleDigest` identifies the verification bundle built over it
 * (function of task + stateDigest only — Markdown rendering never
 * participates, and the digest preimage excludes its own digest field, so
 * there is no recursive self-hashing).
 */
export interface ComputedStateBinding {
  version: typeof STATE_BINDING_VERSION;
  taskId: string;
  components: StateBindingComponents;
  stateDigest: string;
  bundleDigest: string;
  /** True when git was unavailable and source state is explicitly degraded. */
  gitUnavailable: boolean;
}

export const BINDING_PROBLEM_CODES = {
  unavailable: "VERIFICATION-BINDING-UNAVAILABLE",
  artifactMissing: "VERIFICATION-ARTIFACT-MISSING",
} as const;

export class StateBindingError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

const TASK_ID_PATTERN = /^TASK-\d{4}$/;

/** Source-state exclusions: ledger + task-doc bookkeeping churn. */
const SOURCE_STATE_EXCLUDED_PREFIXES = [".ackit/", "docs/tasks/"] as const;

/**
 * Intent documents are excluded from byte coverage: their verification
 * semantics ride the intent digest instead, so a provenance-only flip
 * (draft → accepted, source annotations) cannot stale through the byte
 * backstop while content changes still stale via the intent component.
 * The prefix reuses the store's single source of truth (no duplication).
 */
const INTENT_EXCLUDED_PREFIX = `${INTENT_DIR}/`;

/**
 * Root config files excluded from byte coverage: their verification
 * semantics are bound by the config/policy digests instead, so
 * formatting-only rewrites cannot stale a verdict while semantic changes
 * still do (via those digests). Mirrors the docs/tasks/ rationale.
 */
const SOURCE_STATE_EXCLUDED_FILES = ["ackit.yml", "ackit-policy.yml"] as const;

function isSourceExcluded(relativePath: string): boolean {
  if ((SOURCE_STATE_EXCLUDED_FILES as readonly string[]).includes(relativePath)) return true;
  if (relativePath.startsWith(INTENT_EXCLUDED_PREFIX)) return true;
  return SOURCE_STATE_EXCLUDED_PREFIXES.some((prefix) => relativePath.startsWith(prefix));
}

/**
 * Compute the current state binding for a task. Deterministic: identical
 * bound state in any temp root/process yields identical digests (no absolute
 * paths, no mtimes, no clock, no insertion-order dependence). Read-only:
 * never writes.
 *
 * Fail-closed: missing referenced artifacts throw with
 * VERIFICATION-ARTIFACT-MISSING; unreadable binding inputs throw with
 * VERIFICATION-BINDING-UNAVAILABLE. Git unavailability degrades explicitly
 * (gitUnavailable: true, digested marker) instead of a silent strong claim.
 */
export async function computeStateBinding(
  repositoryRoot: string,
  taskId: string,
): Promise<ComputedStateBinding> {
  if (!TASK_ID_PATTERN.test(taskId)) {
    throw new StateBindingError(BINDING_PROBLEM_CODES.unavailable, `invalid task id '${taskId}'`);
  }
  const { TaskStore } = await import("../tasks/store.js");
  const found = await new TaskStore(repositoryRoot).find(taskId);
  if (found === null) {
    throw new StateBindingError(BINDING_PROBLEM_CODES.unavailable, `unknown task '${taskId}'`);
  }
  const doc = found.doc;

  const { loadAckitConfig } = await import("../config/load.js");
  const configResult = await loadAckitConfig(repositoryRoot, {});
  // Gate-consistent fallback: an unloadable config binds as the verification
  // subset of defaults (the completion gate likewise enforces defaults then;
  // malformed config is the config doctor's business, never a silent hole).
  const configForBinding = configResult.ok ? configResult.config : null;

  const source = await digestSourceState(repositoryRoot);
  const components: StateBindingComponents = {
    sourceState: source.digest,
    taskContract: digestTaskContract(doc),
    intent: await digestIntent(repositoryRoot, doc),
    artifacts: await digestArtifactRefs(repositoryRoot, doc),
    workflow: await digestWorkflow(repositoryRoot, taskId),
    config: digestVerificationConfig(configForBinding),
    policy: await digestVerificationPolicy(repositoryRoot, configForBinding),
    evidence: await digestEvidence(repositoryRoot, taskId),
  };
  const stateDigest = domainDigest("state", { task: taskId, components });
  const bundleDigest = domainDigest("bundle", { task: taskId, state: stateDigest });
  return {
    version: STATE_BINDING_VERSION,
    taskId,
    components,
    stateDigest,
    bundleDigest,
    gitUnavailable: source.gitUnavailable,
  };
}

/**
 * Compare a stored binding against freshly computed state. Returns the
 * per-component change set for diagnostics (which bound class moved).
 */
export function compareStoredBinding(
  stored: Pick<ComputedStateBinding, "components" | "stateDigest">,
  current: ComputedStateBinding,
): { fresh: boolean; changed: BindingComponentName[] } {
  const changed: BindingComponentName[] = [];
  for (const name of BINDING_COMPONENT_NAMES) {
    if (!digestsEqual(stored.components[name], current.components[name])) {
      changed.push(name);
    }
  }
  const fresh = changed.length === 0 && digestsEqual(stored.stateDigest, current.stateDigest);
  return { fresh, changed };
}

function digestsEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
}

// ---------------------------------------------------------------------------
// sourceState
// ---------------------------------------------------------------------------

async function digestSourceState(
  repositoryRoot: string,
): Promise<{ digest: string; gitUnavailable: boolean }> {
  let head: string | null = null;
  let changed: string[] | null = null;
  try {
    head = gitHead(repositoryRoot);
  } catch {
    head = null;
  }
  try {
    const { expandChangedFiles } = await import("../drift/assemble.js");
    changed = expandChangedFiles(repositoryRoot);
  } catch {
    changed = null;
  }
  if (head === null && changed === null) {
    // Explicit degraded mode (ADR-0030 §5): never a silent strong claim.
    // Two git-less states with identical other inputs share this digest —
    // a WEAK, explicitly-marked equivalence, exposed via `gitUnavailable`.
    return {
      digest: domainDigest("source-state", { mode: "degraded", git: "unavailable" }),
      gitUnavailable: true,
    };
  }
  const { normalizeRelativePath } = await import("../filesystem/paths.js");
  const files: { path: string; kind: string; sha?: string; target?: string }[] = [];
  for (const raw of (changed ?? []).filter((f) => !isSourceExcluded(f)).sort()) {
    const normalized = normalizeRelativePath(raw);
    if (!normalized.ok) {
      throw new StateBindingError(
        BINDING_PROBLEM_CODES.unavailable,
        `cannot bind source path '${raw}' (escapes repository root)`,
      );
    }
    if (normalized.value.length === 0) continue;
    // Skip the excluded prefixes again post-normalization (defense in depth).
    if (isSourceExcluded(normalized.value)) continue;
    files.push(await digestWorktreeFile(repositoryRoot, normalized.value));
  }
  return {
    digest: domainDigest("source-state", {
      head,
      files,
      ...(head === null ? { git: "head-unavailable" } : {}),
    }),
    gitUnavailable: head === null,
  };
}

function gitHead(repositoryRoot: string): string {
  const out = execFileSync("git", ["-C", repositoryRoot, "rev-parse", "HEAD"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const head = out.trim();
  if (!/^[0-9a-f]{40}$/.test(head)) throw new Error("unexpected git HEAD shape");
  return head;
}

async function digestWorktreeFile(
  repositoryRoot: string,
  relativePath: string,
): Promise<{ path: string; kind: string; sha?: string; target?: string }> {
  const absolute = path.resolve(repositoryRoot, ...relativePath.split("/"));
  let stat: Stats;
  try {
    stat = await fsp.lstat(absolute);
  } catch {
    return { path: relativePath, kind: "deleted" };
  }
  if (stat.isSymbolicLink()) {
    // Safe symlink semantics: digest the link target STRING, never follow.
    // Following could escape the root or read arbitrary state; the target
    // string itself is the deterministic, contained fact.
    const target = await fsp.readlink(absolute);
    return {
      path: relativePath,
      kind: "symlink",
      sha: domainDigest("worktree-symlink", { target: target.split("\\").join("/") }),
    };
  }
  if (stat.isFile()) {
    return { path: relativePath, kind: "file", sha: await hashFileBytes(absolute) };
  }
  if (stat.isDirectory()) {
    // Post-expansion leftovers only (git tracks no dirs): digest the sorted
    // immediate child names (bounded) so the entry stays deterministic.
    let entries: string[] = [];
    try {
      entries = (await fsp.readdir(absolute)).sort().slice(0, 1024);
    } catch {
      entries = [];
    }
    return {
      path: relativePath,
      kind: "dir",
      sha: domainDigest("worktree-dir", { entries }),
    };
  }
  return { path: relativePath, kind: "other" };
}

async function hashFileBytes(absolute: string): Promise<string> {
  const handle = await fsp.open(absolute, "r");
  try {
    const hash = createHash("sha256");
    const buffer = Buffer.alloc(64 * 1024);
    for (;;) {
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, null);
      if (bytesRead === 0) break;
      hash.update(bytesRead === buffer.length ? buffer : buffer.subarray(0, bytesRead));
    }
    return hash.digest("hex");
  } finally {
    await handle.close();
  }
}

// ---------------------------------------------------------------------------
// taskContract — verification semantics only, never mutable bookkeeping.
// ---------------------------------------------------------------------------

type TaskDocLike = TaskDoc;

function digestTaskContract(doc: TaskDocLike): string {
  // Verification semantics only: task identity, acceptance-criteria
  // requirements, dependency/gate metadata, intent/spec/plan/decision
  // references, declared scope. Status/completedAt/completion notes and the
  // active/archive path are MUTABLE BOOKKEEPING — hashing them would make
  // completion/archive stale its own verdict (circular gate, ADR-0030 §6).
  const criteria = criteriaFromTaskDoc(doc);
  const meta = doc.meta;
  return domainDigest("task-contract", {
    task: meta.id,
    title: collapseWhitespace(meta.title),
    // Document order is semantic (AC-### ids are positional); checkbox marks
    // are progress bookkeeping and excluded — the evidence registry carries
    // the bound verified/unverified signal instead.
    criteria: criteria.map((c) => collapseWhitespace(c.requirement)),
    dependencies: [...meta.dependencies].sort(),
    intentRef: meta.intentRef ?? null,
    specRefs: [...(meta.specRefs ?? [])].sort(),
    decisionRefs: [...(meta.decisionRefs ?? [])].sort(),
    planRef: meta.planRef ?? null,
    scope: declaredScopeGlobs(doc).map(collapseWhitespace).sort(),
  });
}

// ---------------------------------------------------------------------------
// intent + referenced artifacts (content-bound, containment-safe)
// ---------------------------------------------------------------------------

async function digestIntent(repositoryRoot: string, doc: TaskDocLike): Promise<string> {
  const intentRef = doc.meta.intentRef;
  if (intentRef === undefined) return domainDigest("intent", { mode: "none" });
  const { IntentStore } = await import("../intent/store.js");
  const { normalizeIntent } = await import("../intent/normalize.js");
  const found = await new IntentStore(repositoryRoot).find(intentRef);
  if (found === null) {
    throw new StateBindingError(
      BINDING_PROBLEM_CODES.artifactMissing,
      `referenced intent '${intentRef}' cannot be loaded`,
    );
  }
  const normalized = normalizeIntent(found.doc.meta);
  // Semantic subset: status/source are provenance bookkeeping (an intent
  // moving draft → accepted must not stale its own verification).
  const { status: _status, source: _source, ...semantic } = normalized;
  void _status;
  void _source;
  return domainDigest("intent", semantic);
}

async function digestArtifactRefs(repositoryRoot: string, doc: TaskDocLike): Promise<string> {
  const refs = [
    ...(doc.meta.specRefs ?? []),
    ...(doc.meta.decisionRefs ?? []),
    ...(doc.meta.planRef !== undefined ? [doc.meta.planRef] : []),
  ].sort();
  const unique = [...new Set(refs)];
  if (unique.length === 0) return domainDigest("artifact-refs", { refs: [] });
  const entries: { ref: string; sha: string }[] = [];
  for (const ref of unique) {
    entries.push({ ref, sha: await hashContainedFile(repositoryRoot, ref) });
  }
  return domainDigest("artifact-refs", { refs: entries });
}

/**
 * Containment-safe file read (reuses `normalizeRelativePath`/`isInsideRoot`,
 * never duplicates containment logic): repo-relative identity + content
 * digest, no absolute paths emitted. Missing files, escapes, and link
 * escapes all fail closed with VERIFICATION-ARTIFACT-MISSING.
 */
async function hashContainedFile(repositoryRoot: string, ref: string): Promise<string> {
  const { normalizeRelativePath, isInsideRoot } = await import("../filesystem/paths.js");
  const normalized = normalizeRelativePath(ref);
  if (!normalized.ok || normalized.value.length === 0) {
    throw new StateBindingError(
      BINDING_PROBLEM_CODES.artifactMissing,
      `referenced document '${ref}' escapes the repository root (refused)`,
    );
  }
  const resolved = path.resolve(repositoryRoot, ...normalized.value.split("/"));
  if (!isInsideRoot(repositoryRoot, resolved)) {
    throw new StateBindingError(
      BINDING_PROBLEM_CODES.artifactMissing,
      `referenced document '${ref}' escapes the repository root (refused)`,
    );
  }
  let real: string;
  try {
    real = await fsp.realpath(resolved);
  } catch {
    throw new StateBindingError(
      BINDING_PROBLEM_CODES.artifactMissing,
      `referenced document '${ref}' does not exist`,
    );
  }
  let realRoot: string;
  try {
    realRoot = await fsp.realpath(repositoryRoot);
  } catch {
    realRoot = repositoryRoot;
  }
  const rel = path.relative(realRoot, real);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new StateBindingError(
      BINDING_PROBLEM_CODES.artifactMissing,
      `referenced document '${ref}' resolves outside the repository root via link (refused)`,
    );
  }
  let stat: Stats;
  try {
    stat = await fsp.stat(real);
  } catch {
    throw new StateBindingError(
      BINDING_PROBLEM_CODES.artifactMissing,
      `referenced document '${ref}' does not exist`,
    );
  }
  if (!stat.isFile()) {
    throw new StateBindingError(
      BINDING_PROBLEM_CODES.artifactMissing,
      `referenced document '${ref}' is not a file`,
    );
  }
  return hashFileBytes(real);
}

// ---------------------------------------------------------------------------
// workflow / config / policy / evidence — effective verification semantics
// ---------------------------------------------------------------------------

async function digestWorkflow(repositoryRoot: string, taskId: string): Promise<string> {
  const { WorkflowStore } = await import("../workflow/store.js");
  const { resolveRepositoryRoot } = await import("../filesystem/root.js");
  const resolved = await resolveRepositoryRoot(repositoryRoot);
  if (!resolved.ok) {
    throw new StateBindingError(
      BINDING_PROBLEM_CODES.unavailable,
      "cannot resolve repository root for workflow binding",
    );
  }
  const wf = await new WorkflowStore(resolved.root).load(taskId);
  // Legacy tasks (no workflow state) bind an explicit none-marker.
  if (wf === null) return domainDigest("workflow", { mode: "none" });
  // Profile + stage only: createdAt/updatedAt/stageHistory/attempts are
  // bookkeeping (the completion gate reads attempts directly; binding them
  // would make loop bookkeeping self-invalidate).
  return domainDigest("workflow", { profile: wf.profile, stage: wf.stage });
}

type VerificationConfigSubset = {
  workflow?: unknown;
  autonomy?: unknown;
  review?: unknown;
};

function verificationConfigSubset(
  config: {
    workflow?: unknown;
    autonomy?: unknown;
    review?: unknown;
  } | null,
): VerificationConfigSubset {
  if (config === null) return {};
  const subset: VerificationConfigSubset = {};
  if (config.workflow !== undefined) subset.workflow = config.workflow;
  if (config.autonomy !== undefined) subset.autonomy = config.autonomy;
  if (config.review !== undefined) subset.review = config.review;
  return subset;
}

function digestVerificationConfig(
  config: {
    workflow?: unknown;
    autonomy?: unknown;
    review?: unknown;
  } | null,
): string {
  // Effective verification-relevant semantics (parsed subset, canonical
  // form): incidental ackit.yml formatting never participates, and
  // verification-irrelevant sections (scan/limits/instructions/…) cannot
  // stale a verdict.
  return domainDigest("config", verificationConfigSubset(config));
}

async function digestVerificationPolicy(
  repositoryRoot: string,
  config: { policy?: { extends?: string[] }; autonomy?: unknown; review?: unknown } | null,
): Promise<string> {
  const { resolvePolicy } = await import("../policy/resolve.js");
  const { resolveAutonomy, resolveReview } = await import("../policy/tiers.js");
  const extendsEntries = config?.policy?.extends ?? [];
  let documents: { autonomy?: unknown; review?: unknown }[] = [];
  try {
    const resolved = await resolvePolicy(
      { canonicalPath: repositoryRoot },
      { entryFiles: extendsEntries },
    );
    documents = resolved.documents as { autonomy?: unknown; review?: unknown }[];
  } catch {
    // Gate-consistent fallback (mirrors reviewPolicyProblems): unresolvable
    // policy binds as empty layers (defaults). Corrupt policy is the policy
    // doctor's business; the binding always matches what the gate enforces.
    documents = [];
  }
  const autonomyLayers: unknown[] = [];
  const reviewLayers: unknown[] = [];
  for (const document of documents) {
    autonomyLayers.push(document.autonomy);
    reviewLayers.push(document.review);
  }
  autonomyLayers.push(config?.autonomy);
  reviewLayers.push(config?.review);
  // Effective tables (deny-wins merging, defaults filled): formatting and
  // verification-irrelevant policy sections (rules/suppressions/patterns)
  // never participate.
  const { autonomy } = resolveAutonomy(autonomyLayers);
  const { review } = resolveReview(reviewLayers);
  return domainDigest("policy", { autonomy, review });
}

async function digestEvidence(repositoryRoot: string, taskId: string): Promise<string> {
  const { EvidenceStore } = await import("../evidence/store.js");
  const { resolveRepositoryRoot } = await import("../filesystem/root.js");
  const resolved = await resolveRepositoryRoot(repositoryRoot);
  if (!resolved.ok) {
    throw new StateBindingError(
      BINDING_PROBLEM_CODES.unavailable,
      "cannot resolve repository root for evidence binding",
    );
  }
  const registry = await new EvidenceStore(resolved.root).load(taskId);
  if (registry === null) return domainDigest("evidence", { mode: "none" });
  // Material semantic proof state only: bookkeeping dates (recordedAt /
  // updatedAt) are excluded with rationale — they record WHEN proof was
  // logged, not WHAT was proven; including them would make the passage of
  // time (or a re-sync touching updatedAt) stale a verdict.
  const criteria = [...registry.criteria]
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .map((criterion) => ({
      id: criterion.id,
      requirement: collapseWhitespace(criterion.requirement),
      status: criterion.status,
      evidence: [...criterion.evidence]
        .map((entry) => ({ type: entry.type, ref: entry.ref }))
        .sort((a, b) => (a.type < b.type ? -1 : a.type > b.type ? 1 : a.ref < b.ref ? -1 : 1)),
    }));
  return domainDigest("evidence", { criteria });
}
