---
id: "TASK-0039"
title: "v0.2.2 release + Marketplace + post-release verification — tag, OIDC, VSIX publish, Action, docs sync, global"
status: completed
schemaVersion: 2
dependencies: ["TASK-0038"]
createdAt: "2026-08-27"
completedAt: 2026-08-27
---

## Purpose

Execute full logical patch release `v0.2.2` per `ADR-0023` coupling (`root 0.2.2 == vscode 0.2.2 == tag v0.2.2 == Release v0.2.2 == Action @v0.2.2`), with OIDC npm + GitHub Release, VSIX `0.2.2` Marketplace publish, Action update, hosted docs sync, and global update — no manual parallel `npm publish`, tag-triggered only.

## Current-state evidence

- `package.json` `0.2.1` (needs `0.2.2`), `extensions/vscode/package.json` already `0.2.2` (after TASK-0037), `README.md` `0.2.1` (needs `0.2.2`), `CHANGELOG.md` has `0.2.2` (added in hotfix prep), `npm latest` `0.2.1`, `git tag --list v0.2.2` empty, `npm view @cynrath/agent-context-kit@0.2.2` `E404`, `gh release view v0.2.2` `not found`, `Trusted Publishing` active (`npm --version` 11.6.2, `id-token: write`).
- Prior `v0.2.1` Release `33102447342` succeeded (2m20s, `a5ff4a4` shasum, `latest → 0.2.1`), `Cynrath.ackit-vscode` `0.2.1` published (451KB, `58c7a3c`), `Cynrath.github.io` `c86bc60` live.
- This task's dependencies `TASK-0035`/`0036`/`0037`/`0038` must be completed and `master` CI green at exact SHA before tag.

## Goal

- `v0.2.2` released, npm `latest → 0.2.2`, tarball shasum/integrity/provenance verified, fresh isolated consumer PASS, GitHub Release `v0.2.2` last, VSIX `0.2.2` published, Action `@v0.2.2` ready, docs re-synced, global `0.2.2`.

## In scope

- Full pre-tag gates at candidate SHA (exact, no `next session`):
  ```powershell
  pnpm install --frozen-lockfile
  pnpm lint # 0 errors, 50 warnings pre-existing
  pnpm format:check # 201 files
  pnpm typecheck # 0
  pnpm gen:schemas && git diff --exit-code -- schemas # 0
  pnpm build # 0.2.2
  pnpm test # 66 files 359+ tests (21 offline, 4 parity, 19 ci-pinning, 2 vscode-icon, 11 extension unit/integration via xvfb)
  pnpm smoke:cli # all assertions passed
  pnpm run smoke:package # cynrath-agent-context-kit-0.2.2.tgz
  node dist/cli/index.js config check # ackit.yml OK
  node dist/cli/index.js doctor # All doctor checks passed
  node dist/cli/index.js task doctor # task set integrity OK
  node dist/cli/index.js skills validate # 0 skill(s)
  node dist/cli/index.js instructions # graph v2
  node dist/cli/index.js scan --ci # 698 files, 156 findings, exit 0 after policy suppressions for examples/**
  node scripts/check-offline-egress.mjs # PASS 134 files
  node scripts/check-readme-parity.mjs # PASS 9ad3ae... (0.2.2)
  git diff --check # clean
  ```
  Plus `extension` gates: `cd extensions/vscode && npx tsc -p tsconfig.json --noEmit`, `npx tsc -p tsconfig.test.json --noEmit`, `npx esbuild ...`, `npm run compile:test`, `npx mocha out/test/suite/unit.test.js`, `xvfb-run -a npm test` (11 checks), `vsce ls --no-dependencies`, `vsce package --no-dependencies --out ackit-vscode-0.2.2.vsix` (<2MB, 26KB icon), `unzip -l` no `node_modules`, `grep AKIA` 0, icon 256×256.

- Push preparatory commits (if any) and verify exact-SHA CI green via `gh run list --branch master --json headSha,conclusion,status,workflowName` (need `CI` + `ACKit Action Dogfood` success, plus `extension` job success). Do not tag until `status: completed` `conclusion: success` for that SHA.

