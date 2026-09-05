---
id: "TASK-0087"
title: "v0.5.0 release: version finalization, merge, tag, publish, and post-publish bookkeeping"
status: active
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

- [ ] Source `0.5.0` + coupled VSIX version proven on the RC head; PR exact-head CI + verifier zero blockers before READY.
- [ ] PR #20 squash-merged; post-merge master CI + Dogfood green before tag.
- [ ] Immutable annotated `v0.5.0` on the validated master commit; OIDC publish + provenance; npm `latest` → `0.5.0`; npx + fresh-consumer smoke green; GitHub Release `v0.5.0` last.
- [ ] Marketplace `Cynrath.ackit-vscode 0.5.0` published + verified.
- [ ] Hosted docs updated via the protected flow with integrity green.
- [ ] Post-publish pointer flipped (`0.5.0`) only after public verification; branches cleaned (`master` + Companion only); final public truth matches the goal record.

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

(placeholder — filled with per-surface evidence at gate time)
