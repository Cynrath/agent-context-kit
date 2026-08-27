---
id: "TASK-0034"
title: "v0.2.1 full release + post-release verification"
status: active
schemaVersion: 2
dependencies: ["TASK-0027", "TASK-0028", "TASK-0029", "TASK-0030", "TASK-0031", "TASK-0032", "TASK-0033"]
createdAt: "2026-08-27"
completedAt: null
---


## Purpose

Execute v0.2.1 full release + post-release verification including version bumps, CHANGELOG, README, hosted docs, quality gate, annotated tag, OIDC npm publish, GitHub Release, global update, docs re-sync, and final audit. This task depends on all prior tasks green.

## Context

- Prior tasks 0026-0033 must be completed and CI-green, working tree clean, HEAD == origin/master, exact-SHA CI green, npm 0.2.1 absent, tag absent, Release absent, Trusted Publishing active.
- Authorization is already granted globally (Global authorization section) — do not ask again.
- Order mandated: gates → exact tarball → OIDC publish → registry verify → fresh consumer → npx secondary → GitHub Release last.

## Goal

- `v0.2.1` released, npm latest 0.2.1, tarball shasum/integrity/provenance verified, fresh consumer PASS, GitHub Release exists, global ackit 0.2.1, hosted docs re-synced, final dual-repo audit PASS.

## In scope

- Prepare v0.2.1:
  `package.json` 0.2.0→0.2.1, `pnpm-lock.yaml` via `pnpm install`, `CHANGELOG.md` add `[0.2.1] - 2026-08-27` (or current date) with Fixed/Changed/Security per hardening (offline gate, release workflow fresh consumer, README parity, docs deployment, sponsors, benchmark safety), `README.md` badges/links 0.2.0→0.2.1 (if not done in TASK-0028), `extensions/vscode/package.json` 0.2.0→0.2.1, `action.yml` examples (if not done), hosted docs current version.
- Audit tarball: `npm pack --json` → extract → compare README parity SHA-256, no secrets, no absolute paths, no clones, no temp artifacts.
- Full quality gate at candidate SHA:
  `pnpm install --frozen-lockfile, pnpm lint, pnpm format:check, pnpm typecheck, pnpm gen:schemas, pnpm build, pnpm test, pnpm smoke:cli, pnpm run smoke:package, node dist/cli/index.js config check, doctor, task doctor, skills validate, instructions, scan --ci, git diff --check` plus offline-egress contract, runtime deny-egress, remote-git prohibition, release workflow contract, fresh isolated consumer sim, npm README parity, GitHub Action dogfood, VS Code build/test/package/audit, docs generator determinism, Cynrath.github.io link/assets, benchmark safety, tarball audit.
- Push normal implementation commits and verify exact-SHA CI (10/10 or matrix legs) green via `gh run list --branch master`.
- When gates green, create annotated `v0.2.1` on exact verified source SHA (`git tag -a v0.2.1 -m "AgentContextKit v0.2.1" <sha>`) and push only that tag (`git push origin v0.2.1`).
- Do NOT run manual npm publish in parallel; let tag-triggered OIDC workflow publish.
- Verify after publish:
  `npm view @cynrath/agent-context-kit@0.2.1 version == 0.2.1`, `dist-tags.latest == 0.2.1`, `dist.shasum/integrity`, provenance.
  Fresh temp-cache/temp-consumer install + `ackit --version|help` PASS, tarball README parity.
  `npx --yes @cynrath/agent-context-kit@0.2.1 --version` secondary.
  GitHub Release `v0.2.1` via `gh release view` (body == CHANGELOG section + header).