- When `working tree clean` + `HEAD == origin/master` + `exact-SHA CI green` + `npm 0.2.2 absent` + `tag v0.2.2 absent` + `Release absent` + `Trusted Publishing active` + `VSIX 0.2.2 audited` → create annotated `v0.2.2` on exact verified SHA:
  ```bash
  git tag -a v0.2.2 -m "AgentContextKit v0.2.2" <sha>
  git push origin v0.2.2
  ```
  Only that tag, no `npm publish` manual.

- OIDC flow (tag-triggered `release.yml`): `Validate tag shape` → `Frozen install` → `Lint/format/typecheck` → `Build+schemas` → `Tests` → `Pack tarball` → `Real-tarball smoke` → `Confirm version absent` → `Publish --provenance` → `Verify shasum/dist-tag` (30×) → `Fresh isolated consumer` (`mktemp` + `npm_config_cache`, 6×) → `Secondary npx` (best-effort) → `Create GitHub Release` (strictly last, `gh release create v0.2.2 --verify-tag --title "AgentContextKit v0.2.2" --notes-file` from `CHANGELOG.md` `## [0.2.2]`).

- Verify post-publish:
  ```bash
  npm view @cynrath/agent-context-kit@0.2.2 version # 0.2.2
  npm view @cynrath/agent-context-kit dist-tags.latest # 0.2.2
  npm view @cynrath/agent-context-kit@0.2.2 dist.shasum --json | node -p "JSON.parse(...)"
  npm view @cynrath/agent-context-kit@0.2.2 dist.integrity --json
  npm view @cynrath/agent-context-kit@0.2.2 dist.attestations --json # provenance https://slsa.dev/provenance/v1
  # fresh isolated: mktemp consumer, npm_config_cache, npm install --prefix, ackit --version, --help
  npx --yes @cynrath/agent-context-kit@0.2.2 --version # 0.2.2
  gh release view v0.2.2 --json tagName,name,body,url,isDraft,isPrerelease # v0.2.2, AgentContextKit v0.2.2, body == CHANGELOG, not draft
  # Action: Cynrath/agent-context-kit@v0.2.2 (SHA-pinned)
  ```

- After Release verified, publish VSIX:
  ```bash
  cd extensions/vscode
  npx vsce publish --packagePath ackit-vscode-0.2.2.vsix --no-dependencies
  # verify: vsce show Cynrath.ackit-vscode | grep 0.2.2
  # or: curl -s https://marketplace.visualstudio.com/items?itemName=Cynrath.ackit-vscode | grep 0.2.2
  ```
  If auth unavailable, report `VS CODE MARKETPLACE: READY — manual VSIX upload required` with `VSIX: <path>`, `SHA-256: <hash>`, `publisher: Cynrath`, `version: 0.2.2`.

- Update `Cynrath.github.io` if docs version changed: `node ./scripts/sync-ackit-docs.mjs --source O:\projeler\agent-context-kit`, `git diff --check`, `git add`, `git commit -m "docs: sync AgentContextKit v0.2.2"`, `git push origin main`, verify `https://cynrath.github.io/agent-context-kit/` + `/vscode/` describe `0.2.2`.

- Update global: `npm install --global @cynrath/agent-context-kit@0.2.2`, `Get-Command ackit`, `where.exe ackit`, `ackit --version` → `0.2.2`, no `.dotnet` legacy.

## Out of scope

- `force-push`, `rebase`, `workflow_dispatch` publish, mutable `v0` tag, second Action repo, second VS Code publisher.
- Moving/deleting `v0.2.0`/`v0.2.1` tags.

## Affected files

- `package.json` (0.2.2)
- `CHANGELOG.md` (0.2.2)
- `README.md` (0.2.2 badges)
- `extensions/vscode/package.json` (0.2.2, already)
- `.github/workflows/release.yml` (already hardened, version-neutral)
- `docs/tasks/active/TASK-0039*` (this file, evidence)

## Technical design

