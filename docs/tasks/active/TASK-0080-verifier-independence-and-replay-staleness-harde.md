---
id: "TASK-0080"
title: "Verifier independence and replay-staleness hardening"
status: pending
schemaVersion: 2
dependencies:
  - "TASK-0078"
  - "TASK-0079"
createdAt: "2026-09-04"
completedAt: null
---

## Purpose

Harden what ACKit can actually prove about verification: current `fresh`/verifier metadata is still partly declarative. On top of the TASK-0079 state-binding contract, prove that a verdict references its exact bundle digest, that implementer-produced/self-issued verifier artifacts cannot silently qualify as independent, and that replayed/stale verdicts are rejected — with a cross-process verifier fixture and stable error codes. Do NOT claim cryptographic proof of model/session identity.

## Consensus basis

Strong multi-auditor consensus (MUST): verifier independence is declarative today and must be hardened with structural checks, not identity crypto. Builds directly on the TASK-0079 binding contract (verdict ↔ bundle digest linkage).

## Scope

- Audit current verifier/fresh metadata: what is proven vs declared (bundle references, issuer fields, timestamps, independence markers).
- Implement structural independence checks: verdict must reference its exact bundle digest (from TASK-0079); self-issued artifacts (same producer as the implementation under review) must be flagged and must not silently satisfy independence requirements.
- Replay/staleness rejection wired to the TASK-0079 digests with stable error codes.
- Cross-process verifier fixture: run verifier in a separate process and prove the independence properties end-to-end (no shared-memory trust).
- Tests: unit (independence predicates), integration (cross-process fixture), negative (self-issued artifact presented as independent → refused with stable code; replayed bundle → refused).
- Docs: what independence means in ACKit terms and, explicitly, what is NOT claimed (no model/session-identity crypto).

## Out of scope

- Cryptographic proof of model/session identity, PKI, key infrastructure.
- Changing the TASK-0079 digest contract itself (gaps found → file follow-up against TASK-0079, do not silently fork it).
- Autonomous verification scheduling/daemons.
- Browser Companion, hosted control plane, cloud services.

## Dependencies

- TASK-0078 (baseline vocabulary).
- TASK-0079 (bundle-digest contract this hardening references).

## Affected files / expected areas

- `src/core/verification/**`, verifier/fresh CLI surfaces
- `schemas/` (verdict/bundle reference fields) + `pnpm gen:schemas` idempotence
- `tests/` unit + cross-process integration fixture
- `docs/concepts/`, `docs/reference/` (independence semantics + non-claims)

## Acceptance criteria

- [ ] Every accepted verdict references its exact bundle digest; mismatch is refused with a stable error code (proven).
- [ ] Self-issued verifier artifacts cannot silently qualify as independent (proven by negative fixture, stable code).
- [ ] Replay/stale verdict rejected end-to-end via the cross-process fixture.
- [ ] Documentation states the non-claims (no identity crypto) alongside the proven properties.
- [ ] Full gates green with counts; offline/scan/hygiene gates hold; real-gate completion with evidence.

## Test steps

1. `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm build`.
2. Focused independence/replay suites incl. cross-process fixture, then `pnpm test` (record counts).
3. `pnpm gen:schemas` + `git diff --exit-code -- schemas`.
4. Negative probes per acceptance criteria (record stable codes).
5. `doctor`, `task doctor`, `skills validate`, `scan --ci`, `git diff --check`.

## Security considerations

- No identity material collected; no new trust roots introduced implicitly.
- Fixture uses synthetic values only; no secrets/absolute paths in artifacts.
- No gate weakening.

## Risks

- Cross-process fixture flakiness on CI (timeouts, Windows process semantics) → generous-but-bounded timeouts, deterministic ports/paths, retry-free assertions.
- Over-strict independence breaking legitimate single-operator flows → refusal must be explicit and actionable, never silent.

## Rollback plan

- Focused revert on the task branch before merge; after merge, forward fix.

## Completion notes

(placeholder)
