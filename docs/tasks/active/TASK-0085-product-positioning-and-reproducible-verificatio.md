---
id: "TASK-0085"
title: "Product positioning and reproducible verification-handoff demo"
status: active
schemaVersion: 2
dependencies:
  - "TASK-0081"
  - "TASK-0082"
createdAt: "2026-09-04"
completedAt: null
---

## Purpose

Retell ACKit's public story around its differentiated core — provider-independent repository contract, evidence-backed completion, independent verification, deterministic drift, resumable cross-agent handoff, offline/no API key — instead of merely AGENTS.md management, context packing, and scan. Ship a reproducible public demo proving the trust flow with exact deterministic fixtures and measured output: agent/task claims done → completion blocked because proof/verdict is missing/stale → proof/verifier registered → completion succeeds → checkpoint/handoff resumes in another process/provider-neutral flow. No unverified competitor marketing claims.

## Consensus basis

Strong multi-auditor consensus: positioning agreement plus a docs/positioning task with a reproducible verification-handoff demo in the v0.5 chain.

## Scope

- Positioning pass over current-facing docs (README story, guides entry points): lead with contract/evidence/verification/drift/handoff/offline; keep scan/pack content accurate but secondary. No unverified competitor claims; every comparative sentence must cite a primary source or be cut.
- Reproducible demo: deterministic fixtures + scripted command sequence + recorded exact outputs demonstrating the five-stage flow (claim → blocked → proof registered → completion → cross-process/provider-neutral resume). The demo must run green from a clean checkout (documented prerequisites only).
- Demo asserts the TASK-0079/0080/0081/0082 behaviors it exercises (stale-block code, digest match, handoff resume equivalence) rather than narrating them.
- Tests: demo-as-test (the scripted flow runs in CI or as a checked script with pinned outputs); link/content checks for touched docs.
- Unless the workflow skill cannot remain coherent after progressive disclosure, no new evidence-authoring skill (explicitly deferred otherwise).

## Out of scope

- Competitor feature/marketing claims without primary sources.
- New builtin-skill catalog or new evidence-authoring skill (deferred; needs the coherence proof first).
- Hosted demo infrastructure, videos, or website redesign.
- Browser Companion, SaaS, cloud anything.

## Dependencies

- TASK-0081 (status/next-action semantics the demo narrates).
- TASK-0082 (handoff resume the demo performs cross-process).

## Affected files / expected areas

- `README.md`, `docs/guides/**` (positioning pass; release-truth lines stay under TASK-0078's model)
- Demo fixtures + script (new, deterministic; location per repo conventions)
- `tests/` demo-as-test wiring
- `templates/skills/ackit-workflow/**` (only if the demo exposes a coherence gap; otherwise untouched)

## Acceptance criteria

- [x] Current-facing story leads with the six differentiated claims; zero unverified competitor claims (review-proven).
- [x] Demo runs green from a clean checkout with exact recorded outputs; all five stages observed.
- [x] Demo asserts (not narrates) the underlying contracts: stale-block code, digest match, resume equivalence.
- [x] Touched docs pass link/content checks; TASK-0078 release-truth model not violated.
- [x] Full gates green with counts; offline/scan/hygiene hold; real-gate completion with evidence.

## Test steps

1. `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm build`.
2. Demo script from clean fixture (record wall output + exit codes per stage).
3. `pnpm test` incl. demo-as-test (record counts).
4. `doctor`, `task doctor`, `scan --ci`, `git diff --check`.

## Security considerations

- Demo fixtures synthetic only; outputs scrubbed of absolute local paths before being recorded.
- No network calls in the demo path (offline claim must hold while demonstrating).

## Risks

- Demo bit-rot as contracts evolve → demo-as-test pins it; any contract change must update the demo in the same commit.
- Positioning overreach → every claim traces to shipped behavior + evidence.

## Rollback plan

- Focused revert on the task branch before merge; after merge, forward fix.

## Completion notes

Implemented 2026-09-05 on `release/v0.5.0` (single-lane, sixth chain on
the same branch/PR #20).

Positioning: README story now leads with the six differentiated claims
(evidence-backed completion, independent verification, cross-agent
handoff, deterministic drift, provider-independent contract,
offline-first) with scan/pack content intact but secondary; new
60-second trust-flow block (commands + exact codes, truncated digest
marked as such); MCP row corrected 15 → 16 tools (0083 truth). No
redesign, no hosted anything, no Browser Companion. Competitor-claim
review: grep over touched surfaces finds zero comparative/superiority
claims (sole hit is the pre-existing phrase "read-only tools");
provider names appear only as execution owners / supported surfaces
(factual, sourced in 0083). Release-truth lines untouched (0078 model:
dev 0.5.0-dev.0, stable 0.4.1).

Demo-as-test (`tests/e2e/trust-flow-demo.test.ts`, green in CI):
11 asserted stages — claim → MISSING_REQUIRED_ARTIFACT +
MISSING_VERIFIER_VERDICT block → evidence (verdict blocker stands
alone) → bundle + status-narrated next action → fresh verdict
registered with record.bundleDigest == reviewed bundle digest
(independent) → status blockers [] + complete-command → second pass
moves state → VERDICT-STATE-STALE (sourceState) blocks → fresh bundle
(digest DIFFERS, state-sensitive) + fresh verdict (replay would refuse
the old file) restores → completed → checkpoint + `ackit.handoff.v2`
exported → SECOND OS process imports (fresh + resume), `task resume`
agrees, remote status confirms completed. Companion guide
`docs/guides/demo-trust-flow.md` carries the same command sequence,
per-stage proofs, prerequisites, and the contracts asserted (digests
labeled per-run values; codes/relations pinned). Link check: the one
new link resolves; 10 broken README links verified pre-existing on
master (unchanged count, out of scope). No new skill (no coherence gap
exposed). No skill/catalog/hosted changes.

Evidence: demo test green (11 stages, ~12s) + full `pnpm test` counts +
all gates recorded at completion-gate time. Fixtures synthetic,
offline, scrubbed (review artifacts under `.ackit/`). No quality gates
weakened. No publish/tag/release. TASK-0086 not started.