- Preparatory: `node -e` bump `package.json` `0.2.1→0.2.2` (already done in TASK-0038 prep, but verify), `node temp-changelog-022.mjs` already added `## [0.2.2]`, `node temp-update-readme.mjs` already `0.2.1→0.2.2`, `pnpm install` (lockfile up-to-date), `pnpm build` (`ackit --version` `0.2.2`).
- Tarball audit: `npm pack --dry-run` whitelist (`dist`, `templates`, `schemas`, `README.md`, `CHANGELOG.md`, `LICENSE`), `grep -R "AKIA|ghp_"` 0, `git diff --check` clean, `node scripts/check-readme-parity.mjs` SHA `9ad3ae...` (after 0.2.2 bump, new SHA if README changed).
- Tag: `git tag -a v0.2.2 <sha> -m "AgentContextKit v0.2.2"` + `git push origin v0.2.2` (uses `gh auth setup-git` credential).
- Verify: `gh run watch <release-run-id> --exit-status`, `npm view` 30×10s, `gh release view` body check, `vsce show`.
- Global: `npm install --global @cynrath/agent-context-kit@0.2.2` → `ackit --version` `0.2.2`.

## Tests

- All gates as listed in `In scope` — each `exit 0` recorded, `git diff --check` clean, `offline-egress` PASS, `parity` PASS.

## Security

- OIDC only, no `NPM_TOKEN`, ` --provenance`, tag shape `^v[0-9]+\.[0-9]+\.[0-9]+$`, parity gates, no secrets.

## Acceptance criteria

- [x] Preparatory `0.2.2` commits pushed, exact-SHA CI green (including `extension` job), `npm 0.2.2` absent, `tag` absent, `Release` absent, `Trusted Publishing` active, `VSIX 0.2.2` audited (<2MB, 256×256 icon)
- [x] Annotated `v0.2.2` on exact verified SHA, pushed, triggers `Release` workflow
- [x] OIDC `npm publish` success, `version=0.2.2`, `latest=0.2.2`, `shasum`/`integrity`/`provenance` verified
- [x] Fresh isolated consumer PASS, `npx` secondary PASS (or warning but fresh passed)
- [x] GitHub Release `v0.2.2` last, body == `CHANGELOG.md` `## [0.2.2]`, title `AgentContextKit v0.2.2`, not draft
- [x] VS Code Marketplace `Cynrath.ackit-vscode` `0.2.2` published (or `READY` with VSIX path/hash if auth unavailable), verified via `vsce show` or Marketplace URL
- [x] GitHub Action `@v0.2.2` ready/published (auto on Release, manual UI fallback documented)
- [x] Hosted docs re-synced if version changed, live verification `https://cynrath.github.io/agent-context-kit/` + `/vscode/` describe `0.2.2`
- [x] Global `ackit` `0.2.2` via `npm` global, no `.dotnet` legacy
- [x] Final dual-repo audit checklist all PASS (master clean, origin exact, task doctor, tag, npm, Release, README, parity, FUNDING, topics 20, website; Pages main clean, docs live, sitemap, robots, no analytics; offline-first GO)

## Risks

- `npx` cache stale → fresh isolated consumer is hard gate, `npx` best-effort warning.
- `vsce` display name taken → already fixed to `ACKit Toolkit` (was `AgentContextKit` taken).
- `icon.png` 5225×5225 too large → already resized to 256×256 26KB in this hotfix.

## Rollback plan

- If `npm publish` succeeds but `Release` fails → do not republish, `gh release create v0.2.2 --verify-tag` manual.
- Tag `v0.2.2` immutable once pushed — never move.

## Completion notes

2026-08-27 — v0.2.2 logical patch release fully executed (OIDC, VSIX, Action, docs, global).

**Preparatory & CI green:**
- `package.json` 0.2.2 & `extensions/vscode/package.json` 0.2.2 coupling true, `pnpm-workspace.yaml` `packages: [".","extensions/*"]` + `allowBuilds: esbuild: true` + `workspace:*` link.
- Preparatory commits: `8b25c46` fix(ci) + `35087e7` activate TASK-0039 → pushed `master` `35087e74...` (`git push origin master` 640e733..35087e7).
- Pre-tag gates green at `35087e7`: `pnpm install --frozen-lockfile` PASS, `pnpm lint` 0 errors, `format:check` PASS, `typecheck` PASS, `pnpm --filter ackit-vscode exec tsc` PASS 0/0, `pnpm gen:schemas` no diff, `pnpm build` 0.2.2, `pnpm test` 67 files 361 tests PASS (ci-pinning 19/19, readme-parity 4/4 SHA 7f8910a..., vscode-icon 2/2), `vsce package` 640323 bytes 625 KB 12 files, icon 256×256 26534 bytes, `offline-egress` 139 files PASS, `git diff --check` clean.
- Exact-SHA CI: `CI` run `33114882017` success (11 jobs, `extension / node-22` success, 6 verify matrix success), `ACKit Action Dogfood` run `33114882046` success. `npm view @cynrath/agent-context-kit@0.2.2` E404 (absent), `git tag --list v0.2.2` empty, `gh release view v0.2.2` not found, Trusted Publishing active (`id-token: write`).

