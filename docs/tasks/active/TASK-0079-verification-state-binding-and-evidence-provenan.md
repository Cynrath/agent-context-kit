---
id: "TASK-0079"
title: "Verification state-binding and evidence provenance contract"
status: pending
schemaVersion: 2
dependencies:
  - "TASK-0078"
createdAt: "2026-09-04"
completedAt: null
---

## Purpose

Close the highest-value remaining trust gap: design a deterministic state-binding contract so a verifier verdict is tied to the exact state it approved. A stale or replayed verdict must not satisfy completion after relevant state changes. Audit/design fingerprint fields such as repository/source revision digest, task fingerprint, intent/plan/spec/decision fingerprint, config/policy digest, evidence registry digest, verification bundle digest, and verdict input digest. Solve deterministic local state binding first; do NOT jump to PKI, blockchain-style identity, or model-identity crypto.

## Consensus basis

Strong multi-auditor consensus (external audits normalized against post-v0.4.1 state; builtin skill parity/force items treated as DONE baseline): evidence/verdict state binding is the agreed MUST and the highest-value remaining trust gap, above any new scanner rule. Disagreements were about mechanism (crypto identity vs local determinism) — this task takes the agreed path: deterministic local state binding first.

## Scope

- Inventory current verification/evidence/verdict stores and their digests/pointers (`src/core/evidence/`, `src/core/verification/`, workflow store, task docs, config/policy resolution).
- Define the deterministic state-binding contract: exact field list, canonical digest computation (stable serialization, hash choice, redaction boundaries), and where each digest is recorded and checked.
- Define stale/replay semantics: which state changes invalidate which verdicts, exact error codes, and completion-gate behavior on stale input.
- Implement the contract in the verification/evidence core with deterministic fixtures (same input/config yields identical digests).
- Contract + unit + integration tests, including negative tests (mutate one bound field → verdict rejected with the stable error code).
- Docs: concept + reference updates describing the binding fields and staleness rules.

## Out of scope

- PKI, key management, blockchain-style identity, model/session-identity crypto claims.
- Verifier independence hardening (TASK-0080 builds on this contract).
- New scanner rules; LLM-judged semantic drift (explicitly deferred for v0.5.0).
- Browser Companion, hosted SaaS, cloud RAG/vector DB, model router.

## Dependencies

- TASK-0078 (version/state vocabulary must be stable before digests bind to it).

## Affected files / expected areas

- `src/core/evidence/**`, `src/core/verification/**`, `src/core/workflow/**` (as the audit finds them)
- `schemas/` (new/changed digest fields) + `pnpm gen:schemas` idempotence
- `tests/` contract/unit/integration suites for binding + staleness
- `docs/concepts/`, `docs/reference/` (binding contract docs)

## Acceptance criteria

- [ ] Contract defines the exact bound-field set with canonical digest rules; same input/config deterministically yields identical digests (fixture-proven).
- [ ] Stale/replayed verdict is rejected by the completion path with a stable error code (negative-proven per bound field class).
- [ ] Full gates green (`lint`, `format:check`, `typecheck`, `build`, `test` with counts, `gen:schemas` idempotent).
- [ ] Offline/no-secret invariants hold (`check-offline-egress`, `scan --ci`, text hygiene, `git diff --check`).
- [ ] Task completed through the real gate with evidence; no quality-gate weakening.

## Test steps

1. `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm build`.
2. Focused binding/staleness suites, then `pnpm test` (record counts).
3. `pnpm gen:schemas` + `git diff --exit-code -- schemas`.
4. Deterministic digest fixture check (run twice, byte-compare).
5. Negative probes: mutate each bound field class, confirm rejection + stable error code.
6. `doctor`, `task doctor`, `scan --ci`, `git diff --check`.

## Security considerations

- Digests must not leak secret values or absolute local paths; redaction boundaries tested.
- No new network/telemetry; offline-first preserved.
- Error messages free of internal paths and secret material.

## Risks

- Non-deterministic serialization (key order, timestamps) breaking digest stability → canonical form + frozen fixtures.
- Over-binding (trivial changes invalidate everything) vs under-binding (real changes pass) → field-class rationale recorded in the contract doc.

## Rollback plan

- Focused revert of contract commit(s) on the task branch before merge; after merge, forward fix.

## Completion notes

(placeholder)
