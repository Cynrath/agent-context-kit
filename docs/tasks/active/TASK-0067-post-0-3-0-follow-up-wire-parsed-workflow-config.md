---
id: "TASK-0067"
title: "post-0.3.0 follow-up: wire parsed workflow config keys into gate behavior"
status: pending
schemaVersion: 2
dependencies:
  - "TASK-0066"
createdAt: "2026-09-02"
completedAt: null
---

## Purpose

Close the documented v0.3.0 limitation: `ackit.yml` `workflow:` keys (`defaultProfile`, `requireVerifier`, `profiles.{requireEvidence,requireVerifier}`) currently parse and validate (see `docs/reference/config.md`) but do not yet alter workflow gate behavior — the completion gate uses only the built-in profile requirements set via `ackit workflow set --profile`. Wire the parsed configuration into actual gate evaluation so repositories can tune evidence/verifier requirements per profile without CLI invocations.

## Current-state evidence

- `src/core/config/schema.ts` + `schemas/ackit.schema.json` already define/validate `workflow` config keys (additive; legacy repositories unaffected).
- `docs/reference/config.md` explicitly records: "these keys do not alter gate behavior in this release — recorded as a known limitation (final-validation audit TASK-0064)".
- Completion-gate evaluation (`src/core/workflow/gates.ts` + task completion path) reads the stored workflow state/profile requirements only.

## Scope

- Thread resolved `workflow` config into the completion gate and workflow `advance`/`verify` gate evaluation (default profile selection, `requireEvidence`, `requireVerifier`, per-profile overrides).
- Preserve exact legacy behavior for repositories without `workflow:` config (`tests/integration/compat/legacy-repository.test.ts` must stay green with unchanged outputs).
- Update `docs/reference/config.md` (replace limitation note with effective semantics) and add the CHANGELOG entry in the release that ships this change.

## Out of scope

- Any change to published v0.3.0 artifacts (tag/npm/Release/VSIX immutable).
- New config keys beyond the already-parsed set; schema shape changes beyond semantics wiring.

## Affected files

- `src/core/workflow/gates.ts`, `src/core/workflow/store.ts`
- `src/core/config/load.ts`
- `tests/unit/workflow/*`, `tests/integration/tasks/workflow-cli.test.ts`, `tests/integration/compat/legacy-repository.test.ts`
- `docs/reference/config.md`, CHANGELOG (next release)

## Acceptance criteria

- [ ] `workflow.requireEvidence`/`requireVerifier`/`defaultProfile`/profile overrides measurably change gate outcomes (unit tests with config fixtures proving gate denies/allows accordingly)
- [ ] Legacy fixture: repositories without `workflow:` config behave exactly as v0.3.0 (behavior/snapshot test unchanged)
- [ ] Full gate matrix green (lint/format/typecheck/build/test/scan --ci), task doctor OK
- [ ] `docs/reference/config.md` limitation note replaced by effective-behavior documentation

## Test steps

1. Unit tests: config-driven gate matrix (profile × requireEvidence × requireVerifier × default).
2. Integration: config-bearing repo advances/verifies/completes per config; legacy repo unchanged.
3. `node dist/cli/index.js config check` accepts existing configs (no breaking validation).
4. Full `pnpm test` + `scan --ci`.

## Risks

- Completion-gate semantics change for review-policy-configured repos (TASK-0064 documented this exact risk) — mitigate with additive-only semantics: keys only tighten gates when explicitly set, never loosen built-in minimums.

## Rollback plan

Focused commit revert; config parsing surface stays valid (schema unchanged).

## Completion notes

(proposed post-0.3.0 maintenance chain; planned 2026-09-02 during the v0.3.0 release session per release-task §20 — not executed in the release itself)