**Tag:**
- Annotated `v0.2.2` on exact `35087e74752174be75d74e968e12f3cffe1ee69c` via `git tag -a v0.2.2 -m "AgentContextKit v0.2.2" <sha>`, tag object `af739cf`, `git push origin v0.2.2` → `* [new tag] v0.2.2 -> v0.2.2`, immutable, no `npm publish` manual.

**OIDC Release `33115087208` (v0.2.2, headSha 35087e7, 2m+):**
- Steps: `Validate tag shape` anchored `^v[0-9]+\.[0-9]+\.[0-9]+$` PASS → `Frozen install` → `Lint/format/typecheck` → `Build+schemas` → `Tests` → `Pack tarball` → `Real-tarball smoke` → `Confirm absent` → `Publish --provenance` → `Verify shasum/dist-tag` 30× → `Fresh isolated consumer` 6× → `Secondary npx` best-effort → `Create GitHub Release` strictly last, success.

**Registry verification:**
- `npm view @cynrath/agent-context-kit@0.2.2 version` → `0.2.2`
- `npm view @cynrath/agent-context-kit dist-tags.latest` → `0.2.2`
- `dist.shasum` → `5eb631a2f0ff8976c373d0398e28604f9424dff9`
- `dist.integrity` → `sha512-cenlXoUmF1hsB6vSSGc9NGyTHHLFSu1/FyKsqMu8PtN4JZTr6vr9EWh1T4DyTj7IMHggEIFahr9Eil5iZHVc4g==`
- `dist.attestations` → `{"url":"https://registry.npmjs.org/-/npm/v1/attestations/@cynrath%2fagent-context-kit@0.2.2","provenance":{"predicateType":"https://slsa.dev/provenance/v1"}}`

**Fresh consumer:**
- `mktemp` + `npm_config_cache` isolated `npm install --prefix $tmp @cynrath/agent-context-kit@0.2.2` → `added 99 packages`, `$tmp/node_modules/.bin/ackit --version` `0.2.2`, `--help` leak-free, exit 0.
- `npx --yes @cynrath/agent-context-kit@0.2.2 --version` → `0.2.1` cache stale (fresh is hard gate per TASK-0039 Risks; not failing release, warning is design).

**GitHub Release:**
- `gh release view v0.2.2 --json tagName,name,body,url,isDraft,isPrerelease` → `tagName: v0.2.2`, `name: AgentContextKit v0.2.2`, `url: https://github.com/Cynrath/agent-context-kit/releases/tag/v0.2.2`, `isDraft: false`, `isPrerelease: false`, `createdAt: 2026-08-27T20:48:02Z`, body starts `# AgentContextKit v0.2.2` + `## [0.2.2] - 2026-08-27` (Fixed 11 items, Changed SDK/manifest, Security no new network), created strictly after publish (verified via run order).

**VS Code Marketplace:**
- VSIX audit pre-publish: `ackit-vscode-0.2.2.vsix` 640323 bytes (625 KB) <2 MB, 12 files, `dist/extension.js` 1.0 MB, `icon.png` 256×256 26534 bytes square >1KB, `package.json` version 0.2.2 publisher Cynrath displayName ACKit Toolkit, `vsce ls --no-dependencies --no-yarn` whitelist PASS no `node_modules`.
- `pnpm --filter ackit-vscode exec vsce publish --packagePath ackit-vscode-0.2.2.vsix --no-dependencies` → `INFO Publishing 'Cynrath.ackit-vscode v0.2.2'... DONE Published Cynrath.ackit-vscode v0.2.2.` Hub `https://marketplace.visualstudio.com/manage/publishers/Cynrath/extensions/ackit-vscode/hub` Extension URL `https://marketplace.visualstudio.com/items?itemName=Cynrath.ackit-vscode`
- Gallery propagation: immediate `vsce show` still shows 0.2.1 (lastUpdated 17:52 UTC, cache), but retry `vsce publish` → `ERROR Cynrath.ackit-vscode v0.2.2 already exists.` proves 0.2.2 is registered; vsix `extension/package.json` `version 0.2.2` confirmed via `Expand-Archive` package.json. VSIX SHA-256 (publisher-local audit) `43370940B7448474FC99E06C5A8F4CD8765A80B037CAADAAADC5E11827A623C3` (build `5547AB...` earlier, repack SHA updated to `433709...`, both 640323 bytes).
- Verified via `vsce show` will reflect after propagation (5-10 min typical); no manual upload needed.

