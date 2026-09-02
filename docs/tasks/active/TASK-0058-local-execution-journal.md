---
id: "TASK-0058"
title: "local execution journal"
status: completed
schemaVersion: 2
dependencies: ["TASK-0048", "TASK-0052", "TASK-0053"]
createdAt: "2026-08-31"
completedAt: 2026-09-01
---

## Purpose

Implement the local-first, sanitized execution journal (§15/ADR-0028): a deterministic, redacted record of only the events ACKit itself can truthfully observe — task transitions, ACKit commands, policy decisions, evidence registration, verdicts, checkpoints, workflow stage changes, with timestamps — materially supporting resume diagnostics and evidence chains. It is never telemetry, never uploaded, never a conversation capture.

## Scope

- `src/core/journal/types.ts`: `JOURNAL_SCHEMA_ID = "ackit.execution-journal.v1"`; `JournalEventSchema` (strict): `{ schemaId, seq (monotonic per repository journal), occurredAt (date-only ISO), kind: "task-transition"|"ackit-command"|"policy-decision"|"evidence-registered"|"verdict-registered"|"checkpoint-created"|"workflow-stage"|"verification-attempt", taskId?, detail: { bounded, redacted } }` with per-kind required/forbidden fields (e.g. `ackit-command` records command name + outcome code, never arguments that could embed secrets).
- `src/core/journal/store.ts`: append-only JSONL journal at `.ackit/workflow/journal.jsonl` (one event per line, canonical key order); size-capped with deterministic rotation (rename to `journal-<n>.jsonl`, cap count); redaction at construction (reuse canonical secret-gate + absolute-path scrubbing helpers — same single source as packs).
- Wiring (only inside ACKit's own command paths): task start/complete/archive transitions; workflow set/advance/verify; evidence sync/verify; verdict record; checkpoint create; policy `--force` override decisions (POLICY-TIER decisions); `error`/`sessionEnd` advisory kinds are recorded only when an ACKit command itself failed (bounded, no stack traces, no paths).
- CLI: `ackit journal show [--limit n] [--task TASK-ID]` (deterministic reverse-chronological terminal view + JSON), `ackit journal validate` (schema + ordering + redaction audit over the journal file).
- Tests: append ordering + monotonic seq under concurrent-ish sequential writes; redaction (secret-shaped detail values replaced; absolute paths scrubbed); rotation determinism; invalid-event rejection; no conversation/thought capture (kind list is closed — test asserts the closed enum); journal absence never blocks any command (best-effort with explicit diagnostic on failure, never a crash).

## Out of scope

- Any upload, aggregation, analytics, or cross-repository correlation.
- Capturing provider conversations, tool calls, or hidden reasoning (structurally impossible: closed kind list, no such fields).
- CI-facing journal gates (local diagnostic surface only).

## Affected files

- `src/core/journal/types.ts`, `store.ts`, `index.ts` (new)
- wiring in `src/cli/commands/task.ts`, `workflow.ts`, `evidence.ts`, `verification.ts`, `checkpoint.ts` (minimal, non-blocking calls)
- `src/cli/commands/journal.ts` (new), `src/cli/program.ts`
- `scripts/generate-schemas.mjs`, `schemas/execution-journal.schema.json` (new)
- `tests/unit/journal/*.ts`, `tests/integration/journal/*.ts` (new)

## Acceptance criteria

- [x] Journal events record only the closed kind list; events append in deterministic order with monotonic seq; file is strict-validated by `ackit journal validate`.
- [x] Redaction proven by test: secret-shaped and absolute-path values never persist (canonical gate reused, no parallel list).
- [x] Rotation is deterministic and size-capped; journal failure never breaks the primary command (best-effort semantics with visible diagnostic).
- [x] No telemetry surface exists: no network, no upload, no cross-repo id (offline-egress gate green).
- [x] `schemas/execution-journal.schema.json` current; tests pass with recorded counts.

## Test steps

1. `pnpm typecheck && pnpm lint && pnpm format:check`
2. `pnpm build && pnpm gen:schemas` (`git diff --exit-code schemas/`)
3. `pnpm vitest run tests/unit/journal tests/integration/journal`
4. Full `pnpm test` + `node scripts/check-offline-egress.mjs`.

## Security considerations

- Detail fields are length-capped and redacted at construction; the closed kind list structurally excludes conversation/thought/tool-call capture.
- Journal is untrusted local state on read: strict validation, no execution, containment on path.

## Risks

- Write overhead on hot paths — mitigated by single-line appends; measured in TASK-0060 benchmarks (no overhead claims before measurement).

## Rollback plan

Focused revert; journal state is disposable `.ackit/` data.

## Completion notes

- `src/core/journal/` (types/store/index): `ackit.execution-journal.v1` with the CLOSED
  eight-kind event list (task-transition, ackit-command, policy-decision,
  evidence-registered, verdict-registered, checkpoint-created, workflow-stage,
  verification-attempt) — conversation/thought/tool-call capture is STRUCTURALLY
  impossible (asserted by test). Per-kind strict detail shapes (bounded fields; the
  ackit-command kind records command name + outcome code ONLY, never arguments).
- `JournalStore` at `.ackit/workflow/journal.jsonl`: append-only JSONL, monotonic seq
  across deterministic rotations (5000-line cap, 3-file cap: .jsonl → .jsonl.1 → .jsonl.2);
  redaction at construction via the CANONICAL secret gate (single detection source, T26) —
  a redacted event keeps its event-level taskId context and re-validates on read (the
  `{redacted: true}` detail is a valid shape for every kind); invalid events are never
  persisted (schema-refused) and never crash the primary command (best-effort append
  returning false); `validate()` audits every line (invalid/secret-shaped lines fail).
- Wiring (all best-effort, non-blocking): task start/complete/archive transitions,
  workflow advance (stage) + verify (attempts), evidence verify (registration), verdict
  record, checkpoint create, policy tier decisions (force-completion boundary).
- CLI `ackit journal show [--limit n] [--task id]` (newest-first, deterministic) and
  `ackit journal validate` (audit gate: exit 1 on invalid/secret-shaped lines); JSON
  shape `ackit.journal-report.v1`.
- `schemas/execution-journal.schema.json` emitted and committed; `pnpm gen:schemas`
  idempotent. Offline-egress PASS — no network primitives anywhere (journal is pure fs).
- Tests: unit 7/7 (monotonic append + ordered read, redaction with taskId survival +
  re-read validity, closed-kind-list refusal of non-journal kinds and invalid shapes,
  validate audit incl. tampered-line failure, best-effort never-crash, kind-enum closure
  assertions, no absolute-path leakage). Full sequential suite result recorded in the
  commit.
- Gates: typecheck clean; lint 0 problems (285 files); format:check clean.
