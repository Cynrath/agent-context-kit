# ADR-0027: Checkpoints, Resumability, and the Local Workflow Store

Status: Accepted · Date: 2026-08-31 · Governs: TASK-0048, 0049, 0058, 0062

## Context

Long-running work currently depends on conversation history surviving: compaction, a new
chat, a model/provider switch, a terminal restart, or a handoff to a fresh agent loses the
thread of half-finished tasks. The expansion must make resumability a deterministic,
repository-local property — without committed state churn and without any cloud/backend
state (permanently out of scope).

## Decision

1. **Checkpoint model (`ackit.checkpoint.v1`)** — per-task checkpoints at
   `.ackit/workflow/TASK-####/checkpoints/CP-####.yaml`, strict schema, deterministic
   serialization, atomic writes. Content: task id, workflow snapshot (profile/stage),
   `intentRef`/`planRef`, `completedWork[]`/`pendingWork[]` extracted deterministically from
   the task document's checkbox sections, `decisions[]`/`failures[]`/`blockers[]` from
   task-doc sections, `evidenceRefs[]`, `changedAreas[]` (git changed-file snapshot),
   `nextAction {objective, path?, command?, expectedResult?}` (explicit user/agent input),
   `gitHead` (short SHA), `createdAt` (date-only ISO). Checkpoints are explicitly created
   (`ackit checkpoint create <task> --next-objective ...`); nothing writes hidden state.

2. **Local state root** — all high-churn workflow state lives under `.ackit/workflow/`
   (state, checkpoints, evidence, verdicts, journal). `.ackit/` is already gitignored
   "generated; never committed" state, which matches checkpoint semantics: durable on the
   working machine across processes/sessions, never a source-control burden, never
   containing secrets (gated at construction). Cross-machine/cross-agent transfer uses
   explicit exports (handoff pack, verification bundle) written to user-chosen paths.

3. **Resume + handoff** — `renderResumeContext(taskId)` produces a concise deterministic
   markdown block (intent summary, completed vs pending, decisions/failures/blockers,
   evidence refs, exact next action) consumed by `ackit task resume` and by task-aware
   packs (`--resume`) as a REQ-CTX-001-style section. `renderHandoffPack(taskId)` emits a
   single self-contained handoff document (resume context + task doc + latest checkpoint +
   intent summary) for a fresh implementer/verifier on any machine. Resume correctness
   never depends on conversation history: provider switch = fresh process + same
   repository + same checkpoint files (proven by the mandated scenario test).

4. **Staleness detection** — `ackit checkpoint validate` compares the recorded `gitHead`
   and changed-area snapshot against current reality: `STALE_CHECKPOINT` when the recorded
   head is no longer reachable from HEAD or the recorded next-action surface changed under
   it. Git-unavailable is an explicit advisory (`gitUnavailable: true`), never a fabricated
   "fresh" state.

5. **Task-aware packs** — extend `buildContextPack` with caller-computed `taskContext`
   (declared scope globs, intent/plan/spec/evidence refs, pending-work mentions, changed
   files) and documented ranking weights; the resume section rides the existing section
   mechanism. Deterministic ranking and token budgets are preserved; no embeddings, no
   semantic retrieval, ever.

6. **Journal (optional, material)** — a sanitized append-only JSONL journal
   (`ackit.execution-journal.v1`, `.ackit/workflow/journal.jsonl`) of only ACKit-observable
   events (task transitions, ACKit command outcomes, policy decisions, evidence/verdict/
   checkpoint/stage events) with redaction at construction and a closed event-kind list.
   It materially supports resume diagnostics (event ordering behind state) and evidence
   chains; it is not telemetry, captures no conversations/thoughts/tool calls, and uploads
   nothing.

## Consequences

- Resumability is a property of repository + local state, not conversation: context
  compaction, new chats, model switches, provider switches, and restarts are all "fresh
  process reads the same files".
- Working-tree git hygiene is untouched (no checkpoint churn in commits).
- Determinism contract: same repository + same local state → byte-identical resume/handoff
  outputs (no sub-day timestamps in serialized artifacts).

## References

- ADR-0025 (state store conventions), ADR-0026 (checkpoint summary inside bundles)
- `docs/gitignore` (`.ackit/` policy), REQ-GOV-004/005 (no paths/secrets in artifacts)
