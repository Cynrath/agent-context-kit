---
id: "TASK-0038"
title: "v0.2.2 version/docs/release readiness — coupling, CHANGELOG, parity"
status: completed
schemaVersion: 2
dependencies: ["TASK-0035", "TASK-0036", "TASK-0037"]
createdAt: "2026-08-27"
completedAt: 2026-08-27
---

## Purpose

Prepare full logical patch release `v0.2.2` per `ADR-0023` coupling: `root npm version == VS Code extension version == Git tag == GitHub Release == GitHub Action @v0.2.2`, with `CHANGELOG.md` `## [0.2.2]`, `README.md` parity, and docs/version links.

## Current-state evidence

- `package.json` `version: 0.2.1` (after `v0.2.1` release `a0589cd`), `extensions/vscode/package.json` already bumped to `0.2.2` in this hotfix (for icon/README), but root is still `0.2.1` — coupling broken until root bumped to `0.2.2`.
- `README.md` badges `v0.2.1` (after `v0.2.1` launch, `npm%20v0.2.1`, `release-v0.2.1`, `npx --yes @0.2.1`, `Cynrath/agent-context-kit@v0.2.1`, `VS Code 0.2.1`, `Current: 0.2.1`), `docs/v0.2.0` historical path correct.
- `CHANGELOG.md` has `## [0.2.1] - 2026-08-27` + `## [0.2.0]`, but no `## [0.2.2]`.
- `extensions/vscode/CHANGELOG.md` has `## [0.2.1]` + `## [0.2.0]`, no `## [0.2.2]`.
- `pnpm-lock.yaml` reflects `0.2.1`.
- `npm view @cynrath/agent-context-kit@0.2.2 version` → `E404` (absent, safe), `git tag --list v0.2.2` empty, `gh release view v0.2.2` → `release not found`.
- `AGENTS.md`/`CLAUDE.md` still reference `v0.2.1`? Check.

Verified via `cat package.json | grep version` (`0.2.1`), `cat extensions/vscode/package.json | grep version` (`0.2.2`), `cat README.md | grep 0.2.1` (5 hits), `cat CHANGELOG.md | head -20` (no 0.2.2), `npm view` (E404).

## Goal

- `package.json` `0.2.2`, `extensions/vscode/package.json` `0.2.2` (already), `pnpm-lock.yaml` updated via `pnpm install`, `README.md` `0.2.1→0.2.2` (badges, npx, Action, VS Code, versioning), `CHANGELOG.md` `## [0.2.2] - 2026-08-27` (concise, no unrelated features), `extensions/vscode/CHANGELOG.md` `## [0.2.2]`, `npm README parity` still green (SHA recorded).

## In scope

- Bump `package.json` `version` `0.2.1→0.2.2` via `node -e "j.version='0.2.2'"` + `pnpm install` (updates `pnpm-lock.yaml` if needed, then `pnpm install --frozen-lockfile` must pass).
- Bump `README.md`:
  - `https://img.shields.io/npm/v/@cynrath/agent-context-kit?label=npm%20v0.2.1` → `v0.2.2`
  - `https://img.shields.io/badge/release-v0.2.1` → `v0.2.2`
  - `https://github.com/Cynrath/agent-context-kit/releases/tag/v0.2.1` → `v0.2.2`
  - `ackit --version  # 0.2.1` → `0.2.2`
  - `npx --yes @cynrath/agent-context-kit@0.2.1` → `0.2.2` (×2)
  - `Cynrath/agent-context-kit@v0.2.1` → `v0.2.2` (×2, Action section)
  - `VS Code` `0.2.1` → `0.2.2` (table + `ackit-0.2.1.vsix` → `0.2.2`, `extensions/vscode` `0.2.1` → `0.2.2`)
  - `Current: 0.2.1` → `0.2.2`, `latest → 0.2.1` → `0.2.2`
  - Preserve `docs/v0.2.0` historical path (do not change to `v0.2.2`).
