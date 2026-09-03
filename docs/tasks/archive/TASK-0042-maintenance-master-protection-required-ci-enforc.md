---
id: "TASK-0042"
title: "maintenance: master protection / required CI enforcement"
status: completed
schemaVersion: 2
dependencies: ["TASK-0041"]
createdAt: "2026-08-28"
completedAt: "2026-08-28"
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

- [x] Exact present protection/ruleset state documented before change
- [x] No contradictory duplicate rules (single coherent source)
- [x] `master` targeted, enforcement ACTIVE, force-push BLOCKED, deletion BLOCKED
- [x] Required status checks present with exact check names from green SHA (no impossible/missing contexts)
- [x] `Require branches to be up-to-date` enabled if workflow-compatible, otherwise documented
- [x] PR-before-merge policy decided and documented; bypass policy safe (maintainer not locked out)
- [x] `Require signed commits` NOT enabled
- [x] Read-back verification after mutation confirms effective state

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

2026-08-28 — Preflight: `GET /branches/master/protection` 404, `GET /rulesets` single ACTIVE `protect-master` id 17913688 targeting `~DEFAULT_BRANCH` with rules `deletion` + `non_fast_forward` + `required_linear_history`, no status checks, `bypass_actors:[]`, `enforcement:active`, `can_bypass:never`. Lint-cleanup SHA `6b146b4aab9a97d490164c473495cbe174f08b0f` pushed; waited for CI green; collected exact check names from that SHA via `gh api .../commits/6b146b4.../check-runs` (12): `verify ubuntu-latest / node-22`, `verify ubuntu-latest / node-24`, `verify windows-latest / node-22`, `verify windows-latest / node-24`, `verify macos-latest / node-22`, `verify macos-latest / node-24`, `self-scan (dogfood)`, `package-smoke ubuntu-latest`, `package-smoke windows-latest`, `package-smoke macos-latest`, `extension / node-22 (vsce + Electron)`, `action smoke (uses ./)` — all also emitted on PR (both workflows trigger on push+PR to master, so no deadlock). Updated existing ruleset 17913688 via `PUT` with payload adding `required_status_checks` (12 contexts, `strict_required_status_checks_policy:true`, `do_not_enforce_on_create:false`) while preserving `deletion`, `non_fast_forward`, `required_linear_history` — single coherent source, no duplicate. Read-back confirms: `enforcement:active`, `target:branch`, `conditions:{ref_name:{include:["~DEFAULT_BRANCH"]}}`, `rules:[deletion, non_fast_forward, required_linear_history, required_status_checks{12 contexts, strict:true}]`, `bypass_actors:[]`, `id:17913688`, `node_id:RRS_lACqUmVwb3NpdG9yec5K8Tf7zgERV1g`, `updated_at:2026-08-28T11:21:45Z`. Force-push BLOCKED (non_fast_forward), deletion BLOCKED (deletion), required checks present with exact names, strict up-to-date YES, PR requirement NOT added — deliberate to preserve historic direct maintainer fast-forward pushes; documented: direct pushes remain allowed but must be linear (required_linear_history) and fast-forward (non_fast_forward) and will still be subject to status checks on PR path; adding `pull_request` rule would require bypass actor for owner — evaluated but deferred as it would complicate maintainer workflow without clear benefit; prioritized required checks + force/deletion as per spec. `Require signed commits` NOT enabled (commits unsigned). Verification: CI run 33154861210 SUCCESS, Dogfood 33154861134 SUCCESS, all 12 checks SUCCESS on final SHA, so required checks satisfied. No workflow/config file change, so already-green SHA remains acceptable.
