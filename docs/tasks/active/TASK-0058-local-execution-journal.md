---
id: "TASK-0058"
title: "local execution journal"
status: pending
schemaVersion: 2
dependencies: ["TASK-0048", "TASK-0052", "TASK-0053"]
createdAt: "2026-08-31"
completedAt: null
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

- [ ] Journal events record only the closed kind list; events append in deterministic order with monotonic seq; file is strict-validated by `ackit journal validate`.
- [ ] Redaction proven by test: secret-shaped and absolute-path values never persist (canonical gate reused, no parallel list).
- [ ] Rotation is deterministic and size-capped; journal failure never breaks the primary command (best-effort semantics with visible diagnostic).
- [ ] No telemetry surface exists: no network, no upload, no cross-repo id (offline-egress gate green).
- [ ] `schemas/execution-journal.schema.json` current; tests pass with recorded counts.

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

(placeholder)