- Add `CHANGELOG.md` `## [0.2.2] - 2026-08-27` (see `temp-changelog-022.mjs` already executed in this hotfix prep — it added 0.2.2 section with Fixed/Changed/Security, but root `package.json` was still 0.2.1 at that time; now bump root to 0.2.2 to match).
- Update `extensions/vscode/CHANGELOG.md` `## [0.2.2]` (already done in this hotfix).
- Ensure `AGENTS.md`/`CLAUDE.md` version references updated if they mention `0.2.1` (optional, but check).
- Run `pnpm build` + `pnpm gen:schemas` + `git diff --exit-code -- schemas` (0), `pnpm test` (359+), `node scripts/check-readme-parity.mjs` (SHA recorded), `node scripts/check-offline-egress.mjs` (PASS), `pnpm lint`/`format:check`/`typecheck` green.
- Verify `package.json` `files` still includes `README.md`, `CHANGELOG.md`, `LICENSE`, `dist`, `templates`, `schemas`.

## Out of scope

- Publishing `0.2.2` yet (TASK-0039).
- Changing `docs/v0.2.0` folder name.
- Adding new telemetry.

## Affected files

- `package.json` (0.2.2)
- `pnpm-lock.yaml` (via `pnpm install`)
- `README.md` (badges/links 0.2.1→0.2.2)
- `CHANGELOG.md` (add 0.2.2)
- `extensions/vscode/package.json` (already 0.2.2)
- `extensions/vscode/CHANGELOG.md` (already 0.2.2)
- `extensions/vscode/README.md` (already 0.2.2 via TASK-0037)

## Technical design

- `package.json` bump: `node -e "const fs=require('fs'); const p='package.json'; const j=JSON.parse(fs.readFileSync(p,'utf8')); j.version='0.2.2'; fs.writeFileSync(p, JSON.stringify(j,null,2)+'\n');"`
- `README.md` bump: `node -e "let c=require('fs').readFileSync('README.md','utf8'); c=c.replaceAll('v0.2.1','v0.2.2').replaceAll('0.2.1','0.2.2').replaceAll('docs/v0.2.2','docs/v0.2.0'); require('fs').writeFileSync('README.md',c);"` (preserve historical).
- `CHANGELOG.md`: already has 0.2.2 via `temp-changelog-022.mjs` (29 lines, Fixed/Changed/Security), verify via `head -n 50 CHANGELOG.md`.
- `pnpm install` then `pnpm install --frozen-lockfile` must pass, `pnpm build` (`tsc -p tsconfig.build.json` → `dist/cli/index.js` version `0.2.2`), `node dist/cli/index.js --version` → `0.2.2`.
- Parity: `node scripts/check-readme-parity.mjs` → `cynrath-agent-context-kit-0.2.2.tgz` 279KB, SHA `9ad3ae...` (after Sponsors/Discussions) or new SHA after 0.2.2 README bump (record new SHA), `tests/contract/readme-parity.test.ts` 4 tests PASS (30s timeout).

## Tests

| Class | Command | Gate |
|-------|---------|------|
| version | `node -p "require('./package.json').version"` → `0.2.2` | PASS |
| vscode version | `node -p "require('./extensions/vscode/package.json').version"` → `0.2.2` | PASS |
| README | `grep -c "0.2.2" README.md` | >=5 |
| CHANGELOG | `head -n 1 CHANGELOG.md` contains `## [0.2.2]` | PASS |
| parity | `node scripts/check-readme-parity.mjs` | 0, SHA logged |
| contract | `pnpm test tests/contract/readme-parity.test.ts` | 4 tests |
| coupling | `node -e "require('./package.json').version === require('./extensions/vscode/package.json').version"` | true |

## Security

- No secrets, version bump only.

## Acceptance criteria

- [x] `package.json` `0.2.2`, `extensions/vscode/package.json` `0.2.2`, `pnpm-lock.yaml` updated (or still up-to-date)
- [x] `README.md` all `0.2.1` badges/links → `0.2.2` (except `docs/v0.2.0`), `CHANGELOG.md` `## [0.2.2]` exists, `extensions/vscode/CHANGELOG.md` `## [0.2.2]`
- [x] `pnpm build` → `dist` `0.2.2`, `pnpm test` 359+ PASS, `parity` PASS, `offline-egress` PASS
- [x] Coupling: `root 0.2.2 == vscode 0.2.2` (will be `== tag v0.2.2` after TASK-0039)

