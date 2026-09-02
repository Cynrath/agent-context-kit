---
id: "TASK-0066"
title: "v0.3.0 release — version coupling, CHANGELOG, README, tag, npm OIDC, VSIX, Action, docs sync, post-release verification"
status: active
schemaVersion: 2
dependencies:
  []
createdAt: "2026-09-02"
completedAt: null
---

## Purpose

Execute the full logical minor release `v0.3.0` of AgentContextKit (workflow, verification, evidence and resumability expansion merged from PR #7 into `master` at squash commit `5b1f4a0be78d6abeb1e2f26583ac608d4251e2de`), per `ADR-0023` coupling (`root npm 0.3.0 == VS Code extension 0.3.0 == tag v0.3.0 == GitHub Release v0.3.0 == Action @v0.3.0`), with tag-triggered OIDC npm publish + GitHub Release, VSIX Marketplace publication under publisher `Cynrath`, GitHub Action tag availability, hosted docs sync, and complete post-release verification across every established first-party channel.

This task carries explicit user authorization (recorded in the release session goal) for: master merge of PR #7 (done — `5b1f4a0`), version bump, CHANGELOG/README release metadata, release commit push to `master`, annotated tag `v0.3.0` creation + push (triggering tag-only `release.yml` npm OIDC publish + GitHub Release), VSIX `0.3.0` Marketplace publish, hosted docs sync, and post-release verification. Prohibited (unchanged): force-push, history rewrite, tag movement/deletion, workflow dispatch, weakening quality gates, Browser Companion (remains PAUSED/excluded).

## Current-state evidence (verified live 2026-09-02)

- PR #7 (`feat: workflow, verification, evidence and resumability expansion`) squash-merged into `master` at `5b1f4a0be78d6abeb1e2f26583ac608d4251e2de` (mergedAt `2026-09-02T09:29:29Z`), 166 files +18,700 lines. Self-approval attempt rejected by GitHub (`Review Can not approve your own pull request`) — recorded as expected behavior; `protect-master` ruleset requires only the 12 status checks, not independent review. Local `master` == `origin/master` == `5b1f4a0` (fast-forward pull verified).
- Pre-merge exact-head validation at `737c0b1`: CI run `33593476396` SUCCESS (12/12 required checks: 6 verify OSxNode, 3 package-smoke, self-scan, extension) + ACKit Action Dogfood run `33593476378` SUCCESS.
- Post-merge master runs at `5b1f4a0`: `ACKit Action Dogfood` run `33614396992` SUCCESS; `CI` run `33614396988` in progress at task creation (must be green before any release step proceeds).
- Current versions: `package.json` `0.2.2`, `extensions/vscode/package.json` `0.2.2` (coupling holds at 0.2.2; both must move to `0.3.0` together).
- CHANGELOG.md `## [Unreleased]` section holds the merged feature line content (workflow engine, intent, checkpoints, evidence v2, verification, drift, policy v2, roles, skills, journal, MCP/SDK additions) — needs conversion to `## [0.3.0] - 2026-09-02` with shipped framing.
- README.md still labels 4 capability rows `(experimental branch)` (Workflows+Intent, Evidence+Verification, Checkpoints+Resume, Drift+Policy v2) — must flip to shipped after merge; limitations (workflow config keys parse-only, advance-gate declaration-based validation, checkpoint non-atomic writes, MCP drift parity divergence, Browser Companion paused) must remain accurately documented.
- `extensions/vscode/README.md` shows `0.2.2` (needs 0.3.0), `extensions/vscode/CHANGELOG.md` lacks a 0.3.0 entry.
- npm registry: `@cynrath/agent-context-kit` latest `0.2.2`; `0.3.0` must be verified absent before tag.
- Tags: `v0.2.2`..`v0.1.0` exist; `v0.3.0` must be verified absent.
- GitHub Releases: `v0.2.2` latest; `v0.3.0` absent.
- Marketplace: `Cynrath.ackit-vscode` latest published `0.2.2`; `0.3.0` must be absent until VSIX publish.
- CI workflow (`.github/workflows/ci.yml` `extension` job) hardcodes extension version `0.2.2` in manifest contract and VSIX filename (`ackit-vscode-0.2.2.vsix`) — must be updated to `0.3.0` in the same synchronized change.
- `tests/contract/readme-parity.test.ts` asserts README contains `v${pkg.version}` badges — dynamic, will pass after synchronized bump; stale `0.2.2` badge check only guards `npm%20v0.2.0`/`release-v0.2.0` (docs/v0.2.0 path exempt).
- Established release sequence source: TASK-0039 (v0.2.2 release) — tag-triggered `release.yml` (validate → frozen install → lint/format/typecheck → build+schemas drift gate → tests → pack+shasum → real-tarball smoke → version-absence → OIDC publish `--provenance` → registry verify → fresh isolated consumer → secondary npx → GitHub Release last, notes from `CHANGELOG.md` `## [0.3.0]` via `scripts/extract-changelog-section.mjs`), then `vsce publish` VSIX, then `sync-ackit-docs.mjs` hosted docs, then global install verify.

## Version decision

- **Chosen version: `0.3.0`** (minor). SemVer rationale: PR #7 adds substantial new backward-compatible capabilities (workflow profiles, intent artifacts, checkpoints/resume, evidence v2, verification bundles/verdicts, drift detection, policy v2, roles, skills projections, journal, MCP tools, SDK surface) with no breaking changes — legacy repositories retain exact pre-expansion behavior (proven by `tests/integration/compat/legacy-repository.test.ts`); task schema stays `schemaVersion 2` (additive frontmatter only). Under ADR-0023 one logical release → all surfaces synchronized to `0.3.0`. No version reserved for Browser Companion (paused, excluded from this release).

## Scope

1. Wait for post-merge master CI run `33614396988` (and Dogfood `33614396992`) at `5b1f4a0` to be green; record exact run IDs/conclusions.
2. Synchronized version bump `0.2.2 → 0.3.0`:
   - `package.json` `version: "0.3.0"` (single source of truth).
   - `extensions/vscode/package.json` `version: "0.3.0"` (coupling).
   - `pnpm-lock.yaml` via `pnpm install` (then `--frozen-lockfile` must pass).
   - `.github/workflows/ci.yml` extension job: manifest contract `0.2.2` → `0.3.0` (2 occurrences: contract assert + VSIX filename ×2).
   - `extensions/vscode/README.md` version `0.2.2` → `0.3.0` (header + Changelog link).
3. CHANGELOG release notes:
   - `CHANGELOG.md`: convert `## [Unreleased]` → `## [0.3.0] - 2026-09-02` with accurate shipped capabilities (workflows, intent, task refs, checkpoints/resume/handoff, task-aware packs, evidence v2, verification bundles/verdicts, completion gates, drift, policy v2 tiers/review, lifecycle gates, roles, skills interoperability, journal, CLI/SDK/MCP additions, schemas, security/offline guarantees, backward compatibility), explicit Browser Companion exclusion, compatibility facts (legacy repos unchanged, no LLM/cloud dependency, MCP read-only boundary), and the 5 material limitations kept visible.
   - `extensions/vscode/CHANGELOG.md`: add `## [0.3.0] - 2026-09-02` (workspace dependency on core 0.3.0, manifest version sync, no extension behavior change beyond version).
4. README post-merge cleanup:
   - Remove `(experimental branch)` from the 4 now-shipped rows (Workflows + Intent, Evidence + Verification, Checkpoints + Resume, Drift + Policy v2).
   - Keep the 5 documented limitations accurate (workflow config keys parse but do not alter gate behavior; advance-gate planning artifact validation declaration-based; checkpoint writes not temp+rename atomic; MCP drift warning/input parity residual divergence; Browser Companion PAUSED/experimental, excluded).
   - Version references `0.2.2` → `0.3.0` (badges, npx examples, Action pin examples, VS Code table, current-status line) while preserving `docs/v0.2.0` historical paths and legacy NuGet notes.
   - Update "not yet published to Marketplace" phrasing if present to reflect established Marketplace presence (0.2.2 published; 0.3.0 publishing in this task).
5. Full pre-release gate matrix on the release-candidate commit (repository scripts):
   - `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm gen:schemas` (+ `git diff --exit-code -- schemas` idempotence), `pnpm build`, `pnpm test`, `pnpm smoke:cli`, `pnpm run smoke:package`, `node scripts/check-offline-egress.mjs`, `node scripts/check-readme-parity.mjs`, `node dist/cli/index.js config check`, `doctor`, `task doctor`, `skills validate`, `instructions`, `scan --ci`, `git diff --check`, `git status`.
   - Extension gates: `pnpm --filter ackit-vscode exec tsc -p tsconfig.json --noEmit`, `tsconfig.test.json --noEmit`, esbuild build, `vsce ls`, `vsce package --no-dependencies --out ackit-vscode-0.3.0.vsix` (<2MB), VSIX audit (no node_modules/secrets/local paths), icon 256×256.
   - Expected baseline: 92 files / 517 tests / scan exit 0 (actual values recorded; may legitimately differ due to release-only docs/tests).
6. Release commit + push (normal fast-forward `master` push), record exact release SHA, wait for all required GitHub Actions on that exact SHA to be green (CI + Dogfood).
7. Tag: verify `v0.3.0` absent, `npm 0.3.0` absent, Release `v0.3.0` absent → create annotated tag `v0.3.0` on the exact release commit → push tag → tag triggers `release.yml` (npm OIDC publish + GitHub Release, strictly ordered).
8. Post-npm verification: `npm view` version/dist-tags/latest/shasum/integrity/attestations, fresh isolated consumer (`mktemp` + unique cache, `ackit --version` == `0.3.0`, `--help` leak-free), secondary `npx` smoke.
9. VS Code Marketplace: `vsce publish --packagePath ackit-vscode-0.3.0.vsix --no-dependencies` under publisher `Cynrath` after npm/GitHub Release green; verify via `vsce show`/Marketplace URL (propagation-aware).
10. GitHub Action channel: `Cynrath/agent-context-kit@v0.3.0` resolvable via new immutable tag (action listing updates on Release; manual UI fallback documented only if needed); verify Action dogfood on master after tag.
11. Hosted docs sync: `node scripts/sync-ackit-docs.mjs --source <repo>` → commit on `Cynrath.github.io` `main` → push → verify live pages describe `0.3.0`.
12. Post-release verification matrix (GitHub / npm / Marketplace / Action / docs) with concrete URLs, run IDs, version numbers; global `ackit` `0.3.0` install smoke.
13. Post-release maintenance task chain: propose separate follow-up tasks (not executed in this release) for the 5 known non-blocking follow-ups.

## Out of scope

- Browser Companion (PAUSED, separate branch, excluded from release, no code merge, no publish, no version reservation).
- `workflow:` config keys → actual gate behavior wiring (follow-up).
- Advance-gate planning artifact disk-existence validation (follow-up).
- Checkpoint temp+rename atomic writes (follow-up).
- MCP drift warning/input parity completion (follow-up).
- Force-push, rebase, tag movement/deletion, `workflow_dispatch`, new distribution channels, new accounts/services.
- Legacy .NET/NuGet line (frozen; `1.0.0-rc.1` immutable).
- Moving/creating major/minor alias (moving) tags — no existing policy establishes one; immutable `v0.3.0` only.

## Dependencies

- TASK-0044..0065 (workflow expansion implementation, all completed pre-merge).
- PR #7 merge (done, `5b1f4a0`).
- Post-merge master CI green at `5b1f4a0` (in progress at plan time).
- ADR-0023 (version coupling), ADR-0025..0028 (feature ADRs, content baseline for notes).
- Previous release execution template: TASK-0039.

## Affected files

- `package.json` (version 0.3.0)
- `extensions/vscode/package.json` (version 0.3.0)
- `pnpm-lock.yaml` (if changed by workspace link version)
- `.github/workflows/ci.yml` (extension job hardcoded 0.2.2 → 0.3.0: manifest contract + VSIX filenames)
- `CHANGELOG.md` (Unreleased → 0.3.0 dated section)
- `extensions/vscode/CHANGELOG.md` (add 0.3.0)
- `extensions/vscode/README.md` (version 0.3.0)
- `README.md` (badges/examples 0.3.0, experimental-branch rows → shipped, limitations kept accurate)
- `docs/tasks/active/TASK-0066-*.md` (this task, evidence)
- Tag `v0.3.0` (annotated, on release commit)
- GitHub Release `v0.3.0` (auto-created by release.yml from CHANGELOG)
- npm `@cynrath/agent-context-kit@0.3.0` (OIDC)
- Marketplace `Cynrath.ackit-vscode` 0.3.0 (VSIX)
- Hosted docs repo `Cynrath.github.io` `main` (sync script output)

## Required tests

- Full gate matrix in Scope §5 (each command exit 0 recorded with counts: lint/format/typecheck/test file+test counts, smoke CLI assertions, package smoke tarball version, parity SHA, offline-egress file count, scan findings count + exit 0, extension typechecks/build/VSIX audit).
- Exact release-SHA CI: `CI` workflow + `ACKit Action Dogfood` success on the release commit before tagging.
- `release.yml` run on tag `v0.3.0`: every step success (validate/frozen/lint/typecheck/build/schemas/tests/pack/smoke/absence/publish/verify/fresh-consumer/npx/release).
- Registry: `npm view @cynrath/agent-context-kit@0.3.0 version` == `0.3.0`, `dist-tags.latest` == `0.3.0`, shasum == recorded pack, integrity + provenance present.
- Fresh isolated consumer install + `ackit --version` == `0.3.0` + leak-free `--help`.
- `gh release view v0.3.0` correct (tag, title, notes body from CHANGELOG section, not draft/prerelease).
- Marketplace: `vsce show Cynrath.ackit-vscode` / Marketplace URL shows 0.3.0 (propagation-aware retry), extension ID/publisher unchanged.
- Action: `Cynrath/agent-context-kit@v0.3.0` usable (tag resolvable; dogfood green on master).
- Docs: live pages describe 0.3.0.
- Global: `ackit --version` == `0.3.0` after `npm install --global`.

## Acceptance criteria

- [ ] Post-merge master CI + Dogfood green at `5b1f4a0` (run IDs recorded)
- [ ] Version coupling synchronized: root == extension == 0.3.0; ci.yml extension contract updated; frozen-lockfile install passes
- [ ] CHANGELOG.md `## [0.3.0] - 2026-09-02` accurate (shipped capabilities, Browser Companion exclusion, compatibility facts, 5 limitations visible); extension CHANGELOG 0.3.0 entry
- [ ] README shipped rows updated (no stale `(experimental branch)` on shipped features), limitations accurate, all version refs 0.3.0 (historical paths preserved), parity test green
- [ ] Full local gate matrix green on release-candidate commit (counts recorded)
- [ ] Release commit pushed; exact-SHA CI + Dogfood green before tag
- [ ] Annotated immutable tag `v0.3.0` on exact release commit; tag-absence verified pre-creation; never moved
- [ ] `release.yml` succeeded: npm 0.3.0 published via OIDC with provenance; `latest` → 0.3.0; shasum/integrity verified; fresh consumer + npx smoke green; GitHub Release v0.3.0 created (notes from CHANGELOG, not draft)
- [ ] VSIX 0.3.0 audited (<2MB, clean contents) and published to Marketplace under `Cynrath`; verified visible
- [ ] Action `@v0.3.0` resolvable; post-tag dogfood green
- [ ] Hosted docs synced and live-describing 0.3.0
- [ ] Global `ackit` 0.3.0 verified
- [ ] Post-release verification matrix all PASS with concrete URLs/IDs
- [ ] Post-release maintenance task chain proposed as separate tasks (not mixed into release)
- [ ] Working tree clean at completion; task completed with evidence; focused conventional commit(s)

## Test steps

1. `gh run list --branch master` — confirm run `33614396988` (CI) and `33614396992` (Dogfood) success at `5b1f4a0`.
2. Apply synchronized version changes (package.json, extension package.json, ci.yml, extension README, CHANGELOGs, README).
3. `pnpm install` → `pnpm install --frozen-lockfile` — lockfile consistent.
4. `pnpm lint && pnpm format:check && pnpm typecheck` — 0 errors.
5. `pnpm gen:schemas && git diff --exit-code -- schemas` — no drift.
6. `pnpm build && node dist/cli/index.js --version` — prints `0.3.0`.
7. `pnpm test` — full suite (expect ≥92 files / ≥517 tests; record actual).
8. `pnpm smoke:cli && pnpm run smoke:package` — CLI + real-tarball consumer smoke.
9. `node scripts/check-offline-egress.mjs && node scripts/check-readme-parity.mjs` — security/parity gates.
10. `node dist/cli/index.js config check && node dist/cli/index.js doctor && node dist/cli/index.js task doctor && node dist/cli/index.js scan --ci` — dogfood gates exit 0.
11. Extension: `pnpm --filter ackit-vscode exec tsc -p tsconfig.json --noEmit` + test config + esbuild + `vsce package --no-dependencies --out ackit-vscode-0.3.0.vsix` + audit.
12. `git diff --check && git status --short` — clean; commit; `git push origin master`; wait CI + Dogfood green on new SHA.
13. Absence checks: `git tag --list v0.3.0` empty, `npm view @cynrath/agent-context-kit@0.3.0` E404, `gh release view v0.3.0` not found, `vsce show` has no 0.3.0.
14. `git tag -a v0.3.0 -m "AgentContextKit v0.3.0" <release-sha> && git push origin v0.3.0` — triggers release.yml; watch run to success.
15. Registry/GitHub verification per Required tests; then `vsce publish` VSIX; then docs sync + push; then global install verify.
16. Post-publish matrix sweep + report.

## Security considerations

- Tag-triggered OIDC Trusted Publishing only (no `NPM_TOKEN`/`NODE_AUTH_TOKEN` secrets; `id-token: write`); tag shape gate `^v\d+\.\d+\.\d+$`; checkout-identity + package-version-name parity enforced in workflow.
- VSIX audit: no `node_modules`, no secrets (`AKIA`/`ghp_`), no absolute local paths, <2MB, icon 256×256.
- npm tarball whitelist (`dist`, `templates`, `schemas`, `README.md`, `CHANGELOG.md`, `LICENSE`); README parity SHA recorded; no secrets/local paths in packed artifacts.
- Offline-egress invariant unchanged (no network/telemetry in product code); extension offline audit stays in CI.
- No absolute machine paths or secret values in task evidence or release notes.

## Risks

- Post-merge CI at `5b1f4a0` fails → do not proceed to any release step; diagnose, task-first fix, re-run matrix (merge itself stays).
- `npx` cache stale after publish → fresh isolated consumer is the hard gate (established design; npx is best-effort).
- Marketplace propagation delay → verify with bounded retries; retry-publish proof ("already exists") as fallback evidence.
- README parity test expects `v${pkg.version}` dynamically — synchronized bump required before tests run.
- ci.yml extension contract hardcodes version — missing update fails CI extension job (good gate; must be updated in same change).
- Version-absence gate refuses republish if 0.3.0 somehow exists → diagnose rather than overwrite; never mutate published versions.
- Docs sync script requires docs-source paths present post-merge — verify script runs on master content before pushing docs repo.

## Rollback plan

- Before tag: `git revert`/`git checkout HEAD --` the release-prep files (package.json, extension package.json, ci.yml, CHANGELOGs, READMEs) — no public artifact exists yet.
- After tag push but before release.yml success: tag is immutable once pushed; never move/delete. If release.yml fails pre-publish, npm stays absent — fix forward on master, re-release as new version if needed.
- After npm publish: never republish same version; any defect → new patch release (0.3.1) per controlled-release governance.
- Marketplace/docs out of sync after partial failure: publish missing channel, re-verify; never rewrite published immutable history.

## Completion notes

(plan; execution evidence recorded below as steps complete)
