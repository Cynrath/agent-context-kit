---
id: "TASK-0050"
title: "evidence contract v2: registry, validation, CLI"
status: completed
schemaVersion: 2
dependencies: ["TASK-0045", "TASK-0047"]
createdAt: "2026-08-31"
completedAt: 2026-09-01
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

- [x] Evidence registry round-trips strict-validated; criteria sync deterministically from the task doc; ids unique and document-ordered.
- [x] `validate` denies missing mandatory evidence with stable finding codes; manual-only evidence is insufficient unless explicitly allowed by config.
- [x] Secret-shaped refs rejected at registration and validation; refs length-capped.
- [x] `schemas/evidence.schema.json` committed and current; tests pass with recorded counts.

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

- Implemented `src/core/evidence/` (types/sync/store/validate/index):
  `ackit.evidence.v2` strict registry schema (unknown fields rejected, T17);
  frozen 14-value evidence-type enum; per-criterion `{id: AC-###, requirement,
  status: unverified|verified, evidence[{type, ref, recordedAt}]}`.
- `criteriaFromTaskDoc`/`syncRegistry`: the task doc's `## Acceptance criteria`
  section is the criterion source of truth; ids assigned in document order;
  checkbox state is NOT copied (implementation ≠ verified — asserted by test);
  sync preserves recorded evidence only for unchanged requirement text.
- `validateEvidence`: deterministic completeness — `CRITERION_UNVERIFIED`,
  `REQUIRED_EVIDENCE_MISSING` (manual-only insufficient by default;
  `allowedTypes` config can allow manual), `EVIDENCE_REF_INVALID`,
  `EVIDENCE_SECRET_REF` (canonical secret gate reused — single detection
  source), duplicate-criterion detection; problems sorted criterion→code
  (determinism asserted).
- `EvidenceStore` at `.ackit/workflow/TASK-####/evidence.yaml`: id validation
  BEFORE any registry access (traversal safe), forged criterion ids rejected
  (`EVIDENCE-CRITERION-UNKNOWN`), tampered files rejected on load; refs
  length-capped (500) and dates calendar-validated.
- CLI `ackit evidence sync|show|verify|validate` registered; workflow gate
  now resolves `evidence` artifact presence via the canonical
  `loadEvidenceRegistry` loader (single source, no drift). Exit semantics:
  validate → 1 on missing mandatory evidence (gate), usage 2 on forged ids.
- `schemas/evidence.schema.json` emitted and committed; `pnpm gen:schemas`
  idempotent.
- Tests: unit 9/9 (sync order + non-copy invariant, evidence preservation on
  unchanged requirements, mandated evidence-gate scenario, manual-config
  override, secret-ref rejection, deterministic ordering, store round-trip,
  forged ids, tamper rejection) + CLI integration 2/2 (full
  sync→show→denied→manual-still-denied→qualified→passed flow; forgery guard).
  Full suite: 77 files / 431 tests green.
- Gates: typecheck clean; lint 0 problems (249 files); format:check clean.
