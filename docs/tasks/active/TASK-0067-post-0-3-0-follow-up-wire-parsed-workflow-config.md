---
id: "TASK-0067"
title: "post-0.3.0 follow-up: wire parsed workflow config keys into gate behavior"
status: completed
schemaVersion: 2
dependencies:
  - "TASK-0066"
createdAt: "2026-09-02"
completedAt: 2026-09-03
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

- [x] `workflow.requireEvidence`/`requireVerifier`/`defaultProfile`/profile overrides measurably change gate outcomes (unit tests with config fixtures proving gate denies/allows accordingly)
- [x] Legacy fixture: repositories without `workflow:` config behave exactly as v0.3.0 (behavior/snapshot test unchanged)
- [x] Full gate matrix green (lint/format/typecheck/build/test/scan --ci), task doctor OK
- [x] `docs/reference/config.md` limitation note replaced by effective-behavior documentation

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

Implemented 2026-09-03 on `feat/post-v030-hardening` (AC-001→004 in order):

- AC-001 (config changes gates): canonical `workflowOverridesFromConfig` /
  `defaultProfileFromConfig` / `resolveProfileRequirements` (additive-only:
  explicit `true` tightens, `false`/absence never loosens) /
  `effectiveRequiredArtifacts` in `src/core/workflow/profiles.ts`, wired into
  the single gate path — task completion gate (`src/core/tasks/store.ts`),
  `workflow set` (default profile)/`show`/`advance`, drift
  (`requiresVerdict` input, default = built-in `profile !== "quick"`), and MCP
  `ackit_workflow_status`. Proven by `tests/unit/workflow/workflow-config.test.ts`
  (8 tests: defaults, quick tightening incl. advance artifacts, per-section
  precedence, defaultProfile validation, CFG-* malformed errors, drift
  verdict tightening, set-default/show-effective e2e, legacy usage error).
- AC-002 (legacy): `tests/integration/compat/legacy-repository.test.ts`
  unchanged and green; `workflowOverridesFromConfig(undefined) == {}` and
  effective artifacts equal catalog without config.
- AC-003 (gates): `pnpm lint` (297 files clean), `format:check` (281 clean),
  `typecheck`, `build`, full `pnpm test` 98 files / 554 tests PASS, `task doctor`
  OK, `scan --ci` exit 0 (readiness 88).
- AC-004 (docs): `docs/reference/config.md` limitation row replaced by
  effective-semantics documentation; `concepts/workflows.md` profile intro
  points at it; MCP reference rows updated.

No schema change (strict shape frozen); no provider/LLM/network dependency.
