---
id: "TASK-0050"
title: "evidence contract v2: registry, validation, CLI"
status: pending
schemaVersion: 2
dependencies: ["TASK-0045", "TASK-0047"]
createdAt: "2026-08-31"
completedAt: null
---

## Purpose

Implement the versioned evidence contract (ADR-0026, §5): link acceptance criteria to typed proof so that "implementation exists" is never mistaken for "acceptance criterion verified", and give ACKit a deterministic completeness check.

## Scope

- `src/core/evidence/types.ts`: `EVIDENCE_SCHEMA_ID = "ackit.evidence.v2"`; `EvidenceEntrySchema` with `type` (enum: `test | build | lint | typecheck | benchmark | runtime | e2e | ci | git | static-analysis | security-scan | manual | external | verifier-verdict`) and `ref` (bounded string: command, path, run/URL-id, or record id — no secrets); `AcceptanceCriterionSchema` with `id` (`AC-###`), `requirement`, `status` (`unverified | verified`), `evidence[]`; `EvidenceRegistrySchema` (strict) with `schemaId`, `taskId`, `criteria[]`, `updatedAt` (date-only ISO).
- `src/core/evidence/store.ts`: per-task registry at `.ackit/workflow/TASK-####/evidence.yaml`; atomic deterministic writes; containment.
- `src/core/evidence/sync.ts`: `syncCriteriaFromTask(taskDoc)` — derive criterion ids/requirements from the task's `## Acceptance criteria` section so the registry and the human checklist stay aligned (checkbox state in the doc is NOT copied as verification — only listed); criterion id assignment deterministic (AC-001… in document order).
- `src/core/evidence/validate.ts`: `validateEvidence(registry, requirements)`: every criterion has status `verified` and ≥1 evidence entry whose type satisfies the profile-configured required evidence types for the criterion (default: at least one non-manual entry unless the profile/config explicitly allows manual); evidence refs non-empty, length-capped, secret-gated. Returns structured findings (`REQUIRED_EVIDENCE_MISSING`, `CRITERION_UNVERIFIED`, `EVIDENCE_REF_INVALID`).
- CLI `ackit evidence` (`src/cli/commands/evidence.ts`): `sync <TASK-ID>` (create/refresh registry from task criteria), `show <TASK-ID>`, `verify <TASK-ID> --criterion AC-001 --type test --ref "<text>"` (append evidence + set status), `validate <TASK-ID>` (gate-style exit code).
- `schemas/evidence.schema.json` generated.
- Tests: unit (schema strictness, unknown-field rejection, invalid inputs), integration (CLI flow on fixture), security (secret-shaped `ref` rejected; forged-criterion ids not present in the task rejected with structured error).

## Out of scope

- Completion-gate enforcement (TASK-0053 wires `validateEvidence` into `task complete`).
- Verifier verdicts as evidence entries beyond the `verifier-verdict` type passthrough (TASK-0052 owns verdict registration).
- Any automatic evidence collection — the agent registers evidence; ACKit validates.

## Affected files

- `src/core/evidence/types.ts`, `store.ts`, `sync.ts`, `validate.ts`, `index.ts` (new)
- `src/cli/commands/evidence.ts` (new), `src/cli/program.ts`
- `scripts/generate-schemas.mjs`, `schemas/evidence.schema.json` (new)
- `tests/unit/evidence/*.ts`, `tests/integration/evidence/*.ts` (new)

## Acceptance criteria

- [ ] Evidence registry round-trips strict-validated; criteria sync deterministically from the task doc; ids unique and document-ordered.
- [ ] `validate` denies missing mandatory evidence with stable finding codes; manual-only evidence is insufficient unless explicitly allowed by config.
- [ ] Secret-shaped refs rejected at registration and validation; refs length-capped.
- [ ] `schemas/evidence.schema.json` committed and current; tests pass with recorded counts.

## Test steps

1. `pnpm typecheck && pnpm lint && pnpm format:check`
2. `pnpm build && pnpm gen:schemas` (`git diff --exit-code schemas/`)
3. `pnpm vitest run tests/unit/evidence tests/integration/evidence`
4. Full `pnpm test`.

## Security considerations

- Evidence refs are untrusted strings: never executed, never interpreted as paths for reads beyond containment-checked repository-relative checks; secret-gated; length-capped.
- Forged criteria (ids not present in the task doc) rejected — the task doc is the criterion source of truth.

## Risks

- Registry/task checklist divergence — mitigated by `sync` + completion-gate cross-check (TASK-0053).

## Rollback plan

Focused revert; additive module.

## Completion notes

(placeholder)
