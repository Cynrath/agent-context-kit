---
id: "TASK-0071"
title: "post-0.3.0 follow-up: post-release docs cleanup deferred from release"
status: pending
schemaVersion: 2
dependencies:
  - "TASK-0066"
createdAt: "2026-09-02"
completedAt: null
---

## Purpose

Handle documentation cleanup intentionally deferred from the v0.3.0 release session so the release commit stayed focused on release metadata: versioning/README/docs polish items that were knowingly left for after publication (release-task §20 item 5). Sweep docs for stale references introduced by the 0.2.x → 0.3.0 transition and any remaining inaccuracies, then re-sync hosted docs.

## Current-state evidence

- v0.3.0 release (TASK-0066) updated: README badges/rows/versions, CHANGELOG 0.3.0, extension README/CHANGELOG, ci.yml extension contract, hosted docs (17 pages re-synced, commit `c43c514`).
- Deferred candidates recorded at release time: none blocking (release README/parity gates green), but a deliberate post-release pass was planned rather than mixing polish into the release commit.

## Scope

- Sweep first-party docs for: stale version mentions outside historical sections, "9 tools"-era MCP references in secondary pages, examples referencing old command outputs, and any "unreleased"/"experimental" phrasing that is now shipped.
- Verify every claim against the shipped 0.3.0 behavior (docs-first: change docs or file a product follow-up — never overstate).
- Re-run `node ./scripts/sync-ackit-docs.mjs --source <repo>` in `Cynrath.github.io` and publish the docs update.
- Record items found-and-fixed vs items-rejected-as-accurate (evidence for each).

## Out of scope

- Any product code change (file separate tasks instead); published v0.3.0 artifacts (immutable); new docs pages for unshipped features.

## Affected files

- `docs/**` (as found by the sweep), `README.md` (if needed), hosted docs repo pages via sync script, CHANGELOG (only if a factual error is found — corrections belong to the next release section, never rewriting 0.3.0 history).

## Acceptance criteria

- [ ] Sweep executed with an explicit checklist of areas (reference/, concepts/, guides/, examples/, README) and per-area verdicts recorded
- [ ] No stale-version or unshipped-claim text remains outside historical/CHANGELOG contexts (grep-verified)
- [ ] Hosted docs re-synced and live pages verified
- [ ] `pnpm test` (readme-parity) + `scan --ci` green after changes

## Test steps

1. Grep sweep for `0\.2\.[012]` outside historical contexts, `experimental`, `not yet`, `unreleased`, `9 (read-only )?tools`.
2. Fix confirmed-stale items; record accurate-as-is items with reason.
3. `pnpm test` parity + `scan --ci`; docs sync + live check.

## Risks

- Over-editing historical records — mitigation: only forward-looking pages are edited; CHANGELOG sections and v0.x historical docs stay untouched.

## Rollback plan

Focused commit revert; docs-only change surface.

## Completion notes

(proposed post-0.3.0 maintenance chain; planned 2026-09-02 during the v0.3.0 release session per release-task §20 — not executed in the release itself)
