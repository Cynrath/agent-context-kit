---
id: "TASK-0082"
title: "Portable handoff hardening bound to verification state"
status: pending
schemaVersion: 2
dependencies:
  - "TASK-0079"
  - "TASK-0081"
createdAt: "2026-09-04"
completedAt: null
---

## Purpose

Harden ACKit's existing checkpoint/resume/handoff (do NOT invent a duplicate subsystem): create a v2/extended handoff only if needed to bind task/workflow state, evidence/verdict pointers/digests, staleness state, next-action contract, redaction manifest, and provider-neutral instructions. Same input/config must be deterministic.

## Consensus basis

Strong multi-auditor consensus (SHOULD): checkpoint/resume/handoff already exists and must be extended in place, bound to the new verification state, not replaced.

## Scope

- Audit current checkpoint/resume/handoff coverage vs the binding list (state, evidence/verdict pointers + digests from TASK-0079, staleness, next-action contract from TASK-0081, redaction manifest, provider-neutral instructions).
- Design the minimal v2/extended handoff delta (new fields/version marker, backward-compatible read of v1 handoffs, or a justified breaking rule with migration).
- Bind handoff acceptance to verification state: importing a handoff with stale/invalid digests must surface the TASK-0079 stable codes, never silently accept.
- Determinism: same input/config yields byte-identical handoff (fixture-proven); redaction manifest honored (secret/absolute-path scrub proven).
- Tests: round-trip (export → import → resume equivalence), stale-handoff refusal, v1 compatibility, determinism fixture, redaction fixture.
- Docs: handoff format reference + cross-agent resume guide updates.

## Out of scope

- A parallel/duplicate handoff subsystem; breaking v1 reads without a recorded migration.
- Autonomous execution on import (handoff resumes context, never auto-advances work).
- Cloud sync/transfer of handoffs.

## Dependencies

- TASK-0079 (digests/pointers and staleness codes to bind).
- TASK-0081 (next-action contract shape to embed).

## Affected files / expected areas

- `src/core/checkpoint/**`, handoff export/import paths
- `schemas/` (handoff fields) + `pnpm gen:schemas` idempotence
- `tests/` round-trip/stale/compat/determinism/redaction suites
- `docs/guides/`, `docs/reference/` (handoff docs)

## Acceptance criteria

- [ ] Handoff binds the full list (state, evidence/verdict pointers+digests, staleness, next-action contract, redaction manifest, provider-neutral instructions) or records an explicit justified exception per item.
- [ ] Stale/invalid handoff refused with TASK-0079 stable codes (proven).
- [ ] Determinism fixture green; v1 handoffs still readable; redaction fixture green.
- [ ] No duplicate subsystem (diff reviewable as extension).
- [ ] Full gates green with counts; offline/scan/hygiene hold; real-gate completion with evidence.

## Test steps

1. `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm build`.
2. Focused handoff suites, then `pnpm test` (record counts).
3. `pnpm gen:schemas` + `git diff --exit-code -- schemas`.
4. Cross-process resume proof (export in one process, import in another).
5. `doctor`, `task doctor`, `scan --ci`, `git diff --check`.

## Security considerations

- Redaction manifest must scrub secrets and absolute local paths; negative fixtures with synthetic secrets.
- Handoff import validates shape + digests before use (no trust on read).

## Risks

- Format-version sprawl → single version marker, explicit compat table.
- Over-binding making handoffs brittle across machines → bind content digests, never machine-local paths.

## Rollback plan

- Focused revert on the task branch before merge; after merge, forward fix.

## Completion notes

(placeholder)
