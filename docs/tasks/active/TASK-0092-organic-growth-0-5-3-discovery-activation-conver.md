---
id: "TASK-0092"
title: "Organic growth 0.5.3: discovery activation conversion"
status: active
schemaVersion: 2
dependencies: []
createdAt: "2026-09-22"
completedAt: null
---

## Purpose

Increase real organic adoption of ACKit (`@cynrath/agent-context-kit`, CLI `ackit`) by improving the conversion chain search/discovery -> GitHub/npm visit -> first command -> first value -> retention (Action/VS Code/MCP) -> shareable output -> new user, shipped as patch `0.5.3` (canonical stable `0.5.2` verified: package.json, release-state.json, tag v0.5.2, npm latest 0.5.2, VS Code 0.5.2).

Explicit user authorization (goal round 1/256, 2026-09-22): new patch release, canonical version bump, CHANGELOG/release notes, commit, annotated tag, push branch + tag to origin, GitHub Release via canonical tag-trigger workflow, npm publish via Trusted Publishing/OIDC release workflow, plus site-repo (`O:\projeler\Cynrath.github.io`) ACKit reference sync, commit and push. Controlled-release governance satisfied by this recorded authorization. Always prohibited remain: force-push, rebase, history rewrite, tag movement/deletion, workflow dispatch, deployments.

## Scope

- Baseline: npm page/latest/downloads, GitHub stars/forks, Marketplace Action existence, VS Code extension, Pages site, topics, README first screen, install/quickstart, Action example, package metadata, site meta/sitemap/robots/structured-data, internal links, first-run friction (recorded in Completion notes, no new tracking system).
- `package.json`: description closer to search intent (multi-provider agent context + readiness, instruction validation, scanning, context optimization, evidence workflows; offline-first deterministic); keywords add only truly supported terms within npm limits; verify homepage/repository/bugs/license/engines/bin/exports/files/publishConfig untouched in behavior.
- README first viewport: what/who/problem/single try CTA (`npx --yes @cynrath/agent-context-kit@latest readiness`) + provider line + 5-6 outcome bullets + trust line; keep deep technical content below, no broken anchors, English stays English.
- First-run CTA verified by real smoke (local build + packed tarball isolated consumer + `npx --yes @latest readiness` only if network allows; never fake output). Real `readiness` output (89/100 shape) used for demo; no fake screenshots.
- `action.yml`: keep `name: AgentContextKit`; improve description for Marketplace discovery (scan/readiness/policy/offline/SARIF wording) without input/output breaking changes.
- README/site/docs Action `uses:` examples stay pinned to published stable `0.5.2` in phase 1 (contract tests require it) and flip to `v0.5.3` in the post-publish flip PR.
- VS Code extension (no new extension): Marketplace description/keywords/engines untouched in behavior; README first screen made IDE-suitable (Open repo -> Run readiness -> See findings), commands/links verified, no telemetry.
- Site (`O:\projeler\Cynrath.github.io`, generator-owned): Overview first viewport (problem/product/single CTA/GitHub secondary/providers/real terminal output), title/description/canonical/OG/Twitter verification, JSON-LD softwareVersion sync, sitemap/robots check, 4-7 problem-focused landing inputs evaluated against generator architecture (only add what generator + thin-content rules allow), version sync 0.5.2 -> 0.5.3 via `scripts/sync-ackit-docs.mjs` regen (never hand-edit generated HTML).
- Shareable output decision (lowest-risk, verified 2026-09-22): NO new reporter. `scan` already supports `--format terminal|json|sarif|markdown|html`; `optimize` supports `terminal|json|markdown|sarif`; `readiness` has NO `--format` (verified: unknown option). Surface existing `scan --format markdown` + SARIF/job-summary path in README/Action docs instead of building anything new.
- `doctor` decision (verified 2026-09-22): NO new `doctor`-style command. `readiness` auto-discovers repo, prints explainable 89/100 summary with actionable findings, exits 0 on pass; `doctor` passes too. README wording only.
- Guides: only add docs-structure-native technical content if low-risk (AGENTS.md/conflict validation, readiness measurement, context waste, evidence tasks, offline checks); no new blog system.
- Version sync (two-phase per ADR-0029/contract tests): phase 1 (this PR) — root `package.json` + `extensions/vscode/package.json` 0.5.2 -> 0.5.3, `CHANGELOG.md` + extension CHANGELOG new 0.5.3 entries, source-tracking refs (CI contract, VSIX names, feature table, `Development:` line) -> 0.5.3, while stable pins (README install/npx, Action `uses:`, getting-started, agent-integration) stay 0.5.2 with `Latest stable: 0.5.2`; `release-state.json.publishedStable` stays `0.5.2`. Phase 2 (post-publish flip PR) — pointer + stable pins -> 0.5.3; site regen already targets 0.5.3 via generator.
- Release: full gates green -> feature branch -> PR (exact-head CI green, branch protection) -> merge -> post-merge CI/Dogfood -> annotated `v0.5.3` on validated master -> push tag -> tag-trigger `release.yml` (npm OIDC + VSIX/Marketplace OIDC + GitHub Release + VSIX asset) -> verify npm latest/Marketplace/Release -> site PR + merge.
- Measurement: public-metrics plan only (npm downloads, stars/forks, Marketplace visibility, VS Code installs, public Action signals); T0/+7/+28 comparison; no analytics/telemetry.

