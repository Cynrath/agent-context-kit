---
id: "TASK-0078"
title: "v0.5 baseline and maintenance-aware release-state model"
status: pending
schemaVersion: 2
dependencies:
  []
createdAt: "2026-09-04"
completedAt: null
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

- [ ] Release-policy audit recorded (ADR-0023, parity script, release workflow, current-facing surfaces, npm latest) with live evidence.
- [ ] Four version concepts defined, recorded, and asserted in distinct places; no concept conflated.
- [ ] `README says 0.4.0 while npm latest is 0.4.1` class of staleness is impossible or mechanically detected (proven by positive + negative probes).
- [ ] Parity guard green on the new model; historical references still pass; contract tests cover each concept.
- [ ] No PUBLIC/STABLE release bump or publication side effects (`git tag --list`, `npm view`, GitHub Release, Marketplace remain 0.4.1). A source/development-version transition (e.g. to `0.5.0-dev.0`) is allowed only if selected by the ADR; it is NOT a public/stable release.
- [ ] Decision recorded as ADR addendum/new ADR; task completed through the real gate with evidence.

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

## Completion notes

(placeholder)
