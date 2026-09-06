---
id: "TASK-0088"
title: "v0.5.1 release recovery: release-context test correction, version bump, and publication"
status: completed
schemaVersion: 2
dependencies:
  []
createdAt: "2026-09-06"
completedAt: 2026-09-06
---

## Purpose

Recover the failed v0.5.0 publication as v0.5.1 on the single temporary
branch `release/v0.5.1`: correct the release-context test defect that
failed workflow `34036439113`, bump coupled source versions
`0.5.0` → `0.5.1`, ship the intended v0.5 feature set plus the test
correction with truthful release notes (v0.5.0 never published), and
publish v0.5.1 (npm + GitHub Release + Marketplace + hosted docs), then
flip `publishedStable` to `0.5.1` and clean branches to
`master` + `feat/browser-companion-v0.3` only. Immutable `v0.5.0` tag is
never touched. TASK-0087 stays blocked/superseded history.

Explicit user authorization (this task only): open the ONE recovery PR
`release/v0.5.1` → `master`, squash-merge it when exact-head CI green,
push the immutable annotated `v0.5.1` tag, let the existing
tag-trigger OIDC/provenance release workflow publish npm + GitHub
Release, publish `Cynrath.ackit-vscode 0.5.1` to the VS Code
Marketplace, update hosted docs through the protected site PR flow, flip
`release-state.json.publishedStable` to `0.5.1` after public
verification (via the one minimal bookkeeping PR only if
protected-master mechanics require it), and delete `release/v0.5.1`,
`release/v0.5.0`, `maintenance/v0.4.1` after success (with the one
non-`v*.*.*` archival tag only if the maintenance head holds unique
bookkeeping). No force-push, no rebase, no history rewrite, no tag
move/delete, no workflow dispatch.

## Scope

- `release/v0.5.1` from current `master` (`aee1ddc`); the ONLY
  implementation branch. No other branches/PRs except the one recovery
  PR plus at most one bookkeeping-only pointer PR if ADR-0029 mechanics
  require it.
- Fix `tests/e2e/chain-composition.test.ts`: remove tag-absence
  assertions; remove hard-coded current published-stable assertions;
  keep status/projection parity, verification, handoff, completion
  focus; release lifecycle assertions belong in release/version contract
  tests.
- Add a regression proving release/tagged-checkout execution cannot fail
  merely because the triggering release tag exists.
- Bump coupled source versions `0.5.0` → `0.5.1` (`package.json`,
  `extensions/vscode/package.json`, `.github/workflows/ci.yml` manifest
  contract + VSIX filename).
- Keep `release-state.json.publishedStable = 0.4.1` until v0.5.1 is
  publicly verified on every surface.
- CHANGELOG `0.5.1` entry + release notes stating: v0.5.0 failed its
  release gate before npm/GitHub publication; v0.5.1 carries the
  intended v0.5 feature set plus the release-context test correction;
  never claim npm v0.5.0 was published.
- Full gates, real tarball, VSIX, fresh verifier on the recovery head.
- ONE recovery PR → exact-head CI green → merge → post-merge master
  CI/Dogfood green → immutable annotated `v0.5.1` tag → OIDC workflow.
- Verify npm `0.5.1` + `latest`, fresh install/npx, GitHub Release,
  Marketplace, hosted docs; then pointer flip; then branch cleanup to
  `master` + Companion only (both local and remote listings verified).

## Out of scope

- Any feature/fix beyond the test correction + version bump + release
  mechanics above (lane is frozen).
- Browser Companion (`feat/browser-companion-v0.3` stays paused/untouched).
- Moving/deleting immutable tags `v0.4.1`, `v0.5.0`; force-push/history
  rewrite; workflow dispatch; deployments.
- Hosted-docs redesign; marketing beyond the correction note.

## Dependencies

- TASK-0087 (blocked/superseded failed v0.5.0 attempt — historical input only).
- NOTE: no machine-readable `dependencies` edge is kept (frontmatter
  `dependencies: []`): TASK-0087 is terminal-blocked history by design
  and can never complete, so an edge would permanently block this
  task's completion gate. The historical supersession link above is the
  record; completion of TASK-0088 does not (and must not) complete
  TASK-0087.

## Affected files / expected areas

- `tests/e2e/chain-composition.test.ts` (release-context correction)
- New regression test for tagged-checkout release contexts
  (e.g. `tests/contract/release-tag-context.test.ts` or adjacent contract location)
- `package.json`, `extensions/vscode/package.json`
  (ADR-0023 coupling `0.5.0` → `0.5.1`)
