---
id: "TASK-0056"
title: "provider-independent role contracts"
status: pending
schemaVersion: 2
dependencies: ["TASK-0052"]
createdAt: "2026-08-31"
completedAt: null
---

## Purpose

Define portable, provider-independent role contracts (§13) that any agent (Codex/Claude/OpenCode/Copilot/Gemini/etc.) may consume when spawning subagents — without ACKit building a subagent runtime, router, or spawner.

## Scope

- `src/core/roles/types.ts`: `ROLE_SCHEMA_ID = "ackit.role.v1"`; `RoleContractSchema` (strict): `{ schemaId, role: kebab-id, title, description, requiredInputs: string[] (artifact kinds: intent, spec, plan, task, diff, tests, evidence, verdict), allowedActions: string[], forbiddenActions: string[], requiredOutputs: string[] (e.g. "ackit.verdict.v1"), outputSchema?: bounded string }` with bounded field lengths.
- Built-in role catalog shipped as package data under `templates/roles/`: `researcher`, `architect`, `implementer`, `verifier`, `security-reviewer`, `documentation-reviewer`, `release-reviewer` — each strict-validated YAML. Verifier role encodes the mandated rules: may inspect intent/spec/plan/diff/tests/evidence; should not implement the feature it judges; must emit `ackit.verdict.v1`.
- `src/core/roles/load.ts`: load + validate built-in roles and optional repository roles under `docs/roles/*.yaml` (user-defined, validated with the same schema; unknown ids refused); deterministic ordering by role id.
- CLI `ackit role` (`src/cli/commands/role.ts`): `list`, `show <role>`, `validate [role]` (all when omitted).
- Verification bundle integration: `ackit verification bundle` embeds the `verifier` role contract section (so a fresh verifier sees its contract) — wiring in `bundle.ts`.
- `schemas/role.schema.json` generated.
- Tests: role schema strictness/invalid-input, built-in catalog validation (all seven roles parse), repository-role loading + collision refusal (user role may not shadow built-ins), bundle embedding, determinism.

## Out of scope

- Subagent spawning/routing/orchestration (belongs to providers).
- Role-conditioned behavior in ACKit core beyond contract validation and bundle embedding.

## Affected files

- `src/core/roles/types.ts`, `load.ts`, `index.ts` (new)
- `templates/roles/*.yaml` (new, 7 files), package `files` already includes `templates`
- `src/cli/commands/role.ts` (new), `src/cli/program.ts`
- `src/core/verification/bundle.ts` (verifier role embedding)
- `scripts/generate-schemas.mjs`, `schemas/role.schema.json` (new)
- `tests/unit/roles/*.ts`, `tests/integration/roles/*.ts` (new)

## Acceptance criteria

- [ ] Seven built-in roles ship, strict-validate, and list deterministically; `ackit role show verifier` prints the mandated verifier rules.
- [ ] Repository-defined roles validate with the same schema and cannot shadow built-in ids (refusal covered by test).
- [ ] Verification bundle embeds the verifier role contract.
- [ ] `schemas/role.schema.json` committed and current; tests pass with recorded counts.
- [ ] No runtime/spawner/orchestrator code introduced anywhere (review + test surface).

## Test steps

1. `pnpm typecheck && pnpm lint && pnpm format:check`
2. `pnpm build && pnpm gen:schemas` (`git diff --exit-code schemas/`)
3. `pnpm vitest run tests/unit/roles tests/integration/roles tests/unit/verification`
4. Full `pnpm test`.

## Security considerations

- Role contracts are data only — validated, never executed; forbidden actions are advisory text consumed by the spawning agent, and this limitation is documented.
- User role files are untrusted input: length caps, strict schema, no path interpretation.

## Risks

- Providers ignoring role contracts — acceptable; contracts are portable suggestions, not enforcement (documented).

## Rollback plan

Focused revert; additive module + data files.

## Completion notes

(placeholder)