## Risks

- `README.md` replaceAll `0.2.1→0.2.2` may incorrectly change `docs/v0.2.0` → revert that one.
- `pnpm-lock.yaml` may show `Lockfile is up to date` (no change) — that's ok, version bump doesn't affect deps.

## Rollback plan

`git checkout HEAD -- package.json README.md CHANGELOG.md` + `git checkout HEAD -- extensions/vscode/package.json` (but it was 0.2.2 already, so keep).

## Completion notes

2026-08-27 — version coupling restored 0.2.2, docs parity verified, follow-up CI fixes included.

**Versions:** `package.json` `0.2.2` (`node -p "require('./package.json').version"` 0.2.2), `extensions/vscode/package.json` `0.2.2` (`node -p "require('./extensions/vscode/package.json').version"` 0.2.2), `pnpm-workspace.yaml` `packages: [".","extensions/*"]` + `allowBuilds: esbuild: true`, `pnpm-lock.yaml` importer `extensions/vscode: workspace:*` link:../.., `pnpm install` 2 workspace projects `Lockfile is up to date` (after esbuild allow), `pnpm install --frozen-lockfile` PASS.

**README:** `README.md` badges/links `0.2.1→0.2.2` (npm%20v0.2.2 1 hit, release-v0.2.2 1, `releases/tag/v0.2.2` 1, `ackit --version # 0.2.2` 1, `npx --yes @cynrath/agent-context-kit@0.2.2` 2 hits, `Cynrath/agent-context-kit@v0.2.2` 2 hits, VS Code table `0.2.2` + `ackit-0.2.2.vsix` + `extensions/vscode 0.2.2`, `Current: 0.2.2` `latest → 0.2.2`), `docs/v0.2.0` preserved (2 hits), `grep -c "0.2.2" README.md` 15 hits.

**CHANGELOG:** `CHANGELOG.md` `## [0.2.2] - 2026-08-27` 34 lines (Fixed: VS Code UI contract 8 defects, tree providers, Problems severity, current-file, Optimize/Diagnostics real, multi-root/watch, SDK analyzeOptimize, icon 1×1→256×256, test harness; Changed: extension manifest 6 views, build packaging; Security: offline-egress includes extension), `extensions/vscode/CHANGELOG.md` `## [0.2.2]` 15 lines, `head -n 1 CHANGELOG.md` `## [0.2.2] - 2026-08-27` PASS.

**Build/docs:** `pnpm build` `tsc -p tsconfig.build.json` PASS `dist/cli/index.js` `ackit --version` `0.2.2`, `pnpm gen:schemas` PASS `schemas` no diff, `pnpm lint` 0 errors, `pnpm format:check` PASS, `pnpm typecheck` PASS, `pnpm test` 67 files 361 tests PASS (including `readme-parity` 4/4 SHA `7f8910a5af6fed3d11bc90f018dd7dd839f227686e8bc82551774d97fb788eff`, `ci-pinning` 19/19 after publish→publisher fix), `node scripts/check-readme-parity.mjs` PASS parity SHA `7f8910a...`, `node scripts/check-offline-egress.mjs` 139 files PASS, `git diff --check` clean.

**Coupling:** `node -e "console.log(require('./package.json').version === require('./extensions/vscode/package.json').version)"` `true` (0.2.2==0.2.2), `package.json` `files` still `["dist","templates","schemas","README.md","CHANGELOG.md","LICENSE"]`, `README.md` parity with tarball PASS via `pnpm test`.

**Follow-up fixes in this task range:** `src/index.ts` organizeImports sorted, `src/core/context/optimize.ts` guarded `last.id`, `pnpm-workspace.yaml` + `workspace:*` + `allowBuilds`, `ci.yml` extension job workspace install before typecheck via `pnpm --filter`, `tsconfig.json/test` types/lib, `extension.test.ts` Thenable.catch fix — all verified via `pnpm --filter ackit-vscode exec tsc`.

**Artifacts:** `package.json` 0.2.2, `vscode` 0.2.2, `pnpm-lock.yaml` updated (1226 lines importer), `README` 0.2.2, `CHANGELOG` 0.2.2, coupling true, gates green ready for TASK-0039 tag.