- `.github/workflows/ci.yml` (manifest contract + VSIX filename tracking `0.5.1`)
- `CHANGELOG.md` (`0.5.1` entry with failed-`v0.5.0`-gate truth)
- `docs/tasks/active/TASK-0087-*` (blocked/superseded record)
- `docs/tasks/active/TASK-0088-*` (this task)
- `release-state.json` (pointer flip `0.4.1` → `0.5.1` ONLY after public verification)
- Stable-claim surfaces on pointer flip (README, getting-started, VS Code README per ADR-0029)
- Tag `v0.5.1`; recovery PR lifecycle; remote branch deletions post-success

## Acceptance criteria

- [x] Chain-composition test asserts status/projection parity, verification, handoff, completion only; no tag-absence or hard-coded stable assertions; release lifecycle covered by contract tests.
- [x] Regression proves tagged-checkout execution passes with the triggering release tag present.
- [x] Source `0.5.1` + coupled VSIX version proven on the recovery head; PR exact-head CI + fresh verifier zero blockers before merge.
- [x] PR `release/v0.5.1` → `master` squash-merged; post-merge master CI + Dogfood green before tag.
- [x] Immutable annotated `v0.5.1` on the validated master commit; OIDC publish + provenance; npm `latest` → `0.5.1`; npx + fresh-consumer smoke green; GitHub Release `v0.5.1` last.
- [x] Marketplace `Cynrath.ackit-vscode 0.5.1` published + verified.
- [x] Hosted docs updated via the protected flow with integrity green.
- [x] Post-publish pointer flipped (`0.5.1`) only after public verification; branches cleaned (`master` + Companion only, both listings verified); final public truth matches the recovery record.

## Test steps

1. Recovery-head gates (install/lint/format/typecheck/build/test/gen:schemas idempotent/smokes/version-parity/offline/hygiene/config/doctor/task-doctor/skills/scan/diff-check).
2. Targeted: chain-composition + new tagged-checkout regression green locally and in CI.
3. Real package + VSIX proof with recorded versions/hashes/sizes (no node_modules, size limits, no secrets, no Companion).
4. Fresh-verifier zero blockers on the recovery head.
5. PR exact-head CI green → merge → post-merge CI/Dogfood evidence.
6. Tag → workflow → registry/Marketplace/Release verification outputs (npm view, fresh install, npx smoke, `gh release view v0.5.1`).
7. Hosted-docs PR + integrity evidence; pointer PR if required.
8. Branch topology (local + remote listings) + final truth table in completion notes.

## Security considerations

- Offline-first invariant holds: no network calls, telemetry, or uploads in product code (REQ-GOV-001/002).
- No secret values or absolute local paths in artifacts or task evidence (REQ-GOV-004/005).
- Tag trigger stays exact `vX.Y.Z` fail-closed; archival tag (if any) verified non-triggering before branch deletion.
- Package/VSIX audited for secrets and path leaks before publication.

## Risks

- Partial publication (npm done, Marketplace failed) → ordered per-surface checklist; no pointer flip until ALL surfaces verify.
- Tag-trigger workflow drift → release.yml re-read before tagging; npm absence check first.
- Protected-master mechanics forcing extra PRs → at most ONE minimal pointer PR; everything else rides the recovery PR pre-merge.
- Stale-branch confusion → hard rule: only `release/v0.5.1` exists during recovery; cleanup verified on both listings.

## Rollback plan

- Pre-merge: focused revert on `release/v0.5.1`; PR stays draft.
- Post-merge pre-tag: forward fix on master via PR (no history rewrite).
- Post-publish: no rollback of immutable artifacts; forward patch release if a defect escapes.
- Recovery failure: leave `v0.5.0` tag untouched; record blocker truthfully; report NO-GO.

## Completion notes

### Gate evidence — recovery head (pre-PR, branch `release/v0.5.1`)

- `pnpm lint`: PASS (biome, 327 files; 1 format fix applied to the new regression file, re-verified clean).
- `pnpm format:check`: PASS (309 files).
- `pnpm typecheck` (`tsc --noEmit`): PASS.
- `pnpm build` (`tsc -p tsconfig.build.json`): PASS.
- `pnpm test` full suite: 704 passed / 3 skipped, 1 load-timeout
  (`tests/unit/checkpoint/handoff.test.ts` single case, 60s timeout
  while smoke ran concurrently — unrelated to this change); isolated
  rerun: 10/10 PASS (36.95s). Focused: new regression 2/2 PASS;
  fixed chain-composition 1/1 PASS **with immutable `v0.5.0` tag
  present** (the exact failing condition of workflow 34036439113).