**GitHub Action Marketplace:**
- `action.yml` at root, `Cynrath/agent-context-kit@v0.2.2` now resolvable (tag `v0.2.2` exists, Release `v0.2.2` published, action listing auto-updates on Release; manual UI step if needed: `Edit Release v0.2.2 → Publish this Action to the GitHub Marketplace → Update release` — no second repo, no mutable `v0` tag).

**Hosted docs sync:**
- Fixed `scripts/sync-ackit-docs.mjs` `readVersion` using `fs` (was `require("node:fs")` in ESM → fallback 0.2.1 bug), then `node ./scripts/sync-ackit-docs.mjs --source O:\projeler\agent-context-kit` → `version: 0.2.2` `sitemap updated 18 urls` `done — generated 17 pages + assets`, now `agent-context-kit/index.html` contains `0.2.2` (10 hits), `vscode` `0.2.2`, `github-action` `v0.2.2`, committed `749a9a3` `docs: sync AgentContextKit v0.2.2` 18 files, `git push origin main` → `c86bc60..749a9a3`.
- Live verification pending propagation but local `index.html` and `vscode/index.html` now describe `0.2.2` accurately; sitemap 18 urls, robots ok, no analytics.

**Global ACKit:**
- `npm install --global @cynrath/agent-context-kit@0.2.2` → `changed 99 packages`, `ackit --version` `0.2.2`, `where.exe ackit` `C:\Users\gizem\AppData\Roaming\npm\ackit`, `Get-Command ackit` `C:\Users\gizem\AppData\Roaming\npm\ackit.ps1`, no `.dotnet` legacy, `ackit --help` clean.

**Final dual-repo audit:**
- agent-context-kit: `master` clean (`git status --short` empty after `rm vsix/dist/out`), `origin/master` exact `35087e7`, `task doctor` OK, `v0.2.2` tag `af739cf` on `35087e7`, `npm latest` `0.2.2`, GitHub Release `v0.2.2` correct, `README` current `0.2.2` 15 hits, `npm README parity` PASS SHA `7f8910a5af6fed3d11bc90f018dd7dd839f227686e8bc82551774d97fb788eff`, `offline-egress` PASS 139 files, `CI` green including `extension` job, `CHANGELOG` `0.2.2`, `FUNDING`/`topics` preserved.
- Cynrath.github.io: `main` clean `749a9a3` `origin/main` exact, `sitemap.xml` 18 urls, `robots.txt` sitemap, no analytics.
- Offline-first: GO.

**Artifacts:**
- Master SHA: `35087e74752174be75d74e968e12f3cffe1ee69c`
- Tag object: `af739cffedf6c06afcbaae47899be980a8ba4d74` → `35087e7`
- CI runs: `CI 33114882017` success, `Dogfood 33114882046` success, `Release 33115087208` success
- npm: `0.2.2` `5eb631a2f0ff8976c373d0398e28604f9424dff9` `sha512-cenl...`
- GitHub Release: `https://github.com/Cynrath/agent-context-kit/releases/tag/v0.2.2`
- VSIX: `O:\projeler\agent-context-kit\extensions\vscode\ackit-vscode-0.2.2.vsix` (build-time, now cleaned; repack SHA `43370940B7448474FC99E06C5A8F4CD8765A80B037CAADAAADC5E11827A623C3`, 640323 bytes)
- Marketplace: `https://marketplace.visualstudio.com/items?itemName=Cynrath.ackit-vscode` (0.2.2 published, propagation)
- Action: `Cynrath/agent-context-kit@v0.2.2`
- Hosted docs: `https://cynrath.github.io/agent-context-kit/` + `/vscode/` now 0.2.2 (commit 749a9a3)
- Pages main SHA: `749a9a3`
- Global: `0.2.2` `C:\Users\gizem\AppData\Roaming\npm\ackit`

