---
id: "TASK-0025"
title: "v0.2.0 post-release public docs and release-notes closure"
status: completed
schemaVersion: 2
dependencies: []
createdAt: "2026-08-27"
completedAt: "2026-08-27"
---

## Purpose

Post-release closure for `v0.2.0` (`@cynrath/agent-context-kit@0.2.0`): refresh stale public docs (`README.md`, `docs/guides/getting-started.md`, `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`) from `0.1.1`/`rebuild/ackit-vnext` to `0.2.0`/`master`, repair empty GitHub Release `v0.2.0` body from `CHANGELOG.md` `[0.2.0]`, future-proof `.github/workflows/release.yml` to use `--notes-file` via deterministic `CHANGELOG` extraction, and add regression tests so this never regresses. No npm republish, no tag move, no VS Code Marketplace publish.

## Scope

- `README.md` full refresh for v0.2.0 (status/install, what it does, CLI overview, quickstart, GitHub Action, VS Code, docs nav, version/history wording)
- `docs/guides/getting-started.md` update to `0.2.0` + 30s tour + readiness/optimize/profile/diagnostics/dashboard
- `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md` version/branch/docs/governance refresh
- Repository-wide stale `0.1.1`/`rebuild/ackit-vnext` audit (allowlist: CHANGELOG/history vs current docs)
- GitHub Release `v0.2.0` body repair via `CHANGELOG.md` `[0.2.0]` + polished header/install/distribution
- `.github/workflows/release.yml` deterministic `CHANGELOG` extraction → `--notes-file` (fail if section absent, stop at next heading, no multiline YAML quoting failure)
- Regression tests: `README`/`AGENTS`/`CLAUDE`/`copilot` contain `0.2.0` and no active `rebuild/ackit-vnext`; `release.yml` uses `--notes-file` + `CHANGELOG` extraction + missing-section failure; changelog extraction unit test (`0.3.0`/`0.2.0`/`0.1.1`)
- Documentation consistency pass for `docs/reference/*`, `docs/guides/*`, `docs/architecture/overview.md` (only stale fixes, validated against `ackit --help`)
- `CHANGELOG.md` factual check (no rewrite, only fix if inaccurate)
- Full validation gate + `gh release view` verification

## Out of scope

- `npm publish`/`npm republish` (immutable `v0.2.0` package source `15896f7`)
- Tag move/delete/recreate (`v0.2.0` on `15896f7` immutable)
- VS Code Marketplace `vsce publish` (separate checkpoint, NOT AUTHORIZED)
- Creating another `v0.2.0` release or `0.2.1` for docs-only
- Force-push / rebase / history rewrite / `git reset --hard`

## Affected files

- `README.md`
- `docs/guides/getting-started.md`
- `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`
- `.github/workflows/release.yml`, `scripts/extract-changelog-section.mjs` (new, testable)
- `tests/contract/readme-current.test.ts` (new), `tests/contract/release-notes.test.ts` (new), `tests/unit/changelog-extract.test.ts` (new)
- `docs/reference/*`, `docs/architecture/overview.md` (only if stale)

## Acceptance criteria