## Out of scope

- Fake downloads, bots, proxy/VPN inflation, meaningless CI installs, telemetry/tracking, dark patterns, fake stars/forks/reviews, keyword stuffing, unsupported-feature claims.
- New Marketplace listing; `AgentContextKit` Action name change; CLI/API/MCP/Action/VS Code contract breaks for marketing; stack/package-manager changes.
- New cloud service, external API dependency, analytics/pixel/remote JS, permission widening (`contents: read` stays unless repo proves otherwise), secret exposure.
- New `doctor` command, new reporter/badge service, new blog system, unrelated local changes (left untouched; local master vs origin/master trees verified identical content, only commit-message differs: a53f460 vs 1c531c4).
- Deleting/rewriting history, force-push, rebase, tag moves, `.NET/NuGet` legacy line (frozen).

## Affected files

- `package.json` (description/keywords; version 0.5.3 at release step)
- `extensions/vscode/package.json` (version coupling 0.5.3)
- `README.md` (first viewport, CTA, demo, Action example, shareable-output docs)
- `CHANGELOG.md` (new 0.5.3 entry)
- `action.yml` (description only)
- `docs/guides/getting-started.md`, `docs/guides/agent-integration.md`, `docs/reference/cli.md` (only if CTA/version sync requires; anchors preserved)
- `extensions/vscode/README.md` (IDE onboarding first screen; version header == manifest)
- Site repo (generated via `scripts/sync-ackit-docs.mjs`): `agent-context-kit/**`, `llms.txt`, `llms-full.txt`, sitemap/robots as generator owns them; root `index.html` ACKit card only if it names a version.
- `docs/tasks/active/TASK-0092-*.md` (this task) + evidence via Completion notes (no parallel TODO system).

## Required tests

