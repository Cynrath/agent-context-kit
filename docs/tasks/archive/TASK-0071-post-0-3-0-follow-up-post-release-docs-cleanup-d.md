---
id: "TASK-0071"
title: "post-0.3.0 follow-up: post-release docs cleanup deferred from release"
status: completed
schemaVersion: 2
dependencies:
  - "TASK-0066"
intentRef: "INTENT-0003"
planRef: "docs/plans/post-v030-hardening-TASK-0071.md"
createdAt: "2026-09-02"
completedAt: 2026-09-03
---

## Purpose

Handle documentation cleanup intentionally deferred from the v0.3.0 release session so the release commit stayed focused on release metadata: versioning/README/docs polish items that were knowingly left for after publication (release-task §20 item 5). Sweep docs for stale references introduced by the 0.2.x → 0.3.0 transition and any remaining inaccuracies, then re-sync hosted docs.

## Current-state evidence

- v0.3.0 release (TASK-0066) updated: README badges/rows/versions, CHANGELOG 0.3.0, extension README/CHANGELOG, ci.yml extension contract, hosted docs (17 pages re-synced, commit `c43c514`).
- Deferred candidates recorded at release time: none blocking (release README/parity gates green), but a deliberate post-release pass was planned rather than mixing polish into the release commit.

## Scope