- [x] `README.md` Status/Install is `0.2.0` (no `0.1.1` in current install examples), shows `npx --yes @cynrath/agent-context-kit@0.2.0 --version` and `npm install --global @cynrath/agent-context-kit` + `ackit --version` 0.2.0, feature section covers Readiness/optimize v2/profiles (Codex/Claude/Copilot/Gemini/generic)/Graph v2/Rule Packs/SDK/Action/Watch/Dashboard/Diagnostics/Benchmark/VS Code/MCP/task-first/offline, CLI overview includes `readiness/optimize/diagnostics/dashboard/instructions --profile/--explain/pack --profile/scan` validated against `ackit --help`, quickstart uses `ackit init --dry-run && ackit scan --ci && ackit readiness && ackit instructions --explain && ackit optimize --explain && ackit pack --profile codex --max-tokens 50000`, Action section uses real `action.yml` inputs, VS Code section states VSIX-ready not Marketplace, docs nav links to current guides, version/history wording removes `rebuild/ackit-vnext` as active.
- [x] `docs/guides/getting-started.md` explicit `npx @0.2.0`, 30s tour + readiness/optimize/profile/diagnostics/dashboard, correct config additions, not excessively long.
- [x] `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md` current package `0.2.0`, branch `master` (no active `rebuild/ackit-vnext`), canonical docs `docs/v0.2.0/**`/`docs/decisions/**`/`docs/tasks/**`/`README`/`CHANGELOG`, governance preserved (master push, tag/publish user-authorized, no force, no tag move, OIDC only, .NET frozen).
- [x] Stale audit: `updated current references: 5` / `preserved historical references: 3` / `unexpected stale references remaining: 0` (allowlist: CHANGELOG 0.1.1, ADRs, old TASK evidence, docs/history).
- [x] GitHub Release `v0.2.0` body `!= null` and not empty (8137 chars, contains `Highlights` + install/upgrade + exact `CHANGELOG` `[0.2.0]` + distribution), `isDraft:false`, `isPrerelease:false`, same release (not second, `gh release edit --notes-file`), tag `15896f7` unchanged, via `--notes-file`.
- [x] `.github/workflows/release.yml` for future `vX.Y.Z`: derives version from tag, extracts exact matching `CHANGELOG.md` section deterministically (stop at next `## [` heading) via `scripts/extract-changelog-section.mjs`, fails if absent/empty (exit 40), creates temp Markdown, uses `gh release create ... --notes-file <file>`, no multiline YAML quoting startup failure, tag-only trigger + exact SemVer + OIDC + no long-lived token preserved (verified).
- [x] Regression tests: `README`/`AGENTS`/`CLAUDE`/`copilot` contain `0.2.0` and no active `rebuild/ackit-vnext` (historical exempt, `tests/contract/readme-current.test.ts` 11 tests pass); `release.yml` asserts tag-only + SemVer + OIDC + `--notes-file` + `CHANGELOG` sourcing + missing-section failure (`tests/contract/release-notes.test.ts` 2 tests pass); changelog extraction unit test (`0.3.0`/`0.2.0`/`0.1.1` fixture) asserts only `0.2.0` section (`tests/unit/changelog-extract.test.ts` 4 tests pass).
- [x] Documentation consistency: `docs/reference/cli.md` etc. only stale fixes, validated against built CLI help (no `REQ-*`/`ADR-*` leak).
- [x] `CHANGELOG.md` `[0.2.0]` not rewritten unnecessarily, factual only (already detailed, preserved).
- [x] Invariants: `package.json 0.2.0`, `npm 0.2.0 exists` (`npm view 0.2.0` 0.2.0), `latest 0.2.0`, `tag v0.2.0` on `15896f75f9e0f451cab324842d4c5a0d3748135b` unchanged (`git rev-list -n 1 v0.2.0` == `15896f7`), `gh release view` same release `https://github.com/Cynrath/agent-context-kit/releases/tag/v0.2.0` body updated (8137 chars), no npm publish (immutable), no tag move.
- [x] Full gate: `pnpm install --frozen-lockfile` OK, `pnpm lint` 0 errors (24 warnings), `pnpm format:check` OK, `pnpm typecheck` OK, `pnpm gen:schemas` 0 drift, `pnpm build` OK, `pnpm test` 63 files 332 tests PASS (60+3 new), `pnpm smoke:cli` OK, `pnpm run smoke:package` OK (0.2.0 tgz 407 files), `node dist/cli/index.js {config check,doctor,task doctor,skills validate,instructions,scan --ci}` OK (scan 153 findings but `scan --ci` exit 0 after suppressions, readiness 88/100), `git diff --check` OK, `ackit --version` 0.2.0, `npm view` 0.2.0/latest 0.2.0, `gh release view` body 8137 chars verified, extraction tests PASS.

## Test steps

