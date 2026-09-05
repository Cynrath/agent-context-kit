---
id: "TASK-0078"
title: "v0.5 baseline and maintenance-aware release-state model"
status: completed
schemaVersion: 2
dependencies:
  []
createdAt: "2026-09-04"
completedAt: 2026-09-05
---

## Purpose

Fix the maintenance-line governance gap left by the v0.4.1 out-of-band maintenance release: current master still reports source version `0.4.0` in `package.json` and hard-codes `0.4.0` release truth in README badges while the latest published stable is `0.4.1`, and `scripts/check-version-parity.mjs` treats `package.json` as the single truth so it PASSES despite the stale default-branch README. Design and land a maintenance-aware release-state model that distinguishes source-checkout/development version, published stable version, historical versions, and maintenance-line versions, and teach the parity guard to understand them as separate concepts. No v0.5.0 publication occurs in this task.

## Current-state evidence (implementation started 2026-09-04 from master f1550e4ca254f1df639a00f25cf121bd9c65e6fa; earlier observation on master 725ed18 retained below as historical evidence)

- `package.json` version `0.4.0`; `extensions/vscode/package.json` version `0.4.0` (ADR-0023 coupling holds).
- `npm view @cynrath/agent-context-kit version` → `0.4.1` (latest published stable).
- README hard-codes `0.4.0`: npm badge label `npm v0.4.0`, release badge `release-v0.4.0` linking `releases/tag/v0.4.0`, VS Code table cell `0.4.0`.
- `node scripts/check-version-parity.mjs` → PASS (current 0.4.0, 14 files clean): the guard compares current-facing surfaces against `package.json` only, so it cannot see that npm latest (`0.4.1`) has moved past the default branch.
- `scripts/check-version-parity.mjs` internals: `parseVersion` accepts an optional `-prerelease` suffix; `findStaleRefs` flags only `0.x` refs older than current (older minor, or older patch on same minor); `MUST_SHOW_CURRENT` requires README/getting-started/VS Code README to contain the `current` string verbatim.
- `release.yml` triggers only on tags `v*.*.*` (tags-only, OIDC); nothing on master publishes.
- ADR-0023: one logical release (npm + VSIX + Action pin), `package.json` is source-of-truth version, tag points at the commit whose `package.json` version matches.
- Preferred model IF tooling safely supports it: master source `0.5.0-dev.0` (or repository-approved equivalent), latest published stable `0.4.1`, maintenance line `0.4.x`. Prerelease-suffix support exists in the parity parser but the consequences for `MUST_SHOW_CURRENT` verbatim matching, the `v*.*.*` tag glob, and the release workflow must be audited before adoption. If prerelease development versions are incompatible with established tooling, design the smallest alternative that still prevents `README says 0.4.0 while npm latest is 0.4.1`.

## Scope

- Audit release policy sources: ADR-0023, `scripts/check-version-parity.mjs` (+ contract tests), `release.yml` tag glob and publish path, README/getting-started/VS Code README current-facing claims, CHANGELOG conventions.
- Define the four version concepts (source/development, published stable, historical, maintenance-line) and where each is recorded and asserted.
- Implement the smallest model change that closes the gap (candidate directions, decide in-task: prerelease dev version vs stable-pointer file vs split guard concepts; do NOT pre-commit to one before the audit).
- Update the parity guard and its contract tests to distinguish the concepts; keep historical references passing.
- Update stale current-facing references per the chosen model (README badges/links at minimum).
- Record the decision (ADR addendum or new ADR, as appropriate).

## Out of scope

- Any version bump publication, tag creation, npm publish, GitHub Release, Marketplace publish (all prohibited in this task).
- v0.5.0 feature work (TASK-0079..0086).
- Merging or deleting `maintenance/v0.4.1`; touching `feat/browser-companion-v0.3` (PAUSED/NO-GO/DO NOT TOUCH).
- Broad README/docs rewrites beyond release-truth accuracy.

## Dependencies

- None (chain head; every other v0.5.0 task depends on the model it defines).

## Affected files / expected areas

- `scripts/check-version-parity.mjs` + its contract tests
- `package.json` (only if the chosen model changes the dev version; never a release bump)
- `README.md`, `docs/guides/getting-started.md`, `extensions/vscode/README.md` (release-truth surfaces)
- `docs/decisions/` (ADR addendum or new ADR)
- `docs/tasks/active/TASK-0078-*.md` (this task)

## Acceptance criteria

- [x] Release-policy audit recorded (ADR-0023, parity script, release workflow, current-facing surfaces, npm latest) with live evidence.
- [x] Four version concepts defined, recorded, and asserted in distinct places; no concept conflated.
- [x] `README says 0.4.0 while npm latest is 0.4.1` class of staleness is impossible or mechanically detected (proven by positive + negative probes).
- [x] Parity guard green on the new model; historical references still pass; contract tests cover each concept.
- [x] No PUBLIC/STABLE release bump or publication side effects (`git tag --list`, `npm view`, GitHub Release, Marketplace remain 0.4.1). A source/development-version transition (e.g. to `0.5.0-dev.0`) is allowed only if selected by the ADR; it is NOT a public/stable release.
- [x] Decision recorded as ADR addendum/new ADR; task completed through the real gate with evidence.

## Test steps

1. `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm build`.
2. Focused parity-guard tests, then `pnpm test` (record counts).
3. `node scripts/check-version-parity.mjs` green; negative probe (reintroduce stale stable pointer) fails the guard.
4. `node dist/cli/index.js doctor`, `task doctor`, `scan --ci`, `git diff --check`, `git status`.
5. Verify no tag/publish side effects.

