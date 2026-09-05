---
id: "TASK-0079"
title: "Verification state-binding and evidence provenance contract"
status: active
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

## Audit (recorded 2026-09-05 on feat/task-0079-verification-state-binding)

Live behavior verified on master `d3195e7`: bundle schema
`ackit.verification-bundle.v1` (no canonical identity); verdict schema
`ackit.verdict.v1` (task/verifier/findings/checkedCriteria/summary, no
bundle/state digest binding); store validates task existence, criterion
references, blocking-on-PASS; `latestVerdictSummary()` returns only
`{ verdict }`; bundle embeds task, intent (+fingerprint), workflow,
evidence, prior verdicts, checkpoint, implementation surface (names only),
optional diff, verification-gate requirements, verifier role.

State matrix (class | current source | semantic? | must invalidate? |
canonical form | risk/reason):

- repository/worktree state | bundle: changed file NAMES only;
  checkpoint: short HEAD + changed names | YES | YES | sorted
  repo-relative paths + streaming content digests + full HEAD (staged,
  unstaged, untracked) | name-only binding under-binds (same name, new
  bytes would pass)
- task contract | bundle embeds whole task Markdown incl. notes | PARTIAL
  (criteria/refs/scope yes; status/notes no) | criteria/refs/scope YES,
  bookkeeping NO | id/title/requirements(document order)/deps/refs/scope
  | hashing whole Markdown makes completion stale its own verdict
- intent | bundle intent block + `intentFingerprint` | YES | YES |
  normalized subset minus status/source | status flips (draft→accepted)
  must not self-invalidate
- plan/spec/decision refs + contents | drift checks existence only;
  contents NOT bound | YES | YES | repo-relative identity + content
  digests; missing/escape fails closed | unjudged compliance material
- workflow profile/stage | bundle shows profile/stage | YES | YES |
  `{profile, stage}` | history/attempts/timestamps are loop bookkeeping
- resolved config | NOT in bundle; gate uses `resolveLifecycleGates([])`
  with NO config layers | PARTIAL (workflow/review/autonomy) | those
  sections YES | parsed subset in canonical form | formatting must not
  stale; scan/limits/etc. cannot affect acceptance
- resolved policy | NOT in bundle | PARTIAL (autonomy tier2 + review) |
  YES | effective `{autonomy, review}` tables | rules/suppressions are
  scan hygiene, not acceptance
- evidence registry | bundle shows criteria text | YES | YES |
  `{id, requirement, status, evidence[{type, ref}]}` sorted; dates
  excluded | `recordedAt`/`updatedAt` record WHEN, not WHAT
- verification bundle | v1 has no identity | YES (as input) | YES |
  `bundleDigest = H(bundle, {task, stateDigest})`; preimage excludes its
  own digest; rendering never participates | recursive self-hashing +
  formatting fragility
- checkpoint | bundle shows latest summary | NO | NO | excluded |
  resume aid, not reviewed state; binding it self-invalidates on every
  checkpoint write
- prior verdict history | bundle lists verdicts | NO | NO | excluded |
  outcomes, not reviewed state; binding is self-referential
- timestamps (issuedAt/updatedAt/recordedAt/mtimes/clock) | bookkeeping |
  NO | NO | excluded | time passage must not stale; determinism §16
- task status/completedAt | lifecycle | NO | NO | excluded | circular
  gate prevention (§6)
- completion notes / checkbox marks | written after verification | NO |
  NO | excluded (evidence registry is the bound verified signal) |
  normal flow verify → notes → complete must stay possible
- staged/unstaged/untracked files | partial (names only) | YES | YES |
  covered by sourceState byte coverage | HEAD-only binding misses
  pre-commit work

## Implementation record (2026-09-05, branch feat/task-0079-verification-state-binding)

- New: `src/core/verification/canonical.ts` (sole hashing module:
  SHA-256/UTF-8, stable key ordering, domain-separated payloads),
  `src/core/verification/binding.ts` (`computeStateBinding`,
  `compareStoredBinding`, `StateBindingError`; reuses
  `expandChangedFiles`, `criteriaFromTaskDoc`, `declaredScopeGlobs`,
  `normalizeIntent`, `normalizeRelativePath`/`isInsideRoot` — no duplicated
  containment logic; no new dependencies).
- Bundle → `ackit.verification-bundle.v2` (structured `binding` in JSON,
  digest display in Markdown; digest from canonical machine
  representation). Verdict: authoring shape unchanged (v1, binding-free);
  store persists `ackit.verdict.v2`; v1 files stay readable as legacy
  history, never silently fresh-bound.
- Registration: `verification record` recomputes CURRENT state and binds
  it; `--bundle` replay-checks the reviewed bundle
  (`VERDICT-BUNDLE-MISMATCH` on drift). Self-declared bindings refused
  (`VERDICT-INVALID` via strict input schema).
- Completion: PASS-family latest verdicts recompute CURRENT binding;
  stale → `VERDICT-STATE-STALE` (with changed classes); legacy v1 →
  `VERDICT-BINDING-MISSING`. Drift codes frozen (existence-based);
  freshness enforced at completion + shown via `verification show --json`.
- Codes (contract-tested): `VERDICT-BINDING-MISSING`,
  `VERDICT-BUNDLE-MISMATCH`, `VERDICT-STATE-STALE`,
  `VERIFICATION-BINDING-UNAVAILABLE`, `VERIFICATION-ARTIFACT-MISSING`.
- Schemas regenerated (`verdict.schema.json` → v2,
  `verification-bundle.schema.json` → v2 + binding); SDK gains only the
  four symbols the new registration contract requires
  (`computeStateBinding`, `compareStoredBinding`, `isBoundVerdict`,
  `StateBindingError`; allowlist updated); MCP tools unchanged (read-only).
- Docs: ADR-0030 + `docs/concepts/evidence-verification.md` +
  `docs/reference/cli.md` + `docs/reference/sdk.md` (behavior line).
- Full decision/rationale: ADR-0030.

## Completion notes

(placeholder)
