---
id: "TASK-0087"
title: "v0.5.0 release: version finalization, merge, tag, publish, and post-publish bookkeeping"
status: blocked
schemaVersion: 2
dependencies:
  - "TASK-0078"
  - "TASK-0079"
  - "TASK-0080"
  - "TASK-0081"
  - "TASK-0082"
  - "TASK-0083"
  - "TASK-0084"
  - "TASK-0085"
  - "TASK-0086"
createdAt: "2026-09-05"
completedAt: null
---


## Purpose

Ship v0.5.0 to the public: finalize the version (`0.5.0-dev.0` →
`0.5.0`), prove the release candidate (tarball + VSIX + matrix),
squash-merge the single v0.5 lane PR (#20) into `master`, tag, publish
(npm + VS Code Marketplace + GitHub Release via the existing
tag-trigger workflow), update hosted docs through the protected flow,
flip the post-publish stable pointer, and simplify the old maintenance
branch — with evidence at every step. Authorized only because
TASK-0080..0086 are green (see goal execution record).

## Scope

- Pre-publish (same `release/v0.5.0` branch, same PR #20): version
  coupling (`package.json` + `extensions/vscode/package.json`
  `0.5.0-dev.0` → `0.5.0`), CHANGELOG `0.5.0` entry + release notes,
  real tarball + VSIX proof (versions, skills/package parity, schemas,
  no node_modules, size limits, no secrets, no Browser Companion),
  full RC matrix, PR READY only after final exact-head CI + verifier
  zero blockers. `release-state.json.publishedStable` stays `0.4.1`
  until public publication (ADR-0029: actual public truth).
- Merge: squash-merge `release/v0.5.0` → `master`; post-merge master CI
  + Dogfood green required before any tag.
- Publish: immutable annotated `v0.5.0` on the exact validated master
  commit; push tag; tag-trigger OIDC/provenance workflow; tag/package
  validation, full tests, package smoke, npm absence check, OIDC
  publish, SLSA provenance, registry shasum/latest, fresh consumer +
  npx smoke, GitHub Release last; `Cynrath.ackit-vscode 0.5.0`
  publish + Marketplace verification.
- Hosted docs (`O:\projeler\Cynrath.github.io`, protected flow only:
  sync from PUBLIC v0.5.0 → one site branch → docs-integrity → PR →
  merge → post-merge docs-integrity; theme hashes preserved).
- Post-publish stable pointer (`publishedStable` `0.4.1` → `0.5.0`;
  ONE minimal bookkeeping PR allowed only if protected-master mechanics
  require it; no feature fixes inside).
- Maintenance simplification: audit `maintenance/v0.4.1` for unique
  post-tag bookkeeping; preserve via non-release archival tag
  (`archive-v0.4.1-maintenance-head`, verified non-triggering) iff
  worth it, then delete the branch locally/remotely (else delete
  directly). Never move/delete `v0.4.1`.

## Out of scope

- Any feature/fix beyond the release mechanics above (lane is frozen).
- Browser Companion (`feat/browser-companion-v0.3` stays paused/untouched).
- Moving/deleting the immutable `v0.4.1` tag; force-push/history rewrite.
- Hosted-docs redesign; marketing beyond the TASK-0085 story.

## Affected files

- `package.json`, `extensions/vscode/package.json` (version coupling)
- `CHANGELOG.md` (+ release-notes source if convention requires)
- `release-state.json` (post-publish pointer only)
- `docs/v0.5.0-readiness.md` (release outcome appendix, if needed)
- Tag `v0.5.0`; PR #20 lifecycle (draft → ready → squash-merge)
- Remote branch deletions (`release/v0.5.0` post-merge,
  `maintenance/v0.4.1` post-decision)

## Required tests

- RC matrix: tarball version/CLI/VSIX/skills-parity/schemas/no
  node_modules/size/secrets/no-Companion + full gates on the final
  pre-publish head + exact-head PR CI + fresh verifier zero blockers.
- Post-merge: master CI + Dogfood green before tag.
- Post-publish: registry latest/shasum, fresh consumer + npx smoke,
  Marketplace listing, GitHub Release presence, hosted-docs integrity.

## Acceptance criteria

- [!] Source `0.5.0` + coupled VSIX version proven on the RC head; PR exact-head CI + verifier zero blockers before READY. (BLOCKED: met pre-merge; release gate failed post-tag — see Completion notes.)
- [!] PR #20 squash-merged; post-merge master CI + Dogfood green before tag. (BLOCKED: merged and tagged, but tag-trigger release workflow failed — see Completion notes.)
- [!] Immutable annotated `v0.5.0` on the validated master commit; OIDC publish + provenance; npm `latest` → `0.5.0`; npx + fresh-consumer smoke green; GitHub Release `v0.5.0` last. (BLOCKED: never published — release workflow 34036439113 failed at `pnpm test` before npm/GitHub publication.)
- [!] Marketplace `Cynrath.ackit-vscode 0.5.0` published + verified. (BLOCKED: never attempted — gated behind the failed release workflow.)
- [!] Hosted docs updated via the protected flow with integrity green. (BLOCKED: never attempted for v0.5.0.)
- [!] Post-publish pointer flipped (`0.5.0`) only after public verification; branches cleaned (`master` + Companion only); final public truth matches the goal record. (BLOCKED: `publishedStable` correctly remains `0.4.1`; superseded by TASK-0088 v0.5.1 recovery.)

## Test steps

1. Pre-publish gates on `release/v0.5.0` (install/lint/format/typecheck/build/test/gen:schemas idempotent/smokes/version-parity/offline/hygiene/config/doctor/task-doctor/skills/scan/diff-check).
2. RC package + VSIX proof with recorded versions/hashes/sizes.
3. PR READY → merge → post-merge CI/Dogfood evidence.
4. Tag → workflow → registry/Marketplace/Release verification outputs.
5. Hosted-docs PR + integrity evidence; pointer PR if required.
6. Branch topology + final truth table in completion notes.

## Risks

- Partial publication (npm done, Marketplace failed) → ordered checklist
  with per-surface verification; no pointer flip until ALL surfaces verify.
- Tag-trigger workflow drift → read release.yml before tagging; dry-run
  what is dry-runnable; npm absence check first.
- Protected-master mechanics forcing extra PRs → at most ONE minimal
  pointer PR; everything else rides PR #20 pre-merge.

## Rollback plan

- Pre-merge: focused revert on `release/v0.5.0`; PR stays draft.
- Post-merge pre-tag: forward fix on master via PR (no history rewrite).
- Post-publish: no rollback of immutable artifacts; forward
  patch release if a defect escapes (none known).

## Completion notes

BLOCKED / SUPERSEDED — v0.5.0 failed its release gate before any public
publication; preserved as historical failed-release attempt. NOT completed.

- Pre-merge lane completed: PR #20 squash-merged to `master` as
  `aee1ddc8229b6878b281d8b60a49b2112bd5eee7`; post-merge master CI +
  Dogfood green; immutable annotated `v0.5.0` created on that commit
  (tag object `361a92e`, commit `aee1ddc`; never moved/deleted).
- Tag-trigger release workflow `34036439113` (tag `v0.5.0`) FAILED at
  `pnpm test`: `tests/e2e/chain-composition.test.ts:311` —
  `AssertionError: expected 'v0.5.0' to be ''`. Root cause: the test
  asserted `git tag --list v0.5*` is empty, which cannot hold on the
  exact tagged checkout the release workflow validates. No npm publish,
  no GitHub Release, no Marketplace publish occurred for v0.5.0
  (verified: npm `0.5.0` 404, `latest` = `0.4.1`; `gh release view
  v0.5.0` = not found; `release-state.json.publishedStable` = `0.4.1`).
- Immutable `v0.5.0` tag left untouched per recovery rule (failed-release
  marker, not a public release).
- Superseded by TASK-0088 (v0.5.1 recovery: release-context test
  correction + `0.5.0` → `0.5.1` bump + publication). This task is never
  to be marked completed.
