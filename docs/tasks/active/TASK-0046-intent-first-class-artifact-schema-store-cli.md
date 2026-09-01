---
id: "TASK-0046"
title: "intent first-class artifact: schema, store, CLI"
status: active
schemaVersion: 2
dependencies: ["TASK-0044", "TASK-0045"]
createdAt: "2026-08-31"
completedAt: null
---

## Purpose

Implement the normalized, provider-independent Intent contract (ADR-0025/0027): committed, schema-versioned intent documents under `docs/intent/`, deterministic normalization and fingerprinting, and the `ackit intent` CLI. ACKit only validates/normalizes/stores/references — it never calls an LLM.

## Scope

- `src/core/intent/types.ts`: `INTENT_SCHEMA_ID = "ackit.intent.v1"`; `IntentDocSchema` (strict) with fields: `id` (`INTENT-####`), `title`, `status` (`draft | accepted | superseded`), `createdAt`, `source` (free-form provenance string, max length), `problem`, `desiredOutcome` (required, min length 1), `constraints[]`, `nonGoals[]`, `affectedSystems[]`, `acceptanceCriteria[]` (each `{ id: "AC-###", requirement }` with unique ids), `openQuestions[]`, `risks[]`.
- `src/core/intent/store.ts`: `IntentStore` — reads `docs/intent/INTENT-####-slug.md` documents (frontmatter + prose body); nextId allocation mirroring `TaskStore`; deterministic serialization; `fingerprint(intent)` = sha256 over canonicalized JSON serialization (sorted keys, LF line endings) — stable across machines.
- `src/core/intent/normalize.ts`: normalization to the canonical machine form (trim, collapse whitespace, dedupe + sort array fields deterministically, validate acceptance-criterion id uniqueness); invalid input → structured errors (never a raw zod dump).
- Safety gate: intent content passes the canonical secret-gate rules (`PACK_SECRET_GATE_RULES`) and absolute-path scrubbing before any inclusion in packs/checkpoints/bundles — reuse the pack module's gate helpers, no parallel detection list.
- CLI `ackit intent` (`src/cli/commands/intent.ts`): `new "<title>"` (scaffold document, agent fills content), `list`, `show <id>`, `validate [id]` (all docs when id omitted; exit code per gate conventions), `fingerprint <id>`.
- `schemas/intent.schema.json` generated via `pnpm gen:schemas`.
- Workflow required-artifact resolution: `intent` artifact = an accepted intent whose id is referenced by the task (wired in TASK-0047; here only the resolver primitive `resolveIntentArtifact(taskId)`).
- Tests: unit (schema strictness, normalization determinism, fingerprint stability, invalid inputs), integration (CLI on fixture repo), security (secret-shaped content rejected, path traversal in id refused, absolute-path leakage absent from outputs).

## Out of scope

- LLM-based intent inference (prohibited).
- Intent authoring automation beyond scaffolding; the agent/human writes content.
- MCP/SDK exposure (TASK-0059).

## Affected files

- `src/core/intent/types.ts`, `store.ts`, `normalize.ts`, `index.ts` (new)
- `src/cli/commands/intent.ts` (new), `src/cli/program.ts`
- `scripts/generate-schemas.mjs`, `schemas/intent.schema.json` (new)
- `tests/unit/intent/*.ts`, `tests/integration/intent/*.ts` (new)

## Acceptance criteria

- [ ] `ackit intent new/list/show/validate/fingerprint` work on a fixture repository; documents are strict-validated with unknown-field rejection.
- [x] Fingerprint is byte-stable across directory renames (machine-path independence) and normalizes identical content with formatting differences to the same value.
- [x] Secret-shaped intent content is rejected at validation and never enters emitted surfaces.
- [ ] `schemas/intent.schema.json` committed and current.
- [x] No intent document is required for quick-profile tasks (no behavior change without opt-in).

## Test steps

1. `pnpm typecheck && pnpm lint && pnpm format:check`
2. `pnpm build && pnpm gen:schemas` (`git diff --exit-code schemas/`)
3. `pnpm vitest run tests/unit/intent tests/integration/intent`
4. Full `pnpm test`.

## Security considerations

- Intent ids validated `^INTENT-\d{4}$` before path construction (traversal prevention).
- Intent content is untrusted input: never executed, never auto-followed; secret gate applies before inclusion in any artifact.
- `source` field length-capped to prevent journal/pack bloat.

## Risks

- Over-strict validation blocking legitimate prose — mitigated by keeping only the listed fields strict and allowing a free-form body.

## Rollback plan

Focused revert; additive module, no existing-surface impact.

## Completion notes

- Implemented `src/core/intent/` (types/store/normalize/gate/index): `ackit.intent.v1`
  strict frontmatter schema (unknown fields rejected), docs-first store under
  `docs/intent/INTENT-####-slug.md` with tool-allocated ids (mirrors TaskStore), scaffold
  creation (`intent new`), deterministic normalization (whitespace collapse, dedupe+sort,
  criterion id ordering), and a machine-path-independent sha256 fingerprint over canonical
  sorted-key JSON.
- Secret gate: `src/core/intent/gate.ts` reuses the CANONICAL catalog rules
  (`PACK_SECRET_GATE_RULES`) — single detection source with scan/packs; `intent validate`
  rejects secret-shaped frontmatter/body with `INTENT-SECRET-CONTENT` (exit 1). CLI error
  paths run messages through `assertNoSecretShapes` defensively.
- Real-calendar-date refinement on `createdAt` (rejects e.g. 2026-13-45) — stronger than
  the legacy loose pattern; documented behavior.
- CLI `ackit intent new|list|show|validate|fingerprint` registered; JSON report shape
  `ackit.intent-report.v1`; exit codes follow ADR-0007 (usage 2 for unknown ids,
  thresholdExceeded 1 for failed validation).
- `schemas/intent.schema.json` emitted and committed; `pnpm gen:schemas` idempotent.
- Tests: unit 11/11 (schema strictness, malformed ids/dates, normalization determinism,
  fingerprint stability/change, store round-trip, traversal refusal, duplicate criterion,
  secret-gate rejection) + integration 3/3 (CLI round-trip incl. JSON, unknown-id exits,
  empty-title rejection). Full suite: 71 files / 395 tests passed.
- Gates: typecheck clean; lint 0 problems (228 files); format:check clean; doctor all
  checks passed; task doctor OK; `git diff --check` clean; offline-egress PASS
  (`node scripts/check-offline-egress.mjs` — no new egress primitives).
- Quick-profile tasks require no intent: verified in workflow tests (quick profile
  advances and completes without any intent artifact).
