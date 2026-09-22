---
id: "TASK-0093"
title: "VSCE OIDC follow-up: ADR-0033 premise re-verification and release automation correction"
status: blocked
schemaVersion: 2
dependencies:
  - "TASK-0092"
createdAt: "2026-09-22"
completedAt: null
---

## Purpose

Resolve the unfinished v0.5.3 Marketplace leg: the tag-trigger release
run `35727290676` failed closed at `Publish to VS Code Marketplace via
OIDC` and no automated retry can complete it (tag-immutable workflow
file). Decide, with maintainer authorization, between (a) manual
Marketplace publish of the audited rebuilt VSIX (staged,
SHA-bound) as done for 0.5.1/0.5.2, or (b) a redesigned automation
once upstream ships what ADR-0033 assumed. Unblock the held
pointer-flip (`publishedStable` 0.5.2 -> 0.5.3) and the 0.5.3 site sync.

## Scope

- Re-verify ADR-0033's premise against published `@vscode/vscode`
  releases: as of 2026-09-22, `src/oidc.ts` (`--oidc`, OIDC audience
  `marketplace.visualstudio.com`) exists ONLY on upstream `main`
  (unreleased); `latest` 4.0.0 and `next` 4.0.1-0 have neither `--oidc`
  nor camelCase `--skipDuplicate` (real flag: `--skip-duplicate`,
  proven via `vsce publish --help`; already fixed in PR #29).
- If upstream publishes OIDC support: pin that exact vsce version in
  `release.yml` (no floating `npx --yes` for the publish step),
  extend `ci-pinning` contract (assert `--oidc` + `--skip-duplicate`
  present, `--skipDuplicate` absent), full gates + PR + a NEW patch
  release to exercise it (never move `v0.5.3`).
- If upstream has not published: amend ADR-0033 (supersede note, keep
  history verbatim) to restore manual Marketplace publish as the
  normal path with byte-parity proof (VSIX SHA recorded, Release asset
  identical), exactly as executed for v0.5.3 recovery.
- Manual path (either way, user-performed, never agent-performed):
  `vsce publish --packagePath O:/projeler/ackit-release-0.5.3/ackit-vscode-0.5.3.vsix`
  (SHA-256 `C55D0E18D9C7729F881D5E5BAA9F44DDEFDA2D806B82F56C3EAFEFC82479A575`;
  audited: manifest 0.5.3, publisher Cynrath, README Version 0.5.3,
  CHANGELOG latest 0.5.3, no node_modules, no secrets, 830350 bytes);
  then `vsce show Cynrath.ackit-vscode --json` must report 0.5.3.
- After Marketplace verifies 0.5.3: pointer-flip PR
  (`release-state.json` + stable pins -> 0.5.3) then site-sync PR
  (generator regen + root UI 0.5.3 + verify-site green).

## Out of scope

- Moving/deleting `v0.5.3` or any immutable tag; force-push/rebase/history rewrite.
- Republishing npm `0.5.3` (published, `latest` = 0.5.3; absence gate guards reruns).
- Recreating the Marketplace listing; changing the Action name; telemetry/tracking.
- Redesigning npm provenance or the VSIX preflight (proven working in run 35727290676).

## Affected files

- `.github/workflows/release.yml` (only if pinning/redesign is chosen)
- `tests/contract/ci-pinning.test.ts` (contract for the chosen mechanism)
- `docs/decisions/ADR-0033-*.md` (amendment note only if premise changes the decision; history verbatim)
- `release-state.json` (flip only after Marketplace verifies — separate flip PR, not this task's first commit)
- `docs/tasks/active/TASK-0093-*.md` (this task)

## Required tests

- `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm build`
- Focused contract tests for the touched mechanism; `git diff --check`
- Live proof: `vsce show` 0.5.3 (manual path) or a green tag-trigger run on a NEW version (automation path)
- `node dist/cli/index.js task doctor`, `doctor`, `scan --ci`

## Acceptance criteria

- [ ] AC-001 ADR-0033 premise verdict recorded with primary evidence (published vsce help/readme or upstream release notes).
- [ ] AC-002 Marketplace `Cynrath.ackit-vscode` live at 0.5.3 proven via `vsce show --json` (manual or automated).
- [ ] AC-003 Release automation either pinned to a published OIDC-capable vsce with contract tests, or ADR-amended back to manual with parity proof. No speculative automation.
- [ ] AC-004 Pointer-flip + site-sync PRs merged after AC-002 (owned by TASK-0092 phase 2; this task unblocks them).
- [ ] AC-005 No prohibited action (tag move, npm republish, force-push, PAT in repo, telemetry).

## Test steps

1. `npm view @vscode/vsce versions --json` + `vsce publish --help` on the candidate version (record outputs).
2. Implement the chosen path on a feature branch; focused contract tests green.
3. Full gates per Required tests; PR with exact-head CI green; squash-merge.
4. Manual path: user runs the staged `vsce publish`; agent verifies with read-only `vsce show`.
5. Flip + site PRs per TASK-0092 phase 2.

## Risks

- Upstream never ships OIDC -> manual path stays; automation stays fail-closed (acceptable, proven safe).
- Floating `npx --yes @vscode/vsce` drifts again -> pin exact version for publish step.
- Partial-state confusion (npm 0.5.3 live, Marketplace pending) -> this task's notes are the single recovery record until flip.

## Rollback plan

- Pre-merge: focused revert on the feature branch.
- Post-merge: forward fix via PR (no history rewrite).
- No rollback of immutable artifacts (npm 0.5.3, tag v0.5.3, Release v0.5.3).

## Completion notes

BLOCKED — created 2026-09-22 from the v0.5.3 partial-release findings
(run 35727290676). Waits on: (1) user manual Marketplace publish of
the staged audited VSIX, and/or (2) upstream vsce OIDC release +
maintainer decision on automation redesign. Neither is agent-completable
in this round.

### Closure 2026-09-22 (via TASK-0094 — 0.5.3 leg intentionally superseded)

- AC-001 PASS: premise verdict re-verified twice (vsce 4.0.0/4.0.1-0
  have no `--oidc`) and recorded in ADR-0033 amendment + TASK-0094.
- Decision taken (option b): manual Marketplace path restored as normal
  with a fail-closed pre-npm gate in `release.yml` + contract tests;
  ADR-0023 path restored. Upstream OIDC stays a future NEW-task topic.
- AC-002 (marketplace **0.5.3**) will NEVER pass literally — and must
  not: per goal-authorized recovery, Marketplace went 0.5.2 → **0.5.4**
  in one user-performed manual publish (verified `vsce show` 0.5.4),
  and the 0.5.4 chain (tag/npm/Release/flips/site/Pages) is fully
  green. The 0.5.3 gap remains recorded history, not rewritten.
- AC-003 PASS (manual-gate automation + parity proof: staged VSIX SHA
  `07D50EEA…`, in-run VSIX SHA `56481D54…` == Release asset).
  AC-004 PASS (flip PR #31 + site PR #13 merged post-verification).
  AC-005 PASS (no tag move, no npm republish, no force-push, no PAT).
- This task stays `blocked` (not completed) as the honest record: its
  literal 0.5.3-marketplace item was superseded, not performed. No
  further action; TASK-0094 owns the completed release.
