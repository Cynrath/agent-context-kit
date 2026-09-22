---
id: "TASK-0094"
title: "Release recovery 0.5.4 — two-repo sync, marketplace fix, full publish"
status: active
schemaVersion: 2
dependencies:
  - "TASK-0092"
  - "TASK-0093"
createdAt: "2026-09-22"
completedAt: null
---

## Purpose

Close the partial 0.5.3 release (npm 0.5.3 live, tag v0.5.3 immutable,
GitHub Release v0.5.3 live, Marketplace still 0.5.2, pointer held at
0.5.2, site held at 0.5.2 with DRAFT PRs #31/#13) and ship patch 0.5.4
in one complete pass with both repos clean + in sync BEFORE any external
publish. Fix the release-pipeline root cause (unpublished `--oidc`
assumption + ordering that lets npm run ahead of Marketplace) with a
fail-closed manual Marketplace gate, reconcile pending 0.5.3 flip/site
work into the 0.5.4 candidate, and verify every live surface by
read-back. v0.5.3 is never mutated.

Explicit user authorization (goal round 2026-09-22, "ACKit v0.5.4 —
Release Recovery, Two-Repo Sync, Marketplace Fix"): implementation
changes, tests, branch/PR creation, merges to canonical branches
(ACKit `master`, site `main`), annotated tag `v0.5.4` creation + push,
npm publish via canonical tag-trigger workflow, GitHub Release creation,
manual Marketplace publish step (user-performed; agent verifies
read-only), site production deploy, and stale-branch cleanup for this
release only. Always prohibited remain: force-push, rebase, history
rewrite, tag movement/deletion (`v0.5.3` immutable), workflow dispatch,
deployments outside this release, secret exposure.

## Scope

- Discovery verified 2026-09-22: npm `latest` 0.5.3; tag `v0.5.3`
  immutable; GitHub Release `v0.5.3` live (not draft, not prerelease);
  Marketplace `Cynrath.ackit-vscode` live 0.5.2 (`vsce show` 4.0.0,
  lastUpdated 2026-09-06); `master` pointer 0.5.2 / source 0.5.3;
  site `main` 0.5.2 with DRAFT `chore/ackit-v0.5.3-site-sync` (PR #13);
  ACKit DRAFT `chore/flip-stable-0.5.3` (PR #31, 12/12 CI green).
- `NEXT_VERSION` = 0.5.4 (npm latest patch + 1).
- Release-pipeline fix: remove unpublished `vsce publish --oidc`
  assumption (proven absent from `@vscode/vsce` 4.0.0 `publish --help`;
  `latest` 4.0.0, `next` 4.0.1-0, full version list checked); keep
  `--skip-duplicate` (real kebab-case flag, fixed in #29); restore
  ADR-0023 manual Marketplace path as normal with fail-closed ordering:
  build/test/package → immutable VSIX + SHA → MANUAL MARKETPLACE GATE
  (user-performed `vsce publish --packagePath`, no PAT in repo, no
  `--oidc` in automation) → verify Marketplace live == target → npm
  publish → GitHub Release → stable pointer + site finalization.
  Amend ADR-0033 with supersede note (history verbatim).
- Contract tests: update `ci-pinning` release-workflow asserts to the
  manual-gate reality (assert `--oidc` absent, `--skip-duplicate`
  present where applicable, `VSCE_PAT` guard semantics per chosen
  mechanism, ordering: marketplace-live verification before npm publish
  OR explicit manual-gate step before npm publish + no automated
  `vsce publish`).
- Version bump 0.5.3 → 0.5.4: root `package.json`, `extensions/vscode`
  `package.json` (coupling), `CHANGELOG.md` + extension CHANGELOG new
  0.5.4 sections (0.5.3 history untouched), source-tracking refs where
  repo convention requires; stable pins + `publishedStable` stay 0.5.2
  until post-publish flip (two-phase per ADR-0029).
- Reconcile PR #31 → retarget flip 0.5.2 → 0.5.4 (class B: revise, keep
  DRAFT until Marketplace 0.5.4 live, then ready+merge). Reconcile site
  PR #13 → regen for 0.5.4 (class B/D: rebase or supersede with clean
  0.5.4 PR, generator-only edits + idempotence proof).
- Markdown + user-facing sweep in both repos: current/latest/stable/
  install/npx/Action `uses:`/softwareVersion/JSON-LD/OG/sitemap refs →
  0.5.4 at flip time; historical records (CHANGELOG history, ADR
  history, old release notes, fixtures testing old versions, evidence
  logs) preserved.
- Full gates on exact heads + RC freeze (SHA-recorded) + preflight
  (npm absence, tag absence, gh auth, marketplace capability) + ordered
  publish + live read-back parity table + Pages verification + PR/branch
  cleanup + remote equality.

## Out of scope

- Mutating `v0.5.3`/npm 0.5.3/GitHub Release v0.5.3 (immutable history;
  0.5.3 Marketplace gap stays recorded as the incident, not rewritten).
- New Marketplace listing; Action `name` change; new reporters/commands/
  blog/telemetry/tracking; stack or permission widening.
- Publishing 0.5.3 to Marketplace as a separate step (superseded by
  0.5.4; marketplace goes 0.5.2 → 0.5.4 in one manual publish).
- Force-push / rebase / history rewrite / tag move / workflow dispatch.
- Unrelated branches (`feat/browser-companion-v0.3`, etc.) — never
  touched or deleted.

## Dependencies

- TASK-0092 (0.5.3 growth release + partial-release evidence) — done
  except held flip/site merges.
- TASK-0093 (vsce OIDC premise re-verification) — premise verdict
  reused here (4.0.0 has no `--oidc`); this task implements the manual
  path TASK-0093 option (b) describes.

## Affected files

- `.github/workflows/release.yml` (manual-gate redesign)
- `tests/contract/ci-pinning.test.ts` (contract for chosen mechanism)
- `docs/decisions/ADR-0033-vscode-marketplace-oidc-trusted-publishing.md`
  (supersede amendment note only)
- `package.json`, `extensions/vscode/package.json`, `package-lock`/`pnpm-lock`
  (0.5.4 bump via repo script where present)
- `CHANGELOG.md`, `extensions/vscode/CHANGELOG.md` (new 0.5.4 sections)
- `README.md`, `docs/guides/getting-started.md`,
  `docs/guides/agent-integration.md` (stable pins → 0.5.4 at flip time)
- `release-state.json` (`publishedStable` 0.5.2 → 0.5.4 at flip time)
- Site repo: `scripts/sync-ackit-docs.mjs` inputs + regenerated
  `agent-context-kit/**`, `llms.txt`, `llms-full.txt`, sitemap/robots,
  root `index.html` ACKit card (via generator + hand-sync where owned)
- `docs/tasks/active/TASK-0094-*.md` (this task) + TASK-0092/0093
  completion cross-refs (no parallel TODO system)

## Required tests

- `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm format:check`,
  `pnpm typecheck`, `pnpm build`, `pnpm test`, `pnpm smoke:cli`,
  `pnpm run smoke:package`
- `node dist/cli/index.js --version` (= 0.5.4 after bump), `doctor`,
  `task doctor`, `skills validate`, `instructions`, `scan --ci`,
  `git diff --check`
- Version-parity / readme-current / ci-pinning / release-notes /
  offline-egress gates where wired; extension package + VSIX inspect +
  SHA-256; action smoke; dogfood
- Site: install/frozen lock, `verify-site`, `docs-integrity`,
  generator idempotence (run twice, second zero-diff), build,
  sitemap/nav/link checks where present
- Exact-head CI green on every release PR before merge; RC freeze SHAs
  recorded; preflight PASS before publish

## Acceptance criteria

- [ ] AC-001 0.5.3 live baseline re-verified from primary sources
  (npm/tag/Release/Marketplace/pointer/site) and recorded.
- [ ] AC-002 PR #31 classified B and retargeted to 0.5.4 (no dangling
  draft); site PR #13 classified B/D and retargeted to 0.5.4.
- [ ] AC-003 Release workflow no longer assumes unpublished `--oidc`
  (no `--oidc` in automation; `--skipDuplicate` absent;
  `--skip-duplicate` only where the installed vsce supports it);
  manual Marketplace gate fail-closed before npm publish; contract
  tests lock the reality.
- [ ] AC-004 Marketplace auth/capability preflight implemented
  (read-only `vsce show`; no secret values logged).
- [ ] AC-005 ACKit implementation (workflow fix + 0.5.4 bump) merged to
  `master` with exact-head CI green; working tree clean;
  local `master` == `origin/master` before tag.
- [ ] AC-006 Site 0.5.4 source changes merged to `main` before tag;
  `main` clean and == origin before tag.
- [ ] AC-007 All current `.md` + user-facing refs in sync (0.5.4);
  historical refs consciously preserved.
- [ ] AC-008 VSIX built from tagged source, inspected, SHA-256 recorded
  and immutable; npm package smoke PASS.
- [ ] AC-009 RC frozen (ACKit + site SHAs recorded); any
  release-impacting change after freeze invalidates RC + reruns tests.
- [ ] AC-010 Preflight PASS before publish; no publish on red.
- [ ] AC-011 `v0.5.4` tag pushed (absent before, never moved after).
- [ ] AC-012 npm `latest` read-back = 0.5.4.
- [ ] AC-013 Marketplace read-back = 0.5.4.
- [ ] AC-014 GitHub Release `v0.5.4` live (not draft, not prerelease,
  VSIX asset SHA == audited SHA).
- [ ] AC-015 `publishedStable` = 0.5.4; site softwareVersion/current =
  0.5.4; Pages deploy PASS + live HTTP verification.
- [ ] AC-016 No release-owned open/draft PR or stale branch left in
  either repo; final clean + remote equality.
- [ ] AC-017 Independent verification PASS; evidence complete.

## Test steps

1. Preflight: `git status --short --branch`, `git remote -v`,
   `node dist/cli/index.js --version|doctor`, `scan --ci`, `task doctor`
   in both repos (site uses its own scripts).
2. Live baseline: `npm view` version/dist-tags, `gh release view
   v0.5.3`, `vsce show Cynrath.ackit-vscode --json`,
   `gh pr view 31/13`, `git tag --list v0.5.4`, `git ls-remote --tags`.
3. Upstream: `npm view @vscode/vsce versions/dist-tags`,
   `pnpm dlx @vscode/vsce@4.0.0 publish --help` (record: no `--oidc`).
4. Implement on feature branches off synced canonical heads; focused
   contract tests first.
5. Full gates per Required tests (ACKit + site); record pass/fail counts.
6. Stale-ref scans (md + user-facing) in both repos; classify every hit.
7. RC freeze: `git pull --ff-only`, `git status --short`, `git log -5`,
   record SHAs.
8. Preflight: npm absence 404 for 0.5.4, tag absence, `gh auth status`,
   marketplace capability probe.
9. Publish via canonical tag-trigger workflow only after preflight PASS;
   manual Marketplace step user-performed, agent read-only verifies.
10. Live read-back parity table + Pages HTTP checks + cleanup +
    remote-equality proofs.

## Security considerations

- Offline-first preserved: no network/telemetry/analytics/pixel/remote-JS
  in product, extension, or site pages (offline-egress gate).
- No secrets in repo or logs: no `VSCE_PAT`/`NODE_AUTH_TOKEN`/`NPM_TOKEN`
  in workflow; no secret values in task evidence or terminal output
  (REQ-GOV-004/005); absolute local paths redacted from artifacts.
- Action permissions stay minimal; provenance retained for npm.
- User files never overwritten without explicit intent flags.

## Risks

- Upstream ships vsce OIDC mid-release → no mid-flight redesign; this
  release stays manual-gate; a later task may re-evaluate with a NEW
  patch release (never move `v0.5.4`).
- Tag-trigger rerun after partial npm publish fails safely at absence
  gate → repair downstream only, never move tag.
- Generator drift (hand-edited site HTML) → only via
  `sync-ackit-docs.mjs` inputs + regen + idempotence proof.
- Flaky parallel vitest under load → rerun stabilized
  (`maxWorkers=2`, `hookTimeout=120s`) as TASK-0092 proved.
- Credential absence for Marketplace/npm/gh → stop before that step,
  report exact blocker, never partial-publish (per governance §37).

## Rollback plan

- Pre-merge: focused revert on the feature branch; PR stays draft.
- Post-merge pre-tag: forward fix via PR (no history rewrite).
- Post-publish defect: forward patch (0.5.5 plan); never mutate 0.5.4
  artifacts, tag, or Release.

## Completion notes

### Round 1 — discovery + implementation (2026-09-22, branch `chore/ackit-0.5.4-release-recovery`)

- AC-001 baseline re-verified: npm `latest` 0.5.3; tag `v0.5.3`
  immutable; GitHub Release `v0.5.3` live (not draft/prerelease);
  Marketplace `Cynrath.ackit-vscode` live 0.5.2 (`vsce show` 4.0.0,
  lastUpdated 2026-09-06); `master` source 0.5.3 / pointer 0.5.2;
  site `main` 0.5.2; DRAFT PR #31 (ACKit flip, 12/12 CI green) + #13
  (site sync) open; `NEXT_VERSION` = 0.5.4.
- Upstream re-verified: `@vscode/vsce` `latest` 4.0.0 / `next`
  4.0.1-0; `pnpm dlx @vscode/vsce@4.0.0 publish --help` lists
  `--pat`/`--azure-credential`/`--skip-duplicate`, NO `--oidc`.
  ADR-0033 automated premise still unmet → manual gate (AC-003/004).
- PR #31 classified B (revise flip 0.5.2→0.5.4 after publish, keep
  DRAFT until Marketplace 0.5.4 live); site PR #13 classified B
  (regen for 0.5.4 on the same branch line, then ready+merge).
- Workflow fix: `release.yml` automated `vsce publish --oidc`
  removed; fail-closed MANUAL Marketplace gate BEFORE npm publish
  (live == target via read-only `vsce show`, else fail with re-run
  instructions; npm never publishes while Marketplace lags) +
  read-only post-npm re-verification; header/ordering/release-notes
  template updated; `v0.5.3` run-35727290676 history noted.
- Contract tests: `ci-pinning` (manual-gate ordering, no automated
  publish invocation, no `publish --oidc`, neither skip flag in
  automation, `secrets.`/`--azure-credential`/`--pat`/`vsce login`
  absent, VSCE_PAT guard present) + `release-notes` (gate < npm <
  re-verify < Release): 24/24 PASS.
- Bump 0.5.3→0.5.4: root + extension manifests, extension README
  Version/build copy, `ci.yml` manifest contract + VSIX filename x3,
  README Development line + VSIX filename, root + extension
  CHANGELOG 0.5.4 sections (0.5.3 history verbatim). Stable pins +
  `publishedStable` stay 0.5.2 (two-phase).
- ADR-0033 amended (status line + 2026-09-22 amendment section;
  history verbatim).
- Gates: `check-version-parity` PASS (source 0.5.4 / stable 0.5.2);
  `check-text-hygiene` clean (951 files); `lint` PASS;
  `format:check` PASS; `typecheck` PASS; `build` PASS;
  `gen:schemas` no drift; `git diff --check` clean.
- Full `vitest` running (background job); smoke/doctor/scan pending
  before PR readiness.

### Round 1 continued — PR #32 merged, site + flip retargeted (2026-09-22)

- Full `vitest` (local, `maxWorkers=2`): 717 passed / 1 failed / 3
  skipped of 721; the single failure (`checkpoint/handoff`, loaded
  machine) passes 10/10 solo — parallel-load flake of the documented
  class (cf. TASK-0092), NOT a product defect. Exact-head CI is the
  hard gate (below).
- `smoke:cli` PASS; `smoke:package` PASS (`cynrath-...-0.5.4.tgz`);
  `doctor` + `task doctor` PASS (single-active enforced: TASK-0094
  active, TASK-0092 → blocked with Round 5 supersede note, TASK-0093
  blocked); `scan --ci` exit 0 (baseline findings untouched by diff).
- PR #32 (implementation) 12/12 exact-head CI green → squash-merged
  `83e3800` to `master`; remote + local feature branches deleted.
  Post-merge `master` CI + Dogfood green on `83e3800`.
- Single-active violation avoided: no code written before TASK-0094
  existed (plan committed `9b5eed6` first, Rule 3). One transient
  self-correction, never committed: during flip-merge conflict
  resolution this agent briefly dropped TASK-0092 Rounds 3–4 text and
  restored it verbatim from `8187ec8` before committing (Rule 9 —
  documented here, history intact in `375ef30`).
- Site retarget (site branch `chore/ackit-v0.5.3-site-sync`): regen
  from ACKit 0.5.4 source → 34 pages 0.5.4 + root hand-sync 6 spots
  (softwareVersion/hero/card/install x2/gh-version) →
  `verify-site.mjs` PASS (34/0.5.4/34); consecutive regen runs
  hash-stable (idempotence); committed `c1e3756`, pushed; site PR #13
  retargeted to v0.5.4 (still DRAFT, `docs-integrity` CI PASS).
  Honest anomaly note: an intermediate hash comparison across a
  stash/pop cycle differed once (line-ending normalization suspected);
  final state re-proven stable across back-to-back runs + verify PASS.
- Flip retarget (ACKit `chore/flip-stable-0.5.3`): merged
  `origin/master`, pins 0.5.3→0.5.4 (release-state, README
  install/npx/Action/Versioning/table, guides), parity PASS
  (0.5.4/0.5.4); committed `375ef30`, pushed; PR #31 retargeted to
  v0.5.4 (still DRAFT; CI running).
- Stale-ref scan (master): all remaining 0.5.3 `.md` hits classified
  historical/evidence (CHANGELOG/ADR/task history) — PRESERVED; one
  source-tracking drift found (README VS Code table cell) → fixed in
  this final-touch change. No 0.5.3 in `*.{yml,yaml,json}`.
- Preflight/marketplace/publish state: NEXT — RC freeze SHAs, tag
  absence (`v0.5.4`) + npm absence (0.5.4) + `gh auth` + marketplace
  capability probe. KNOWN STOP: Marketplace live is 0.5.2 and no user
  credential exists in this session → the manual gate cannot pass →
  NO tag/npm/Release per governance §37 (never partial-publish).