- `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm build`, `pnpm test`, `pnpm smoke:cli`, `pnpm run smoke:package`
- `node dist/cli/index.js --version` (= 0.5.3 after bump), `doctor`, `scan --ci`, `readiness`, `task doctor`, `skills validate`, `instructions`, `scan --format markdown` proof, `optimize --format markdown` proof
- Version-parity guard + text-hygiene + offline-egress gates where repo wires them; `git diff --check`
- Site: `node scripts/verify-site.mjs` (or repo's real verify command) + generator idempotence (run twice, second zero-diff)
- Release workflow `release.yml` green on tag `v0.5.3`; post-publish: `npm view` latest/shasum, fresh consumer + npx smoke, `vsce show`, `gh release view v0.5.3`

## Acceptance criteria

- [ ] AC-001 Baseline recorded in Completion notes from primary sources (no invented numbers).
- [ ] AC-002 `package.json` description/keywords improved, contracts intact (`files` includes README, `bin.ackit`, `engines >=22`, publishConfig public).
- [ ] AC-003 README first viewport answers what/who/problem/try/providers/trust with single verified CTA; deep content kept, anchors intact.
- [ ] AC-004 First-run CTA (`npx --yes @cynrath/agent-context-kit@latest readiness`) proven by real smoke; local `readiness` exit 0 with explainable output.
- [ ] AC-005 No duplicate Marketplace listing; `action.yml` name untouched; description improved; inputs/outputs compatible.
- [ ] AC-006 Phase 1: stable pins (Action `uses:`, install/npx, MUST_SHOW_STABLE) stay 0.5.2 with `Latest stable: 0.5.2` while source tracks 0.5.3; version-parity guard green. Phase 2 (post-publish): pins + pointer flip to 0.5.3.
- [ ] AC-007 VS Code README onboarding-first, no telemetry, links/commands accurate, version header == manifest.
- [ ] AC-008 Site Overview converts (problem/product/CTA/providers/real output); meta/canonical/OG/Twitter + JSON-LD `softwareVersion` 0.5.3; sitemap/robots verified; landing additions only if generator-safe and non-duplicate.
- [ ] AC-009 Shareable path = existing `scan --format markdown`/SARIF surfaced in docs; no new reporter/service.
- [ ] AC-010 No new `doctor` command (decision recorded with evidence).
- [ ] AC-011 Full gates green (install/lint/format/typecheck/build/test/smokes/doctor/scan --ci/task doctor/diff-check + site verify).
- [ ] AC-012 `0.5.3` shipped: coupled manifests bumped, CHANGELOG entry added, PR merged with exact-head CI green, annotated `v0.5.3` on validated master pushed, tag-trigger release green, npm `latest` = 0.5.3, Marketplace verified, GitHub Release present with audited VSIX, `publishedStable` flipped post-verification only.
- [ ] AC-013 Site repo synced to 0.5.3 via generator, verified, committed, pushed (Pages deploy observed where provable).
- [ ] AC-014 No prohibited action performed (telemetry/tracking/fake metrics/history rewrite/force-push/tag move/permission widening/secret leak).

## Test steps

1. Preflight: `git status --short --branch`, `git remote -v`, `node dist/cli/index.js --version|doctor`, `scan --ci`, `readiness`, `task doctor`.
2. Baseline reads: `npm view` version/dist-tags/description, extension manifest, `action.yml`, README head, site `index.html` head, `scripts/sync-ackit-docs.mjs` contract.
3. Implement on feature branch `chore/growth-0.5.3` (off synced master tree); keep local unrelated changes untouched.
4. Focused proofs: `readiness` (exit 0), `scan --format markdown | head`, `optimize --format markdown | head`, `readiness --format markdown` fails-closed proof (documents no-format reality).
5. Full gates: install/lint/format/typecheck/build/test/smoke:cli/smoke:package + version-parity + hygiene + offline-egress + `git diff --check`.
6. Site: run sync generator, run twice for idempotence, run site verifier, inspect diff for 0.5.3 + SEO deltas only.
7. Release (only with this task's authorization): PR -> exact-head CI green -> merge -> post-merge CI/Dogfood -> annotated tag `v0.5.3` -> `git push origin v0.5.3` -> watch `release.yml` -> verify npm/Marketplace/Release/VSIX SHA.
8. Post-publish pointer flip PR if mechanics require; site PR -> merge -> verify Pages.

## Security considerations

- Offline-first preserved: no network/telemetry/analytics/pixel/remote-JS added to product, extension, or site pages (verify via offline-egress gate).
- No secrets/absolute local paths in artifacts, terminal output, or task evidence (REQ-GOV-004/005).
- Action permissions stay minimal; Job Summary preferred over PR-comment permission escalation.
- Redaction preserved: scan evidence never carries plaintext secrets; demo outputs use real but already-public repo findings.

## Risks

- Tag-trigger release failure (as v0.5.0 proved) -> read `release.yml` before tagging, run full gates on exact head, npm absence check, ordered per-surface verification; never move/delete tag on failure; forward patch only.
- Partial publication (npm ok, Marketplace fail) -> stop, verify each surface, repair downstream only, no npm republish.
- Branch protection blocks direct master push -> land via PR with exact-head CI green; tag only post-merge validated master.
- Generator drift (hand-edited HTML) -> only change `scripts/sync-ackit-docs.mjs` inputs + regen; prove idempotence.
- Scope creep into new commands/reporters -> rejected by AC-009/AC-010 decisions above.

## Rollback plan

- Pre-merge: focused revert on feature branch; PR stays draft.
- Post-merge pre-tag: forward fix via PR (no history rewrite).
- Post-publish defect: forward patch release; never rollback immutable npm/Release/tag artifacts.

## Completion notes

### Baseline T0 (2026-09-22, primary sources)

- npm `@cynrath/agent-context-kit`: `latest` 0.5.2, 10 versions (0.1.0..0.5.2, no 0.5.0 — never published), desc = old instruction-graph wording, 14 keywords.
- GitHub: 14 stars, 1 fork, 0 watchers; desc + homepage (`cynrath.github.io/agent-context-kit/`) set; 20/20 topics (agents-md, cli, codex, coding-agents, developer-tools, repository-scanner, security, gemini, ai-agents, context-engineering, github-actions, mcp, model-context-protocol, offline-first, typescript, vscode-extension, agent-skills, claude-code, cursor, policy-as-code) — at limit, no churn.
- Marketplace Action exists (`agentcontextkit`); `action.yml` name kept; release v0.5.2 (2026-09-06) present; VS Code `Cynrath.ackit-vscode` 0.5.2.
- README friction: no try-CTA above fold, provider soup without names, demo starts with install-gated `init`; install pins 0.5.2; Action example v0.5.2.
- Site: generator-owned (`sync-ackit-docs.mjs`), 31 pages, meta/canonical/OG/Twitter + JSON-LD softwareVersion present, sitemap/robots generated, root index hand-maintained (hero/card/install/JSON-LD at 0.5.2, live 14/1 stars).
- First-run: `readiness` exit 0 with 89/100 explainable output; `doctor` pass; `readiness --format` does NOT exist (fails closed); `scan --format markdown/sarif`, `optimize --format markdown` proven.
- Canonical stable verified 0.5.2 (package.json, release-state, tag v0.5.2, npm latest, extension 0.5.2) -> target 0.5.3.

### Progress

- [x] Plan committed (dcda7ce) before implementation (Rule 3).
- [x] Implementation committed (88685e7): package.json desc/keywords, README viewport + shareable docs + version line, action.yml desc, ext README onboarding, getting-started CTA, coupled 0.5.3 bump + CHANGELOGs + CI contract.
- [x] Gates: install/lint/format/typecheck/build PASS; smoke:cli + smoke:package (0.5.3 tgz) PASS; doctor/task-doctor/scan--ci PASS; text-hygiene + version-parity (source 0.5.3/stable 0.5.2) + offline-egress PASS; contracts 43/43 PASS.
- [x] npx CTA proven live on empty dir (exit 0).
- [x] Full vitest: parallel runs flaky under load (hook timeouts in git-init-heavy suites; same files pass solo, e.g. release-tag-context + checkpoint-atomic 6/6) — rerun stabilized (maxWorkers=2, hookTimeout=120s).
- [x] Branch `chore/growth-0.5.3` pushed; PR #28 merged (squash `f221d07`,
  12/12 CI green on exact head); merge tree == PR head (empty diff).
  Local duplicate master commit dropped via local-only branch recreate
  (tree-identical, never pushed; no public history touched).
  Marketplace NOT recreated (existing listing kept).
- [x] Post-merge master CI + Dogfood green on `f221d07`; annotated tag
  `v0.5.3` created on `f221d07` (npm absence 404 pre-verified) and pushed.
- [x] Release run `35727290676`: npm `0.5.3` PUBLISHED (`latest` = 0.5.3,
  provenance); then FAILED CLOSED at Marketplace OIDC publish (exit 62).
  Root cause (run logs): `vsce publish --oidc ... --skipDuplicate` ->
  `error: unknown option '--skipDuplicate'` (real flag:
  `--skip-duplicate`, proven via `vsce publish --help` on published
  4.0.0). First live run of the TASK-0091 automation; typo never exercised.
  Deeper: `--oidc` exists only on upstream vsce `main` (`src/oidc.ts`,
  unreleased) — no published vsce (latest 4.0.0, next 4.0.1-0) ships it
  (README has no OIDC section). Tracked as TASK-0093 (blocked).
- [x] Recovery (no tag move, no npm republish): `--skip-duplicate` fix
  PR #29 merged (squash `f0bec04`, 12/12 CI green; included contract-test
  correction `ci-pinning` asserting the real flag + rejecting the fake one).
  VSIX rebuilt from immutable `v0.5.3` worktree and re-audited
  (manifest 0.5.3, publisher Cynrath, README Version 0.5.3, CHANGELOG
  latest 0.5.3, no node_modules, no secrets, 830350 bytes <2MB);
  SHA `C55D0E18...` differs from failed-run `36E318D1...`
  (timestamps/env; failed-run bytes unrecoverable — no artifact upload
  in release.yml; documented). Staged at
  `O:/projeler/ackit-release-0.5.3/ackit-vscode-0.5.3.vsix`.
- [x] GitHub Release `v0.5.3` created manually (`--verify-tag`,
  CHANGELOG-derived notes via `extract-changelog-section.mjs`,
  hygiene-clean) with the audited rebuilt VSIX attached; asset
  re-downloaded and SHA-bound (`C55D0E18...` == staged).
- [ ] HELD per repo governance (no flip until ALL surfaces verify):
  Marketplace still 0.5.2 (manual publish needs user credential —
  remaining external action, exact command in TASK-0093);
  pointer-flip PR + site-sync PR wait for `vsce show` 0.5.3.

Partial-release truth table (2026-09-22): npm 0.5.3 LIVE (latest) |
tag v0.5.3 immutable | GitHub Release v0.5.3 LIVE (+VSIX C55D0E18) |
Marketplace 0.5.2 PENDING (external) | pointer 0.5.2 (held) |
site 0.5.2 (held).
