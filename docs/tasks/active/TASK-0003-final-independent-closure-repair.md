---
id: "TASK-0003"
title: "final independent closure repair"
status: active
schemaVersion: 2
dependencies:
  []
createdAt: "2026-08-25"
completedAt: null
---

## Purpose

Repair the three concrete defects found by an independent audit of the post-TASK-0002 closure state at `b35ca59c94e78213f31a31e7920fe2f7c42af649` (CI run 32787110952, 10/10 green): (1) REQ-GOV-007 silent error swallowing in the context pack file read and context policy summary; (2) a false-positive MCP mid-flight cancellation test that never used its large fixture and could pass without testing cancellation; (3) installed-tarball E2E completing a task with `--force` instead of proving the normal completion path. Also correct stale evidence in TASK-0002/TASK-0291 and re-run the MUST requirements audit.

## Scope

- `src/core/context/pack.ts`: replace silent read-failure swallow with an explicit manifest exclusion record carrying stable diagnostic semantics (`pack-read-failed` + errno category, repo-relative path only).
- `src/core/context/orchestrate.ts`: policy-summary resolution failure must surface an explicit safe section state plus stable advisory code (`context-policy-summary-failed`) instead of a bare silent catch.
- Adjacent sweep of product-code silent catches (`src/core/context`, `src/core/scanner`, `src/core/policy`, `src/core/filesystem`, `src/core/tasks`, `src/core/skills`, `src/mcp`, `src/cli`) with per-site classification.
- `tests/integration/mcp/cancellation.test.ts`: helper takes explicit root; large-fixture test uses it; mid-flight cancellation assertion becomes unconditional and deterministic; post-cancel server health asserted.
- `scripts/package-smoke.mjs`: after proving the completion gate blocks an incomplete task, repair the generated task document so normal `task complete` (no `--force`) succeeds, then archive.
- Evidence truthfulness: chronological correction in TASK-0002 (5bca529/32786781801 vs b35ca59/32787110952), historical/latest evidence split in TASK-0291.
- MUST requirements audit re-run with behavioral/static evidence classification.

## Out of scope

- master push, merge to master, force-push, history rewrite, tags, releases, npm publish, workflow dispatch, deployment.
- Rewriting known-good CLI split, pack parity orchestration, policy/cache implementations absent regressions.
- Blanket global test-timeout increases.
- New product features beyond the diagnostics/cancellation/test-contract repairs above.

## Affected files

- src/core/context/pack.ts
- src/core/context/orchestrate.ts
- tests/integration/mcp/cancellation.test.ts
- tests/integration/context/*.test.ts (new read-failure + policy-summary observability tests)
- scripts/package-smoke.mjs
- docs/tasks/active/TASK-0002-final-closure-complete-mandatory-work-from-inval.md (chronology correction)
- docs/tasks/TASK-0291-post-goal-2-independent-contract-audit-and-hardening.md (historical vs latest evidence)
- docs/rebuild/VNEXT_TRACEABILITY.md / MUST audit evidence (as needed)

## Requirement IDs

REQ-GOV-007, REQ-MCP-004, REQ-PKG-001, REQ-TASKS-001, REQ-TASKS-004, REQ-FIN-001, REQ-FIN-002, REQ-FIN-003, REQ-GOV-004, REQ-GOV-005

## Acceptance criteria

- [ ] Context-pack candidate read failure produces an explicit manifest exclusion record with stable reason code `pack-read-failed`, repo-relative path only; no absolute paths or raw machine-specific messages leak; pack output stays deterministic.
- [ ] Context policy-summary failure yields explicit safe summary state plus stable advisory diagnostic code `context-policy-summary-failed`; no silent catch remains in orchestrate.ts.
- [ ] Adjacent silent-catch sweep completed over listed core/MCP/CLI directories with each site classified (VALID EXPLICIT FALLBACK / DIAGNOSTIC REQUIRED / BUG / TEST-ONLY INTENTIONAL); all REQ-GOV-007 product-code violations fixed.
- [ ] MCP cancellation test connects with the explicit fixture root under test (large fixture actually scanned); no conditional branch allows pass without a real mid-flight cancellation; cancellation proven before normal completion; post-cancel requests succeed.
- [ ] Installed-tarball package smoke proves: initial completion gate failure, genuine fixture repair, normal completion WITHOUT `--force`, archive success, full MCP battery still green on 3 OS in CI.
- [ ] TASK-0002 CI claim corrected chronologically (5bca529/run 32786781801 then b35ca59/run 32787110952); TASK-0291 old verification marked historical with new final block appended after this repair.
- [ ] MUST audit re-run: VERIFIED count backed by behavioral/static evidence; PARTIAL=0, MISSING=0, STALE-CONTRACT=0 recorded truthfully.
- [ ] Full local gate green: lint/format:check/typecheck/gen:schemas/build; vitest suite green 3 consecutive runs; smoke:cli + smoke:package green; task doctor green; git diff --check clean.
- [ ] Final GitHub CI run green on exact final documentation-inclusive HEAD (head_sha match).

## Test steps

1. New integration tests: pack read-failure exclusion record (stable code, no absolute-path leak, deterministic rerun, pack continues), policy-summary advisory state.
2. Rewritten MCP cancellation test via InMemoryTransport with explicit root argument.
3. Local `pnpm smoke:package` observing gate-block → repair → complete-without-force → archive sequence.
4. Focused suites: context security, pack parity, policy, cache, MCP cancellation/conformance, tasks lifecycle, CLI contract/architecture.
5. Full gate: install/lint/format/typecheck/gen:schemas/build/test ×3/smoke ×2/task doctor/scan --ci/git diff --check.

## Security impact

Positive: fewer silent failures; stable codes without leaking absolute paths, secret values, or raw internal errors. No new network, write, or execution surface. Pack safety gates unchanged.

## Risks

- Manifest format change could break consumers expecting exact entry set — mitigated: only ADDITIVE exclusion records on read failure; existing actions/reasons unchanged.
- Deterministic cancellation test could become slow/flaky if sized poorly — mitigated: deterministic workload sizing measured once, unconditional assertion, generous but focused timeout.
- package-smoke mutation of generated task doc is script-only logic — kept inside isolated temp fixture; no user files touched.

## Rollback plan

Focused commit revert per area (context diagnostics; cancellation test; package smoke; docs/evidence). No destructive git operations.

## Evidence

(filled during execution)

## Completion notes

(placeholder)
