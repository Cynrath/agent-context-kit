# ADR-0032: Canonical Read-Only Status Projection

Status: Accepted · Date: 2026-09-05 · Governs: TASK-0081

## Context

Task, workflow, intent, evidence, verdict/bundle, drift, checkpoint, and
policy state each have a read surface, but no single command answers the
operator's five questions (what task, what stage, what blocks completion,
what is stale, what next). Agents today re-derive gate logic by hand —
a second, divergent engine in practice. One audit proposed a mutating
`ackit run` state machine; that variant is explicitly NOT accepted here
(it needs a boundary-proving ADR of its own, which is not this task).

## Decision

Add `ackit status [taskId]` (TASK-0081): a pure projection over the
owning engines, plus a read-only door on the completion gate. No new
gate predicates, no mutation, no `run`.

### 1. Command shape: why `status`, not `doctor --task`

`doctor` reports REPOSITORY-health problems with a gate exit contract;
status reports TASK-centric projection with next-actions. Merging them
conflates subjects, destabilizes doctor's contract, and forces unrelated
flags onto a health gate. One purpose-built read-only command is the
smaller change (no doctor output churn, no exit-code ambiguity), and the
name matches the operator question ("what is the status?"). Command
growth stops here: status takes no mutation flags, now or later.

### 2. Projection contract (`ackit.status.v1`)

`buildStatusReport(root, taskId?)` in `src/core/status/projection.ts`
composes, in order:

| Question | Sources (owning read paths only) |
|---|---|
| What task? | task store `find`/`list` (id/title/status/deps/notes), intent store (ref title/status) |
| What stage? | workflow store `load` (profile/stage/attempts) + profile catalog (`completionStage`, `resolveProfileRequirements`) |
| What blocks completion? | `TaskStore.completionBlockers` — the gate's OWN list, verbatim, same order, same stable codes (new public read-only method; `complete()` calls it, then mutates) |
| What is stale? | verdict trust summary (bound/fresh/changed/independent + 0079/0080 codes, surfaced never redefined); checkpoint staleness via the checkpoint engine (`collectStalenessContext` + `validateCheckpointStaleness`); evidence problems via `validateEvidence`; blocking drift arrives inside the gate's blockers (no second drift computation) |
| What next? | §3 derivation + the latest checkpoint's recorded next action |

Target resolution: explicit id, else the single active task; zero
actives → `none` resolution with a create action; multiple actives →
`ambiguous` resolution naming the candidates (never a silent pick).
Unknown/bad ids throw stable `STATUS-*` codes. Human rendering uses a
fixed section order; JSON is the same report object (stable contract,
byte-deterministic for identical stored state).

### 3. Next-action derivation rules

Every completion-gate blocker maps to ≥1 action BY ITS STABLE CODE
prefix (unchecked/notes/deps, `MISSING_REQUIRED_ARTIFACT`,
evidence `CRITERION_UNVERIFIED`/`REQUIRED_EVIDENCE_MISSING`/…,
`MISSING_VERIFIER_VERDICT`, `VERDICT_BLOCKING`, `VERDICT-STATE-STALE`,
`VERDICT-BINDING-MISSING`, `VERDICT-INDEPENDENCE-UNPROVEN`,
`WORKFLOW_STAGE_INVALID`, `VERIFICATION_ATTEMPT_FAILED`, drift codes,
the non-active precondition). Unknown future codes fall through to an
explicit inspect action, so derivation can never contradict the gate by
omission. Criterion-level commands come from the evidence engine's own
problem list (structured composition, not string parsing). The mapping
is presentation over the gate's output — the gate stays the single
engine, which is reviewable in the diff: `projection.ts` contains no
gate predicate, only engine calls and the code→suggestion table.
Suggested review commands keep artifacts under `.ackit/reviews/`
(ADR-0031 §5 lifecycle).

### 4. Read-only argument

Projection paths: `find`/`list`/`load`/`validate`/`latestVerdictSummary`/
`latest`/staleness validators — all documented reads. `status` performs
no writes, appends no journal, reads no clock. Proven by a mutation-spy
test: recursive content hashes (excluding `.git` internals) plus git
porcelain are byte-identical before/after projection, rendering, and CLI
runs in both modes. Secret/path posture matches existing read commands
(`task show`, `evidence show` display stored content raw; stored evidence
refs are secret-gated at registration; no new secret introduction).

### 5. Non-goals (explicit)

No `ackit run`, no autonomous execution, no second workflow engine, no
write paths in SDK/MCP/Action/VS Code (TASK-0083 may project this read
model outward; this task defines it). No policy mutation or autonomy
decisions — status shows `requiresEvidence`/`requiresVerdict` and the
gate's review blockers; `policy check` stays the policy tool.

## Consequences

- `complete()` refactored to a public `completionBlockers()` preview +
  mutation tail; gate behavior unchanged (all existing gate tests green
  unmodified).
- Fixture-pinned human + JSON outputs; read-only proof green; stable
  0079/0080 codes asserted surfaced (not redefined).
- CLI reference row + agent-integration notes reference `ackit status`
  as the first command in agent loops (before hand-inspecting stores).
- TASK-0082 (handoff) reuses the same composed state; TASK-0083 may
  expose the read model to other surfaces.