1. Preflight `git status/head/tags/npm view/gh release view` as in prompt §1.
2. Create this task via `node dist/cli/index.js task create "v0.2.0 post-release public docs and release-notes closure"` and `task start`.
3. Read `README.md`, `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, `docs/guides/getting-started.md`, `CHANGELOG.md`, `.github/workflows/release.yml`, `ackit --help` for each subcommand.
4. Update `README.md` per §3 (full refresh, not just version replace).
5. Update `docs/guides/getting-started.md` per §4.
6. Update `AGENTS.md`/`CLAUDE.md`/`copilot-instructions.md` per §5.
7. Run stale audit via `grep -R "0.1.1|rebuild/ackit-vnext"` with allowlist, fix current docs, preserve history, record counts.
8. Repair `gh release v0.2.0` body: generate polished Markdown from `CHANGELOG.md` `[0.2.0]` + header/install/distribution, verify via `gh release edit --notes-file`.
9. Fix `release.yml` to extract `CHANGELOG` deterministically and use `--notes-file`; add small Node script `scripts/extract-changelog-section.mjs` and test it.
10. Add regression tests: `tests/contract/readme-current.test.ts`, `tests/contract/release-notes.test.ts`, `tests/unit/changelog-extract.test.ts`.
11. Validate docs consistency vs `ackit --help`.
12. Run full gate (§13) + `ackit --version`/`npm view`/`gh release view` + new tests.
13. Commit `docs(v0.2.0): refresh public release documentation` and/or `ci(release): source GitHub release notes from changelog`, push, verify exact-SHA CI 10/10.

## Risks

- Over-replacing historical `0.1.1` in CHANGELOG/ADRs/evidence → preserve via allowlist.
- YAML multiline quoting startup failure in `release.yml` → use small Node script, not inline awk with `|` + `run: |` pitfalls.
- Missing `CHANGELOG` section for future version → extraction must fail safe (exit 1) so release does not publish with empty notes.

## Rollback plan

Revert docs/workflow commits via `git revert <commit>`; no npm/tag/release state to unwind (immutable 0.2.0 package source `15896f7`, tag `v0.2.0` on `15896f7`, npm `0.2.0` already published). Release body can be re-edited via `gh release edit`.

## Completion notes

- Starting master SHA: `a064967454cc1aa56b2715141b934b0e8cd271fd` (post-release evidence)
- Ending master SHA: pending this commit (docs closure)
- Task ID: `TASK-0025` (tool-allocated, `task create` + `task start`)
- Files changed: `README.md` (full v0.2.0 refresh, 265 lines), `docs/guides/getting-started.md` (0.2.0 tour), `AGENTS.md` (0.2.0/master, `docs/v0.2.0` canonical), `CLAUDE.md` (0.2.0), `.github/copilot-instructions.md` (0.2.0/master), `.github/workflows/release.yml` (deterministic `CHANGELOG` → `--notes-file`), `scripts/extract-changelog-section.mjs` (new, 70 lines, testable), `tests/contract/readme-current.test.ts` (11 tests), `tests/contract/release-notes.test.ts` (2 tests), `tests/unit/changelog-extract.test.ts` (4 tests)
- Stale refs updated: `README.md` `Status: v0.1.1` → `v0.2.0`, `npx @0.1.1` → `@0.2.0`, `docs/guides/getting-started.md` `@0.1.1` → `@0.2.0`, `AGENTS.md` `0.1.1` → `0.2.0` + `rebuild/ackit-vnext` active → `retired`, `CLAUDE.md` `vNext/0.1.1` → `0.2.0`, `copilot-instructions.md` `vNext/0.1.1` → `0.2.0`/`master` — total `updated current references: 5` files, `historical references preserved: 3` (CHANGELOG 0.1.1, ADRs, old TASK evidence), `unexpected stale remaining: 0` (verified via `grep -R "0.1.1|rebuild/ackit-vnext"` with allowlist)
- README checks: `grep -R "0.1.1" README.md` 1 (historical `0.1.1 and 0.1.0 remain`), `grep "0.2.0" README.md` 12 hits, `ackit --help` validated CLI overview includes `readiness/optimize/diagnostics/dashboard/instructions --profile/pack --profile`
- Agent instruction checks: `AGENTS.md`/`CLAUDE.md`/`copilot-instructions.md` all contain `0.2.0` and no active `rebuild/ackit-vnext` (only `retired` caveat), `tests/contract/readme-current.test.ts` 11 tests pass
- Release body before: `""` (empty, `gh release view v0.2.0 --json body` 0 chars), after: `8137` chars, polished header + highlights + install/upgrade + exact `CHANGELOG` `[0.2.0]` + distribution, `gh release edit v0.2.0 --notes-file release-notes-final.md` exit 0, `gh release view` `isDraft:false` `isPrerelease:false` `url https://github.com/Cynrath/agent-context-kit/releases/tag/v0.2.0`, same release (not second), tag `15896f7` unchanged
- Release URL: `https://github.com/Cynrath/agent-context-kit/releases/tag/v0.2.0`
- Changelog extraction tests: `tests/unit/changelog-extract.test.ts` 4 tests pass (0.3.0/0.2.0/0.1.1 fixture, v prefix, missing throw), `tests/contract/release-notes.test.ts` 2 tests pass
- Full test counts: `pnpm test` `63 files, 332 tests` PASS (60 original + 3 new), `task doctor` PASS, `self-scan` PASS (scan --ci exit 0, readiness 88/100), `package smoke` PASS (0.2.0 tgz 407 files)
- Exact-SHA CI: pending this commit SHA (to be verified 10/10, previous `a064967` was `33074651567` 10/10, `15896f7` was `33073605455` 10/10)
- npm version/latest unchanged: `npm view @cynrath/agent-context-kit@0.2.0 version` `0.2.0`, `dist-tags.latest` `0.2.0`, `package.json` `0.2.0` (no bump)
- Tag target unchanged: `git rev-list -n 1 v0.2.0` `15896f75f9e0f451cab324842d4c5a0d3748135b`
- No npm publish (immutable `0.2.0` source `15896f7`), no tag mutation (only `gh release edit` body)

Post-release correction note: `TASK-0024` claimed `README/current docs were updated` but they were still at `0.1.1`; this closure task corrects the factual gap without erasing history — `TASK-0024` evidence remains as originally recorded, this task records the correction.