- Sweep first-party docs for: stale version mentions outside historical sections, "9 tools"-era MCP references in secondary pages, examples referencing old command outputs, and any "unreleased"/"experimental" phrasing that is now shipped.
- Verify every claim against the shipped 0.3.0 behavior PLUS the post-0.3.0 master additions (docs-first: change docs or file a product follow-up — never overstate).
- `ackit sync` release wording (post-v0.3.0 hardening session §8): `ackit sync` exists on master (TASK-0072, merged after tag v0.3.0) but is NOT in published npm `@cynrath/agent-context-kit@0.3.0`. Every first-party mention must use current-master/next-release wording until the next release; never imply the published 0.3.0 contains it.
- PR Markdown control-character investigation (session §8): determine whether repository-owned code/scripts can emit control characters into PR bodies (e.g. `ackit` strings in PR #10); if yes, fix narrowly with sanitization tests; if external shell quoting only, document and invent no product code.
- Windows/node-24 load-sensitive timeout investigation (session §8): determine only whether repository-side test design is responsible; if reproducible in scope, apply narrow fixes (remove redundant packaging, split expensive assertions, evidence-based timeout for the specific slow test — never global inflation); else record a separate future task.
- Audit README, CLI reference, config/workflow/checkpoint/MCP docs, managed-asset/`ackit sync` docs, getting-started/agent-integration, and current-vs-public-release wording.
- Re-run `node ./scripts/sync-ackit-docs.mjs --source <repo>` in `Cynrath.github.io` and publish the docs update — DEFERRED: hosted-docs publish requires user-authorized network/publish action outside this session's single-PR scope; record as residual limitation (docs source updated here, sync to be run at release).
- Record items found-and-fixed vs items-rejected-as-accurate (evidence for each).

## Out of scope

- Any product code change except a narrow control-character sanitization fix IF repository-owned code is proven to emit such characters (file separate tasks for anything else); published v0.3.0 artifacts (immutable); new docs pages for unshipped features; hosted-docs publish itself (deferred, see Scope).

## Affected files

- `docs/**` (as found by the sweep), `README.md` (if needed), hosted docs repo pages via sync script, CHANGELOG (only if a factual error is found — corrections belong to the next release section, never rewriting 0.3.0 history).

## Acceptance criteria

- [x] Sweep executed with an explicit checklist of areas (reference/, concepts/, guides/, examples/, README) and per-area verdicts recorded
- [x] No stale-version or unshipped-claim text remains outside historical/CHANGELOG contexts (grep-verified)
- [x] `ackit sync` mentions use current-master/next-release wording (never implying published 0.3.0 contains it)
- [x] Control-character investigation recorded (repo-owned emitter or external-only verdict with evidence)
- [x] Windows/node-24 timeout investigation recorded (narrow fix or separate future task)
- [x] Hosted docs re-synced and live pages verified, OR deferred-with-rationale recorded (publish action out of session scope)
- [x] `pnpm test` (readme-parity) + `scan --ci` green after changes

## Test steps

1. Grep sweep for `0\.2\.[012]` outside historical contexts, `experimental`, `not yet`, `unreleased`, `9 (read-only )?tools`.
2. Fix confirmed-stale items; record accurate-as-is items with reason.
3. `pnpm test` parity + `scan --ci`; docs sync + live check.

## Risks

- Over-editing historical records — mitigation: only forward-looking pages are edited; CHANGELOG sections and v0.x historical docs stay untouched.

## Rollback plan

Focused commit revert; docs-only change surface.

## Completion notes

Executed 2026-09-03 on `feat/post-v030-hardening` (standard profile; intent
INTENT-0003; plan `docs/plans/post-v030-hardening-TASK-0071.md`).

### Sweep verdicts per area (AC-001/002)

- `docs/reference/`: FIXED — `config.md` workflow row (effective semantics,
  TASK-0067); `cli.md` sync availability + `workflow set` optional profile;
  `mcp.md` drift parity + effective requirements. No `9 tools`/stale refs.
- `docs/concepts/workflows.md`: FIXED — profile tuning pointer; intent-gate
  "accepted" → "existing" factual correction.
- `docs/guides/`: FIXED — `getting-started.md` pins `0.2.0` → `0.3.0` + sync
  next-release note; `agent-integration.md` sync availability note.
- `docs/examples/` (`examples/`): ACCURATE-AS-IS — `v0.2.1` pins reference
  immutable still-functional releases; re-pinning is release-task scope.
- `README.md`: ACCURATE-AS-IS — no experimental/unreleased/stale-version
  claims outside the intentional historical `docs/v0.2.0/` link.
- Historical (`docs/tasks/`, `decisions/`, `v0.2.0/`, `rebuild/`,
  `CHANGELOG.md` history): UNTOUCHED by policy (over-editing guard);
  `9 tools` mentions there are accurate-at-write-time records.

### Sync wording (AC-003)

Every forward-looking `ackit sync` mention now carries
current-master/next-release wording; none implies published npm `0.3.0`
contains it. Grep-verified (`ackit sync` × CLI ref, both guides).

### Control characters (AC-004)

External-only verdict: no repository-owned code path generates PR bodies
(`scripts/*.mjs` grep: no PR/body path); all terminal output passes
`sanitizeTerminalText` (C0/ANSI strip, REQ-SEC-003, unit-tested in
`tests/unit/diagnostics.test.ts`). PR #10 rendering is attributed to shell
quoting of backtick Markdown through the invoking shell. No product code
invented — documented here.

### Timeout (AC-005)

Repo-side design is evidence-based, not inflated: global per-test 60s
(documents why vitest 5s default fails under parallel load), explicit
per-suite budgets (checkpoint/drift 60s, tarball 300s). Full suite measured
98 files / 554 tests PASS in ~122s with the e2e tarball smoke consuming
~119s (real `pnpm pack` + isolated install — release-critical, not
redundant). No reproducible assertion-level timeout; no change made. If CI
names a specific slow test, file a focused follow-up.

### Hosted docs (AC-006)

DEFERRED with rationale: publishing hosted docs requires network/publish
actions outside this session's single-PR scope (no release/tag/publish).
Docs sources are updated here; `sync-ackit-docs.mjs` runs in the v0.4.0
release session.

### Gates (AC-007)

`pnpm test` readme-parity + docs-gate green (8 tests); full 98/554 PASS;
`scan --ci` exit 0; `task doctor` OK.