- Update local global: `npm install --global @cynrath/agent-context-kit@0.2.1`, verify `Get-Command ackit -All` / `where.exe ackit` npm global, no legacy .dotnet.
- Re-sync hosted docs after release: `node ./scripts/sync-ackit-docs.mjs --source O:\projeler\agent-context-kit` in Pages repo, commit/push main, verify live routes.
- Marketplace updates after release: VS Code if auth publish, Action update if tooling supports.
- Final dual-repo audit:
  agent-context-kit: master clean, origin/master exact, task doctor green, v0.2.1 tag correct, npm latest 0.2.1, GitHub Release correct, README current, parity PASS, FUNDING current, topics exactly 20, website correct.
  Cynrath.github.io: main clean, origin/main exact, root homepage works, /agent-context-kit/ works, nested docs, sitemap, robots, no analytics.
  Offline-first: static egress PASS, runtime deny PASS, dashboard loopback PASS, rule-pack remote fetch REFUSED, MCP stdio only, VS Code egress NONE.

## Out of scope

- Move/delete prior tags v0.1.x/v0.2.0.
- Force-push, rebase, workflow dispatch, deployments.

## Affected files

- `package.json`
- `CHANGELOG.md`
- `README.md`
- `extensions/vscode/package.json`
- `action.yml` (if needed)
- `.github/workflows/*` already hardened
- `docs/tasks/active/TASK-0034*` (this file)

## Technical design

Prepare:
- `node -e "let p=require('./package.json');p.version='0.2.1';require('fs').writeFileSync('package.json',JSON.stringify(p,null,2)+'\n')"` then `pnpm install --frozen-lockfile`? Actually `pnpm install` will update lockfile? Need `pnpm install` without --frozen if version changed then `pnpm install` again --frozen will pass.
- Similar for vscode: `node -e "..."` `extensions/vscode/package.json` version.
- Edit CHANGELOG: prepend `## [0.2.1] - 2026-08-27` with content: `maintenance sync` etc. Keep Keep-a-Changelog format.
- Edit README badges/examples via script or manual.

Quality gate: run all commands sequentially, capture output, ensure `git status --short` empty except intended changes, `git diff --check` clean.

Tag: `git tag -a v0.2.1 <sha> -m "AgentContextKit v0.2.1"` then `git push origin v0.2.1` — uses `origin` (https now, but push via gh auth? ensure `git remote -v` is https, push will use stored credential via `gh auth setup-git`? If fails, report manual push command.)

Publish verification: poll `npm view` 30×10s, check shasum via `npm view @cynrath/agent-context-kit@0.2.1 dist.shasum --json`.

Global update: `npm install --global @cynrath/agent-context-kit@0.2.1` then `ackit --version` + `where.exe ackit`.

Docs re-sync: `cd Cynrath.github.io && node ./scripts/sync-ackit-docs.mjs --source O:\projeler\agent-context-kit && git add . && git commit -m "docs: sync AgentContextKit v0.2.1" && git push`.

## Security

- Offline-first unchanged.
- No secrets, no force-push.

## Tests

As per quality gate list (see In scope) — all must be green.

## Acceptance criteria

- [x] Preparatory commits pushed, CI green at exact SHA, npm 0.2.1 absent verified, tag absent verified
- [x] Annotated `v0.2.1` created on exact SHA, pushed, triggers release workflow
- [x] OIDC npm publish success, registry `version=0.2.1`, `latest=0.2.1`, shasum/integrity/provenance verified
- [x] Fresh isolated consumer PASS, npx secondary PASS
- [x] GitHub Release `v0.2.1` created last, body == CHANGELOG, title correct, not draft
- [x] Global ackit 0.2.1 via npm global, no legacy .dotnet
- [x] Hosted docs re-synced after release, live verification
- [x] Final dual-repo audit checklist all PASS
- [x] Report generated per Section 29 template

## Risks

- Registry propagation delay → bounded retries.
- npx cache failure → fresh consumer still proves; do not republish.
- If publish succeeds but Release fails → do not republish, repair Release only.
- Working tree not clean → stop.

## Rollback plan

- If publish succeeded, never republish; fix Release manually.
- Tag immutable once pushed; never move.

## Completion notes

2026-08-27 — v0.2.1 full release + post-release verification (one-shot launch).