## Security considerations

- No secrets in version surfaces; no network calls added to product code (npm-latest checks stay manual/documented, never in shipped code paths).
- No weakening of the parity gate to obtain green.

## Risks

- Prerelease dev versions may interact with the `v*.*.*` tag glob or Marketplace/VSIX flows → audit first, smallest alternative if incompatible.
- Over-engineering a release-train system → keep to four concepts + guard, nothing more.

## Rollback plan

- Focused revert of the model/guard commit(s) on the task branch before merge; after merge, a forward fix (never history rewrite).

## Audit (recorded 2026-09-05 on feat/task-0078-release-state; live evidence)

- ADR-0023 (`docs/decisions/ADR-0023-*`): one logical release, `package.json` source-of-truth, tag == package version, tags-only `v*.*.*` OIDC publish; no maintenance-line concept (gap).
- Parity guard (`scripts/check-version-parity.mjs`): `package.json` single truth; `MUST_SHOW_CURRENT` forces stable surfaces to name the source version verbatim; `findStaleRefs` only flags older-than-source. Live: `node scripts/check-version-parity.mjs` → PASS on `0.4.0` while npm/GitHub latest is `0.4.1` (false negative, reproduced).
- `release.yml`: trigger tags-only `v*.*.*` (ll.25-28); step-1 validator `^v[0-9]+\.[0-9]+\.[0-9]+$` + tag==package.json + name check (ll.57-90). Master push/PR can never publish.
- `ci.yml` extension job hard-codes source `0.4.0` (manifest contract, `vsce package --out ackit-vscode-0.4.0.vsix`, file checks).
- Source surfaces: `package.json`, `extensions/vscode/package.json`, source-checkout `--version`, MCP `serverInfo.version`, SARIF driver version (dynamic), VSIX filename, `ci.yml` extension job. Stable surfaces: README badges/install/Action pins/Versioning, getting-started one-shot pin, VS Code README Version/Marketplace claim, `examples/demo-github-action` pins.
- Q1 npm + `0.5.0-dev.0`: SAFE. Temp-dir `npm pack --dry-run` with `0.5.0-dev.0` → `probe-pkg-0.5.0-dev.0.tgz` OK. `scripts/package-smoke.mjs` ll.82-84 compares dynamically; `tests/contract/version-single-source.test.ts:29` allows prerelease; `prepack` version-agnostic.
- Q2 TS/smoke: SAFE. `src/shared/version.ts` dynamic; `tests/e2e/cli-scaffold.smoke.mjs:30,38` dynamic/prefix match.
- Q3 VS Code: SAFE for CI scope. CI runs only `vsce ls` + `vsce package` (never `publish`); `0.5.0-dev.0` is semver-valid; version flows to `--out` filename. Empirical `vsce package` proof runs post-bump in validation.
- Q4 master prerelease publish: IMPOSSIBLE (tags-only trigger; version string irrelevant).
- Q5 tag `v0.5.0-dev.0`: trigger glob MATCHES (third `*` eats `0-dev.0`) but step-1 validator REJECTS (exit 1) before install/publish — fail-closed, no silent stable publish. No workflow change needed; validator pinned by contract test.
- Q6: see source/stable surface lists above.
- Q7 badges dynamic: YES. Shields `npm/v/` renders registry latest without a hard-coded label; `github/v/release` + `/releases/latest` destination version-agnostic; pinned installs stay explicit but track the stable pointer. Guard checks static text → determinism preserved.
- Decision: adopt split model — source `0.5.0-dev.0` (both manifests), stable pointer `release-state.json` (`publishedStable 0.4.1`, `maintenanceSeries ["0.4.x"]`), history untouched. Full rationale in ADR-0029.

## Completion notes

Implemented 2026-09-05 on `feat/task-0078-release-state` (plan-fix commit `e1810ee` first, then this implementation).

Model landed (ADR-0029): source `0.5.0-dev.0` (`package.json` + `extensions/vscode/package.json`, coupled); stable `0.4.1` (`release-state.json`); maintenance `["0.4.x"]`; history allowlisted. README badges version-agnostic (`npm/v/` dynamic, `github/v/release` + `/releases/latest`); install/Action/Marketplace pins track stable `0.4.1`; `ci.yml` extension job tracks source.

Evidence: `node scripts/check-version-parity.mjs` → PASS (source 0.5.0-dev.0, stable 0.4.1, 14 files); negative probes A-E in `tests/contract/version-parity.test.ts` (26 tests) + `readme-current` (11) + `readme-parity` (4, incl. real `npm pack` tarball README equality) + `version-single-source` (3) + `ci-pinning` (19, prerelease-tag rejection pinned) all green; full `pnpm test` 103 files / 612 tests green (serial clean run; two earlier parallel runs hit git-fixture timeout flakes that pass isolated and serially). Gates: lint, format:check, typecheck, build, gen:schemas idempotent, smoke:cli, smoke:package (`cynrath-agent-context-kit-0.5.0-dev.0.tgz`, nothing published), `vsce package` → `ackit-vscode-0.5.0-dev.0.vsix` 653263 bytes <2MB file-list clean (artifact removed), offline-egress PASS, text-hygiene clean, doctor/task-doctor/skills-validate/scan--ci (readiness 88) PASS, `git diff --check` clean.

No-publication proof: `git tag --list v0.5*` empty; `npm view` → `0.4.1`; `gh release list` latest `v0.4.1`; no Marketplace publish; `maintenance/v0.4.1` and `feat/browser-companion-v0.3` untouched; TASK-0079..0086 not started. Fresh-verifier + squash-merge gate happens on the PR.
