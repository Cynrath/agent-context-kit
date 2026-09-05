---
id: "TASK-0080"
title: "Verifier independence and replay-staleness hardening"
status: completed
schemaVersion: 2
dependencies:
  - "TASK-0078"
  - "TASK-0079"
createdAt: "2026-09-04"
completedAt: 2026-09-05
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

- [x] Every accepted verdict references its exact bundle digest; mismatch is refused with a stable error code (proven).
- [x] Self-issued verifier artifacts cannot silently qualify as independent (proven by negative fixture, stable code).
- [x] Replay/stale verdict rejected end-to-end via the cross-process fixture.
- [x] Documentation states the non-claims (no identity crypto) alongside the proven properties.
- [x] Full gates green with counts; offline/scan/hygiene gates hold; real-gate completion with evidence.

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

Implemented 2026-09-05 on `release/v0.5.0` (single-lane; no per-task
branch/PR per v0.5.0 execution mode).

Audit: `verifier.context: fresh|same` was purely declarative (any same-
process author could claim fresh); `--bundle` was optional and its success
path unproven; re-presenting a verdict file re-bound it to current state
with a new id (old judgments laundered as current); the completion gate
already said it requires an *independent* verdict but checked nothing of
the kind. Real defect found in the TASK-0079 contract surface (not the
digests): the `--bundle` success path is unreachable when review artifacts
live under bound paths, because the bundle/verdict files themselves are
working-set state (proven by manual repro: exit 2 mismatch with zero
implementation change). Fixed WITHOUT altering any TASK-0079 digest rule:
review-artifact lifecycle documented (transient artifacts under `.ackit/`,
excluded from binding by design), `VERDICT-BUNDLE-MISMATCH` diagnostics
made actionable, all end-to-end flows model the honest protocol. Digest
contract, drift codes, `--force` semantics, v1 readability unchanged.

Implementation: `reviewedBundleDigest` (hex|null, optional for 0079-era
compat) on `ackit.verdict.v2`; pure `assessVerdictIndependence` classifier
(reviewed-bundle | self-issued | same-context | legacy-unbound);
canonical `verdict-content` digest (new domain in the 0079 module) for
replay detection; store refuses fresh-without-proof
(`VERDICT-INDEPENDENCE-UNPROVEN`), mismatched proof
(`VERDICT-BUNDLE-MISMATCH`), and identical-content re-registration
(`VERDICT-REPLAY-REJECTED`); completion gate requires independence where
it requires a verdict (freshness first, no double-reporting for legacy);
`verification show/record --json` expose
independent/reviewedBundleDigest/independenceCode. Docs: ADR-0031 (+ index
line, incl. previously unindexed ADR-0030), concept independence section +
review-artifact lifecycle + non-claims, CLI reference rows.

Evidence: 7 new unit independence tests + 5-test real-subprocess
cross-process fixture (accept / stale-refusal / unproven-refusal / replay-
refusal / same-context-register-but-blocked) + gate negative test green;
existing suites moved to the new contract (same-process tests declare
`same` or carry proof; re-verdict tests author new content); full `pnpm
test` counts + all gates recorded at completion-gate time. No quality
gates weakened. No publish/tag/release. TASK-0081 not started.

Final validation (2026-09-05, head `a781a8c` unless noted):
`pnpm test` 105 files / 655 passed / 1 conditional skip (pre-existing
symlink-behavior skip), 0 failed with `--maxWorkers 2` (full-parallel runs
showed rotating 60s load-timeouts in heavy git-fixture tests, passing
isolated in seconds — known machine-contention flake class, zero assertion
failures in every run); lint, format:check, typecheck, build green;
`gen:schemas` hash-idempotent; smoke:cli + smoke:package
(`cynrath-agent-context-kit-0.5.0-dev.0.tgz`, nothing published) PASS;
version-parity PASS (source 0.5.0-dev.0, stable 0.4.1); offline-egress
PASS; text-hygiene repo clean; config check, doctor, task doctor, skills
validate, scan --ci (readiness 88) PASS; `git diff --check` clean.
PR #20 (`release/v0.5.0` → `master`) exact-head CI: 12/12 green on
`cc15d6a` (verify 3 OS × 2 node, package-smoke 3 OS, extension, dogfood
self-scan, action smoke). Fresh independent verifier: OVERALL PASS, zero
blockers (31/31 focused suites, doctor/task-doctor/scan green,
schema-idempotent, tree clean). Two verifier follow-ups applied on top
(`record --json` gains `independenceCode` per ADR-0031 §4; gate tamper
message made exact). Two accepted-risk notes recorded, not implemented:
replay digest covers volatile `verifier.issuedAt`/`agent` (exact-byte
replay — the criterion — refused; date-bump fabrication equals
local-operator fabrication, explicitly out of scope); gate dual-blocker
wording was fixed, record/show parity confirmed.
Process note (Rule 9 transparency): one commit message on this lane
contained stray non-ASCII characters from shell input handling; caught
pre-push hygiene review, fixed by amending the UNPUSHED local commit only
(pushed history `cc15d6a` untouched; amended text re-checked with
text-hygiene PASS). No quality gates weakened. No publish/tag/release.
