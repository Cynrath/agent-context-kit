---
id: "TASK-0039"
title: "v0.2.2 release + Marketplace + post-release verification — tag, OIDC, VSIX publish, Action, docs sync, global"
status: active
schemaVersion: 2
dependencies: ["TASK-0038"]
createdAt: "2026-08-27"
completedAt: null
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

- [ ] Preparatory `0.2.2` commits pushed, exact-SHA CI green (including `extension` job), `npm 0.2.2` absent, `tag` absent, `Release` absent, `Trusted Publishing` active, `VSIX 0.2.2` audited (<2MB, 256×256 icon)
- [ ] Annotated `v0.2.2` on exact verified SHA, pushed, triggers `Release` workflow
- [ ] OIDC `npm publish` success, `version=0.2.2`, `latest=0.2.2`, `shasum`/`integrity`/`provenance` verified
- [ ] Fresh isolated consumer PASS, `npx` secondary PASS (or warning but fresh passed)
- [ ] GitHub Release `v0.2.2` last, body == `CHANGELOG.md` `## [0.2.2]`, title `AgentContextKit v0.2.2`, not draft
- [ ] VS Code Marketplace `Cynrath.ackit-vscode` `0.2.2` published (or `READY` with VSIX path/hash if auth unavailable), verified via `vsce show` or Marketplace URL
- [ ] GitHub Action `@v0.2.2` ready/published (auto on Release, manual UI fallback documented)
- [ ] Hosted docs re-synced if version changed, live verification `https://cynrath.github.io/agent-context-kit/` + `/vscode/` describe `0.2.2`
- [ ] Global `ackit` `0.2.2` via `npm` global, no `.dotnet` legacy
- [ ] Final dual-repo audit checklist all PASS (master clean, origin exact, task doctor, tag, npm, Release, README, parity, FUNDING, topics 20, website; Pages main clean, docs live, sitemap, robots, no analytics; offline-first GO)

## Risks

- `npx` cache stale → fresh isolated consumer is hard gate, `npx` best-effort warning.
- `vsce` display name taken → already fixed to `ACKit Toolkit` (was `AgentContextKit` taken).
- `icon.png` 5225×5225 too large → already resized to 256×256 26KB in this hotfix.

## Rollback plan

- If `npm publish` succeeds but `Release` fails → do not republish, `gh release create v0.2.2 --verify-tag` manual.
- Tag `v0.2.2` immutable once pushed — never move.

## Completion notes

(placeholder) — will contain: final SHAs, CI run IDs, tag object/source SHA, npm shasum/integrity/provenance, Release URL, VSIX SHA, Marketplace URLs, global version, hosted docs verification, final audit.

