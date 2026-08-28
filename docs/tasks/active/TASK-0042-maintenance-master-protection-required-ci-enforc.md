---
id: "TASK-0042"
title: "maintenance: master protection / required CI enforcement"
status: pending
schemaVersion: 2
dependencies: ["TASK-0041"]
createdAt: "2026-08-28"
completedAt: null
---

## Purpose

Configure `master` so accidental unsafe changes cannot bypass quality gates: enforced required checks, no force-push, no deletion, with maintainer usability preserved.

## Scope

- Read current GitHub branch protection + repository rulesets (currently: legacy protection 404, ruleset `protect-master` 17913688 ACTIVE with only `deletion` + `non_fast_forward` + `required_linear_history`, no status checks)
- Design one coherent enforcement source (prefer improving existing ruleset 17913688 over duplicate)
- Collect exact check names from the green lint-cleanup SHA (verify matrix 6, extension, self-scan, 3× package-smoke, ACKit Action Dogfood)
- Update ruleset to require those deterministic gates, block force pushes, block deletion, require up-to-date branch where compatible
- Evaluate PR requirement: if direct maintainer pushes historically used, configure bypass for owner or document deliberate direct-push allowance; do not lock maintainer out; do not enable signed-commits/linear-history > current unless justified
- No new release/tag involvement

## Out of scope

- create v0.2.3 / move tag / publish
- enable `Require signed commits` (commits currently unsigned)
- enable unrelated policies (required review count, code scanning, deployments) without analysis
- broad ignores or CI weakening

## Current evidence

- 2026-08-28: `GET /repos/.../branches/master/protection` → 404 (no legacy protection)
- `GET /rulesets` → one ACTIVE `protect-master` (id 17913688) targeting `~DEFAULT_BRANCH`, rules: `deletion`, `non_fast_forward`, `required_linear_history` — missing required status checks entirely
- Latest green SHA `35755a7` check-runs: 12 checks (6 verify + 3 package-smoke + self-scan + extension + action smoke)
- Workflows: `CI` (verify/self-scan/package-smoke/extension), `ACKit Action Dogfood` (action smoke) — all must be required if stable

## Acceptance criteria

- [ ] Exact present protection/ruleset state documented before change
- [ ] No contradictory duplicate rules (single coherent source)
- [ ] `master` targeted, enforcement ACTIVE, force-push BLOCKED, deletion BLOCKED
- [ ] Required status checks present with exact check names from green SHA (no impossible/missing contexts)
- [ ] `Require branches to be up-to-date` enabled if workflow-compatible, otherwise documented
- [ ] PR-before-merge policy decided and documented; bypass policy safe (maintainer not locked out)
- [ ] `Require signed commits` NOT enabled
- [ ] Read-back verification after mutation confirms effective state

## Test steps

1. `gh api repos/.../branches/master/protection` + `gh api repos/.../rulesets` + `gh api repos/.../rulesets/<id>`
2. `gh api repos/.../commits/<green-SHA>/check-runs` to collect exact names
3. Apply ruleset update via `gh api --method PUT` or `gh api repos/.../rulesets/<id>`
4. Read back `gh api repos/.../rulesets/<id>`
5. Verify CI green on final master SHA still satisfies required checks

## Risks

- Requiring a check that doesn't emit on PR path could deadlock merges → only require checks emitted on both push/PR or fix workflow triggers first
- PR-only restriction without bypass could block maintainer direct pushes → mitigate with bypass actors or deliberate allowance documented

## Rollback plan

Restore ruleset via `gh api` to prior state (rules: deletion, non_fast_forward, required_linear_history) or delete added status-check rules; branch protection remains via ruleset, no history rewrite.

## Completion notes

(pending)
