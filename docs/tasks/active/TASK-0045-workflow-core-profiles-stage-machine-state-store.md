---
id: "TASK-0045"
title: "workflow core: profiles, stage machine, state store"
status: pending
schemaVersion: 2
dependencies: ["TASK-0044"]
createdAt: "2026-08-31"
completedAt: null
---

## Purpose

Implement the first-class workflow engine core (ADR-0025): the three built-in profiles, the deterministic stage machine, the per-task workflow state store under `.ackit/workflow/`, the `ackit.yml` `workflow:` config section, and the `ackit workflow` CLI family.

## Scope

- New module `src/core/workflow/`:
  - `types.ts` — zod schemas: `WORKFLOW_SCHEMA_ID = "ackit.workflow.v1"`; profiles `quick | standard | high-risk` (kebab-case ids); stages per profile in canonical order (quick: `task → implement → verify`; standard: `intent → plan → tasks → implement → verify → review`; high-risk: `intent → spec → plan → tasks → implement → verify → independent-review → release-evidence`); stage transition map (forward-only within a profile; `verify → implement` allowed as the explicit verify/fix loop regression); `WorkflowStateSchema` (strict, unknown fields rejected) with `schemaId`, `taskId`, `profile`, `stage`, `createdAt`, `updatedAt` (date-only ISO), `stageHistory` (deterministic ordering), `verificationAttempts` (array, capped).
  - `profiles.ts` — built-in profile catalog with per-stage required artifacts (quick: task required at `task`, evidence optional; standard: intent required at `intent`, plan at `plan`, evidence at `verify`; high-risk: intent+spec+plan+evidence+verdict at `independent-review`/`release-evidence`), plus a resolve function merging optional user overrides from config.
  - `store.ts` — `WorkflowStore` (mirrors `TaskStore` patterns): read/write YAML state files under `.ackit/workflow/TASK-####/state.yaml` (gitignored local state), atomic writes, deterministic serialization (stable key order), refuse paths outside the canonical root (containment identical to filesystem boundary rules).
  - `validate.ts` — `validateWorkflowState`: schema validation + stage-order validation + required-artifact resolution against the profile catalog; returns structured problems (no throw for reportable cases).
- Config: extend `AckitConfigSchema` with an optional strict `workflow` object (defaults preserved for configs without the section; unknown keys rejected): `{ defaultProfile?: "quick"|"standard"|"high-risk", requireVerifier?: boolean, profiles?: { requireEvidence?: boolean, requireVerdict?: boolean } }` — additive only; `ackit.schema.json` regenerated via `pnpm gen:schemas`.
- CLI: `ackit workflow` family following existing command conventions (`src/cli/commands/workflow.ts`, registered in `program.ts`):
  - `ackit workflow show [TASK-ID]` — resolved profile, stage, required artifacts, missing artifacts (defaults to the single active task).
  - `ackit workflow set <TASK-ID> --profile <id>` — explicit machine-readable selection; writes state file; refuses unknown profile ids.
  - `ackit workflow advance <TASK-ID> [--to <stage>]` — forward-only transition with required-artifact gate; emits `WORKFLOW_STAGE_INVALID` when out of order; explicit `--to` only for named non-adjacent forward jumps.
  - `ackit workflow verify <TASK-ID>` — record a verification attempt outcome (`--outcome pass|fail`) for the verify/fix loop state (§16); `fail` rewinds stage to `implement` deterministically.
- Generated schema: `schemas/workflow.schema.json` via `scripts/generate-schemas.mjs`.
- Unit + contract tests: stage-order validity per profile, unknown-profile rejection, strict unknown-field rejection, state determinism (same inputs → byte-identical YAML), containment (task id / path traversal refusal), config default compatibility (config without `workflow:` section still parses), CLI wiring tests.

## Out of scope

- Evidence registry, verdicts, checkpoints, drift detection, completion-gate enforcement (later tasks).
- MCP/SDK exposure (TASK-0059).
- Any LLM inference of profile selection.

## Affected files

- `src/core/workflow/types.ts` (new), `profiles.ts` (new), `store.ts` (new), `validate.ts` (new), `index.ts` (new)
- `src/core/config/schema.ts`, `src/core/config/json-schema.ts` (workflow section)
- `src/cli/commands/workflow.ts` (new), `src/cli/program.ts`
- `scripts/generate-schemas.mjs`, `schemas/workflow.schema.json` (new), `schemas/ackit.schema.json` (regenerated)
- `tests/unit/workflow/*.ts` (new), `tests/integration/tasks/*.ts` (workflow CLI integration)

## Acceptance criteria

- [ ] `ackit workflow set/show/advance/verify` work end-to-end on a fixture repository; state YAML is deterministic and strict-validated.
- [ ] Stage transitions are validated: skipping stages or moving backwards without the explicit verify-fail rewind is rejected with `WORKFLOW_STAGE_INVALID`.
- [ ] Required artifacts per profile resolve deterministically from the catalog + config overrides; missing artifacts block advancement with a structured finding.
- [ ] Legacy configs and task documents without workflow state are unaffected (existing test suite green, no behavior change for `task` commands).
- [ ] `schemas/workflow.schema.json` and regenerated `schemas/ackit.schema.json` committed and current (`pnpm gen:schemas` produces no diff).
- [ ] Focused test suite passes with recorded pass counts (unit + integration).

## Test steps

1. `pnpm typecheck && pnpm lint && pnpm format:check`
2. `pnpm build && pnpm gen:schemas` (then `git diff --exit-code schemas/` proves currency)
3. `pnpm vitest run tests/unit/workflow tests/integration/tasks`
4. Full `pnpm test` to prove no regression in existing subsystems.

## Security considerations

- State-file writes confined to `.ackit/workflow/` under the canonical repository root; task IDs validated against `^TASK-\d{4}$` before any path construction (path traversal prevention).
- Unknown fields rejected (strict zod objects) — malicious repository state files cannot smuggle fields.
- No timestamps with sub-day precision in serialized state (determinism; date-only ISO).

## Risks

- Scope creep into evidence/verdict semantics — mitigated by keeping `requiredArtifacts` as string identifiers resolved by later tasks.
- Windows path normalization in state store — mitigated by POSIX-only relative paths inside state files.

## Rollback plan

Focused revert of the workflow module + config/CLI commits; no migration needed (additive).

## Completion notes

(placeholder)
