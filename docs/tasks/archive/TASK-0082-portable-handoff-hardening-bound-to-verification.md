---
id: "TASK-0082"
title: "Portable handoff hardening bound to verification state"
status: completed
schemaVersion: 2
dependencies:
  - "TASK-0079"
  - "TASK-0081"
createdAt: "2026-09-04"
completedAt: 2026-09-05
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

- [x] Handoff binds the full list (state, evidence/verdict pointers+digests, staleness, next-action contract, redaction manifest, provider-neutral instructions) or records an explicit justified exception per item.
- [x] Stale/invalid handoff refused with TASK-0079 stable codes (proven).
- [x] Determinism fixture green; v1 handoffs still readable; redaction fixture green.
- [x] No duplicate subsystem (diff reviewable as extension).
- [x] Full gates green with counts; offline/scan/hygiene hold; real-gate completion with evidence.

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

Implemented 2026-09-05 on `release/v0.5.0` (single-lane, third chain on
the same branch/PR #20).

Audit: v1 handoff was markdown-only (no digests, no machine import, no
staleness refusal surface); the checkpoint record, status contract, and
binding engines existed but uncomposed. No duplicate subsystem created:
`renderHandoffPack`/`renderResumeContext` untouched (SDK allowlist
signatures frozen; default `export` output byte-identical).

Implementation: `src/core/checkpoint/handoff.ts` — `ackit.handoff.v2`
(strict zod, `handoff.schema.json` generated idempotently) wrapping the
v1 pack with task/workflow, full checkpoint record + export-time
staleness, evidence presence/problems, verification binding
(state/bundle/components) + latest-verdict trust summary, the TASK-0081
status contract embedded verbatim (`blockers` + `next`), a redaction
manifest, and provider-neutral resume steps. `buildHandoff` composes
stores + `buildStatusReport` + binding/summary engines, deep-scrubs all
free text with the shared G4 scrubber (new `scrubAbsolutePaths` export;
pack's inline loop unified onto it, behavior-identical), and fails
closed on secrets. `parseHandoffFile` identifies v1 markdown by content
(`HANDOFF-V1-UNBOUND` migration code: v1 was never machine-readable, so
there is nothing deterministic to read back — re-export is the
migration) and re-gates secrets on input. `validateHandoff` recomputes
current binding via the TASK-0079 engine (`compareStoredBinding` →
`VERDICT-STATE-STALE` with changed classes), consistency-checks the
bundle reference (tamper → `HANDOFF-INVALID`), re-validates checkpoint
staleness, and renders the validated embedded pack (resume equivalence).
CLI: `checkpoint export --format md|json` (md default unchanged),
read-only `checkpoint import <file>` (fresh → 0 with resume;
stale → 1 with 0079 codes like `validate`; shape/version/task → 2;
traversal → 4). Import mutates nothing (no autonomy gate, like
show/validate). Docs: `docs/concepts/checkpoints.md` v2 section,
workflow-example transfer snippet, CLI reference row.

Evidence: 10 unit tests (round-trip + resume equivalence, v1-embed
fidelity, stale refusal with changed classes, bundle-flip INVALID vs
component-flip STALE, unknown-task, v1/garbage shape codes,
determinism byte-equality, redaction scrub-count + secret fail-closed,
pre-verification handoff, unknown export) + 3 CLI integration tests
(accept/resume/porcelain-clean, stale exit-1 + v1 exit-2, md-default +
traversal/garbage/format guards) + cross-process fixture (export proc A
→ import proc B resume equivalence incl. `task resume` agreement →
moved-state refusal proc C) green; pre-existing checkpoint/context/
api-surface suites pass unmodified. Full `pnpm test` counts + all gates
recorded at completion-gate time. No quality gates weakened. No
publish/tag/release. TASK-0083 not started.

Final validation (2026-09-05, head `41cb3c2`): `pnpm test` 110 files /
678 passed / 1 conditional skip + 1 load-timeout (60s) in the heavy
handoff stale test under full parallel load — 0 assertion failures;
isolated re-run 10/10 green in 43s (known machine-contention flake
class, same as 0080/0081 runs). During the lane run the full suite
caught a REAL architecture-contract failure of this task's own making
(`checkpoint.ts` 569 lines > REQ-ARCH-008 500-line limit) — fixed by
splitting export/import handlers into `checkpoint-handoff.ts` (463 +
168 lines), no behavior change, contract suite green; the fix rides the
same implementation commit the verifier reviewed. Lint, format:check,
typecheck, build green (zero warnings); `gen:schemas` hash-idempotent
(new `handoff.schema.json`); smoke:cli PASS; version-parity PASS
(source 0.5.0-dev.0, stable 0.4.1); offline-egress PASS; text-hygiene
repo clean (915 files); config check, doctor, task doctor, skills
validate, scan --ci (readiness 88) PASS; `git diff --check` clean. Fresh
independent verifier: OVERALL PASS, zero blockers (zero warnings) —
no-duplicate-subsystem, binding list, refusal semantics, determinism +
redaction, v1 compat, 33/33 focused runs, docs all hold.