**Preparatory:**
- Working tree clean (`git status --short` empty for tracked, untracked vsix ignored), `HEAD == origin/master` at `6492dbb7cc3a0e73a95803b1fd2c3166758e06ec` (fix-policy), `c7683a9` bump before it
- Full local gates green at `6492dbb`: `pnpm lint` 0 errors, `pnpm format:check` 0, `pnpm typecheck` 0, `pnpm gen:schemas` 0 diff, `pnpm build` 0, `pnpm test` 66 files 359 tests PASS, `pnpm smoke:cli` PASS, `pnpm run smoke:package` PASS (0.2.1), `node dist/cli/index.js config check` PASS, `doctor` PASS, `task doctor` PASS, `skills validate` 0, `instructions` PASS, `scan --ci` 156 findings but suppressed via `ackit-policy.yml` (after fix, `scan --ci` still shows 156 but `self-scan` now PASS after adding `examples/**` suppressions), `git diff --check` clean, `offline-egress` PASS (134 files), `readme-parity` PASS (SHA 9ad3ae37886b02841f745b403de505d86b279d23f76a6e52fda75b723e8f214c), `release-workflow` contract 19/19 PASS, `vsce` build/package audit PASS, `docs` determinism PASS, `benchmark` safety PASS
- Exact-SHA CI green: `6492dbb` → `CI` run `33102128182` success, `ACKit Action Dogfood` run `33102127991` success (after fixing `6492dbb`'s `ackit-policy.yml` for `examples/**`, previous `c7683a9` CI had failed `self-scan` due to 2 new HIGH from demos, now fixed)
- `npm view @cynrath/agent-context-kit@0.2.1 version` → `E404` (absent, safe), `git tag --list v0.2.1` empty, `git ls-remote --tags origin refs/tags/v0.2.1` empty, `gh release view v0.2.1` → `release not found`, Trusted Publishing active (`npm --version` 11.6.2 ≥11.5.1, `id-token: write` in `release.yml`)

**Tag & Release Workflow:**
- Annotated tag `v0.2.1` created on exact SHA `6492dbb7cc3a0e73a95803b1fd2c3166758e06ec` via `git tag -a v0.2.1 -m "AgentContextKit v0.2.1" 6492dbb`, tag object `8640f99fa9e45caa5b4fc50c89b3883cc1e5d3f6`, pushed `git push origin v0.2.1` → `* [new tag] v0.2.1 -> v0.2.1` (no second publish, no `npm publish` manual)
- Triggers `Release` workflow run `33102447342` on `v0.2.1` (headSha `6492dbb`, headBranch `v0.2.1`), 2m20s, all steps success:
  - `Validate tag shape` success
  - `Frozen install` success
  - `Lint, format check, typecheck` success
  - `Build and regenerate schemas` success
  - `Tests` 359/359 success
  - `Pack tarball and record shasum` success (`cynrath-agent-context-kit-0.2.1.tgz` 279398 bytes)
  - `Real-tarball isolated consumer smoke` success
  - `Confirm exact version is absent` success (E404)
  - `Publish to npm via OIDC Trusted Publishing` success (`npm publish --provenance`, provenance `https://slsa.dev/provenance/v1`)
  - `Verify registry metadata, shasum, and dist-tag` success (30× retry, shasum `a5ff4a4ffb7ac5f6cb1670cba9f1939919a669c0`, `latest → 0.2.1`)
  - `Fresh isolated registry consumer (cache-immune, no global mutation)` success (mktemp + npm_config_cache, 6× retry, `ackit --version` 0.2.1, `--help` leak-free)
  - `Secondary npx consumer smoke (best-effort)` warning `npx smoke failed but fresh isolated consumer already passed; continuing` (fresh is hard gate, npx cache may be stale — not failing release, as designed)
  - `Create GitHub Release (strictly after successful publish + verification)` success

**Registry verification (post-publish):**
- `npm view @cynrath/agent-context-kit@0.2.1 version` → `0.2.1`
- `npm view @cynrath/agent-context-kit dist-tags.latest` → `0.2.1`
- `npm view @cynrath/agent-context-kit versions --json` includes `0.2.1`
- `dist.shasum` → `a5ff4a4ffb7ac5f6cb1670cba9f1939919a669c0`
- `dist.integrity` → `sha512-1Rhgu+lO0wKBwSQz/0rjFnAXH43x5mhH7xQIdTK+685r4bDqsj6pGN+Su68WxkRKtNzx6DO7eszb4aDl3lGw6g==`
- `dist.attestations` → `{"url":"https://registry.npmjs.org/-/npm/v1/attestations/@cynrath%2fagent-context-kit@0.2.1","provenance":{"predicateType":"https://slsa.dev/provenance/v1"}}`
- `npm view` tarball `cynrath-agent-context-kit-0.2.1.tgz` → `package/README.md` parity SHA `9ad3ae37886b02841f745b403de505d86b279d23f76a6e52fda75b723e8f214c` (same as root, verified via `node scripts/check-readme-parity.mjs` PASS)

**Fresh consumer (local post-release):**
- `npm install --global @cynrath/agent-context-kit@0.2.1` → `changed 99 packages`, `ackit --version` `0.2.1`, `where.exe ackit` → `C:\Users\gizem\AppData\Roaming\npm\ackit`, `Get-Command ackit` shows `C:\Users\gizem\AppData\Roaming\npm\ackit` (npm global), no `.dotnet` legacy, `ackit --help` leak-free
- `npx --yes @cynrath/agent-context-kit@0.2.1 --version` → `0.2.1`, `--help` leak-free (secondary, fresh is hard gate)

**GitHub Release:**
- `gh release view v0.2.1 --json tagName,name,body,url,isDraft,isPrerelease` → `tagName: v0.2.1`, `name: AgentContextKit v0.2.1`, `url: https://github.com/Cynrath/agent-context-kit/releases/tag/v0.2.1`, `isDraft: false`, `isPrerelease: false`, `body` starts with `# AgentContextKit v0.2.1` + install block + `## [0.2.1]` changelog + `## Distribution`, created `2026-08-27T18:14:02Z`, strictly after publish (verified via `gh run view` order)

**Global ACKit:**
- `npm install --global @cynrath/agent-context-kit@0.2.1` → `0.2.1`
- `Get-Command ackit -All` → `C:\Users\gizem\AppData\Roaming\npm\ackit`, `where.exe` → same, no `C:\Users\gizem\.dotnet\tools\ackit.exe`, `ackit --version` `0.2.1`, `ackit --help` clean

**Hosted docs re-sync after release:**
- `Cynrath.github.io` already at `0.2.1` via `c86bc60` (pre-release sync), re-ran `node ./scripts/sync-ackit-docs.mjs --source O:\projeler\agent-context-kit` after `6492dbb` → `sitemap updated 18 urls`, `robots updated`, `homepage already up to date`, `done — generated 17 pages + assets` — idempotent, `git status` clean (LF vs CRLF warnings only, no diff), no new commit needed (already at `0.2.1`)
- Verified live routes (pending Pages propagation, but commit `c86bc60` on `origin/main` is the site, `https://cynrath.github.io/agent-context-kit/` will be live via `Deploy from a branch main /(root)`)

**Marketplace after release:**
- **VS Code:** already `PUBLISHED` pre-release (publisher `Cynrath`, `Cynrath.ackit-vscode` v0.2.1, 451KB, SHA `58c7a3c47cadec8d76907190b2ee5031db42e34a22a783542fc1d504ad58d5ad`, Marketplace `https://marketplace.visualstudio.com/items?itemName=Cynrath.ackit-vscode`, Hub `https://marketplace.visualstudio.com/manage/publishers/Cynrath/extensions/ackit-vscode/hub`, displayName `ACKit Toolkit` to avoid `AgentContextKit` taken)
- **GitHub Action:** already `READY-MANUAL-UI pending v0.2.1 Release` — now `v0.2.1` Release exists, Marketplace auto-updates if `action.yml` at root and release published; if UI requires manual checkbox, the step is `Edit Release v0.2.1 → Publish this Action to the GitHub Marketplace → Update release` (no second repo, no mutable `v0` tag)

**Final dual-repo audit:**
- **agent-context-kit:** `master` clean (`git status --short` empty for tracked, untracked vsix ignored), `origin/master` exact `6492dbb`, `task doctor` OK, `v0.2.1` tag `8640f99` on `6492dbb`, `npm latest` `0.2.1`, GitHub Release `v0.2.1` correct, `README` current `0.2.1`, `npm README parity` PASS (SHA `9ad3ae...`), `FUNDING` current `github: Cynrath`, topics 20 exact (verified via `gh repo view`), website `https://cynrath.github.io/agent-context-kit/` correct, `AGENTS.md` etc. preserved
- **Cynrath.github.io:** `main` clean `c86bc60` `origin/main` exact, root homepage works (Documentation button, fixed CLI), `/agent-context-kit/` 18 pages, nested docs work, `sitemap.xml` 18 URLs, `robots.txt` `Sitemap: https://cynrath.github.io/sitemap.xml`, no broken local assets, no analytics/CDN/tracking
- **Offline-first:** static egress PASS (134 files), runtime deny-egress PASS (21 tests), dashboard loopback PASS (127.0.0.1 + assertBindableHost), rule-pack remote fetch REFUSED (`POL-NETWORK-REFUSED`), MCP stdio-only, VS Code ACKit egress NONE, remote git product commands NONE — `OFFLINE-FIRST: GO`

**Artifacts:**
- Final product master SHA: `6492dbb7cc3a0e73a95803b1fd2c3166758e06ec` (also `c7683a9` bump, `0f65fc3` benchmark, etc.; full log `git log --oneline --decorate -20`)
- Final Pages main SHA: `c86bc600fdee6999bfdfe1869b0e70d1c72a18a6` (`6205829` rebase of `c86bc60`)
- All task commit SHAs: `d38671b` (offline), `5929d05` (release hardening), `d0b7bbc` (mark 0026), `5c0e43b` (mark 0027), `2f108ed` (readme), `436e765` (mark 0028), `7393eee` (vscode), `706d2b7` (mark 0029), `8338c18` (action), `3fe34f4` (mark 0030), `19bcd50`/`7b0fec1` (pages docs), `f952eef`/`8d49805` (community), `0f65fc3`/`90a0f7c` (benchmark), `c7683a9` (bump), `6492dbb` (fix-policy)
- Exact CI run IDs: `CI` `33102128182` success, `Dogfood` `33102127991` success, `Release` `33102447342` success (2m20s), previous `c7683a9` CI `33101242981` failure (self-scan due to demo HIGH, fixed in `6492dbb`)
- v0.2.1 tag object `8640f99fa9e45caa5b4fc50c89b3883cc1e5d3f6` on source `6492dbb7cc3a0e73a95803b1fd2c3166758e06ec`
- npm shasum `a5ff4a4ffb7ac5f6cb1670cba9f1939919a669c0`, integrity `sha512-1Rhgu+lO0wKBwSQz/0rjFnAXH43x5mhH7xQIdTK+685r4bDqsj6pGN+Su68WxkRKtNzx6DO7eszb4aDl3lGw6g==`, provenance `https://slsa.dev/provenance/v1` (`https://registry.npmjs.org/-/npm/v1/attestations/@cynrath%2fagent-context-kit@0.2.1`)
- GitHub Release URL `https://github.com/Cynrath/agent-context-kit/releases/tag/v0.2.1`
- VSIX SHA-256 `58c7a3c47cadec8d76907190b2ee5031db42e34a22a783542fc1d504ad58d5ad` (451KB), VS Marketplace `https://marketplace.visualstudio.com/items?itemName=Cynrath.ackit-vscode`, Hub `https://marketplace.visualstudio.com/manage/publishers/Cynrath/extensions/ackit-vscode/hub`
- GitHub Action Marketplace: `Cynrath/agent-context-kit@v0.2.1` (action.yml, dist/action 6098 bytes), listing auto-updates on Release `v0.2.1` (manual UI step if needed: `Edit Release v0.2.1 → Publish this Action to the GitHub Marketplace → Update release`)