- `node scripts/check-version-parity.mjs`: PASS (source 0.5.1, stable 0.4.1).
- `node dist/cli/index.js config check`: OK.
- `node dist/cli/index.js doctor`: all checks passed.
- `node dist/cli/index.js task doctor`: integrity OK.
- `node dist/cli/index.js scan --ci`: exit 0, readiness 88/100 (threshold 80 — pass).
- `pnpm smoke:cli`: PASS.
- `pnpm run smoke:package`: PASS (`cynrath-agent-context-kit-0.5.1.tgz`, v0.5.1).
- Real VSIX: `ackit-vscode-0.5.1.vsix`, 12 files, 826,937 bytes (<2MB),
  `vsce ls` shows no `node_modules`; manifest coupled at 0.5.1
  (artifact removed after proof, never committed).
- `git diff --check`: clean.
- `v0.5.0` tag untouched (verified, still points at `aee1ddc`);
  `release-state.json.publishedStable` stays `0.4.1`.

### Publication evidence (2026-09-06, all live-verified)

- Recovery PR #21 (`release/v0.5.1` → `master`): 12/12 checks green on
  exact head `8ed6ac6`; squash-merged `ddb5ae3` (2026-09-06T15:16:26Z).
- Post-merge master CI (`34041784858`) + Dogfood (`34041784886`): success.
- Immutable annotated `v0.5.1` (tag object `34b0372`) on `ddb5ae3`;
  `v0.4.1` (`a2aa0a4`) and `v0.5.0` (`361a92e`) untouched.
- Release workflow `34042052515` (tag `v0.5.1`): success — OIDC publish
  + SLSA provenance; tarball shasum
  `7f363a996221b96d8d0f87fdd28fbefe78701e4a`; registry
  `dist-tags.latest` → `0.5.1`; fresh isolated consumer
  (`npm install @cynrath/agent-context-kit@0.5.1` → `--version 0.5.1`)
  green; GitHub Release `v0.5.1` (`AgentContextKit v0.5.1`, Latest)
  created last with CHANGELOG `0.5.1` notes.
- npx: `npx --yes @cynrath/agent-context-kit@0.5.1 --version` → `0.5.1`
  from a neutral cwd. (Note: invoking npx with cwd inside the repo
  checkout at the same version self-matches npm-exec's local-tree probe
  and reports `ackit: not found` — environment artifact of cwd, not a
  registry/packaging defect; the workflow's secondary npx step is
  best-effort by design with the fresh consumer as the hard gate.)
- Marketplace: `vsce publish --packagePath ackit-vscode-0.5.1.vsix`
  → `DONE Published Cynrath.ackit-vscode v0.5.1`; `vsce show` verifies
  `0.5.1` after gallery propagation.
- Hosted docs: site branch `docs/ackit-v0.5.1-sync` (sync
  `ACKit 0.5.1: 27 pages + llms + sitemap/robots`) → site PR #10 →
  `docs-integrity` PASS → squash-merged; post-merge `docs-integrity`
  PASS; site branch deleted both sides; live
  `https://cynrath.github.io/agent-context-kit/` shows 0.5.1
  (title/H1/install pin) after Pages deploy.
- Pointer flip (this change): `publishedStable 0.4.1 → 0.5.1` with the
  ADR-0029 stable-claim surface sync (README pins/Action pin/
  getting-started one-shot/VS Code README); parity re-verified
  (source 0.5.1, stable 0.5.1).
- Branch cleanup: `release/v0.5.0` deleted (remote + local, was merged);
  `maintenance/v0.4.1` audited — head held the unique completed
  TASK-0074 v0.4.1 publication record, preserved as non-release archival
  tag `archive-v0.4.1-maintenance-head` (verified non-triggering:
  no `v*.*.*` match, `isStableReleaseTag` false, no stray workflow run),
  then branch deleted (remote + local); `v0.4.1`/`v0.5.0` tags never
  moved/deleted. `release/v0.5.1` deleted remote + local immediately
  after this pointer PR merges; final topology `master` +
  `feat/browser-companion-v0.3` verified on both listings post-merge.

### Final public truth

```text
master package/version:       0.5.1
publishedStable:              0.5.1
npm latest:                   0.5.1
GitHub latest release:        v0.5.1
VS Code Marketplace:          0.5.1
hosted docs:                  0.5.1

branches:
master
feat/browser-companion-v0.3
```

Historical: `v0.4.1` immutable; `v0.5.0` immutable failed-release tag;
TASK-0087 preserved as failed/superseded historical release attempt.
