---
id: "TASK-0056"
title: "provider-independent role contracts"
status: completed
schemaVersion: 2
dependencies: ["TASK-0052"]
createdAt: "2026-08-31"
completedAt: 2026-09-01
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

- [x] Seven built-in roles ship, strict-validate, and list deterministically; `ackit role show verifier` prints the mandated verifier rules.
- [x] Repository-defined roles validate with the same schema and cannot shadow built-in ids (refusal covered by test).
- [x] Verification bundle embeds the verifier role contract.
- [x] `schemas/role.schema.json` committed and current; tests pass with recorded counts.
- [x] No runtime/spawner/orchestrator code introduced anywhere (review + test surface).

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

- `src/core/roles/` (types/load/index): `ackit.role.v1` strict contract
  (role/title/description/requiredInputs[8 kinds]/allowedActions/forbiddenActions/
  requiredOutputs/outputSchema — all bounded, unknown fields rejected, no executable
  metadata possible). Data ONLY — validated, never executed; no spawner/router/
  orchestrator exists anywhere (verified by review: only load/validate/print code).
- Seven built-in roles shipped in `templates/roles/` (packaged via the existing
  `files` list): researcher, architect, implementer, verifier, security-reviewer,
  documentation-reviewer, release-reviewer — deterministic id ordering on list. The
  verifier role encodes the mandated rules (inspect intent/spec/plan/task/diff/tests/
  evidence; must not implement what it judges; must emit ackit.verdict.v1).
- `listRoles`/`loadRole`: built-ins resolve from the packaged templates directory via
  import.meta.url (src+dist layouts both correct, Windows-safe fileURLToPath);
  repository roles under `docs/roles/*.yaml` validate with the same schema and CANNOT
  shadow built-in ids (ROLE-SHADOW-REFUSED — the built-in stays authoritative, T25);
  invalid/broken YAML produce stable diagnostics (ROLE-INVALID), never crash listing.
- Verification bundle now embeds a "Verifier role contract" section (bundle.ts) so
  every fresh verifier sees its obligations inline.
- CLI `ackit role list|show|validate` registered (JSON shape `ackit.role-report.v1`);
  smoke-verified: `role list` prints the seven; `role show verifier` prints the
  mandated rules.
- `schemas/role.schema.json` emitted and committed; `pnpm gen:schemas` idempotent.
- Tests: unit 7/7 (strict schema + executable-metadata rejection, seven-role catalog,
  verifier-rule encoding, repository-role validation + listing, shadow refusal with
  built-in intact, invalid-role diagnostics, ROLE-NOT-FOUND). Focused roles+verification
  suites 15/15. Full sequential suite result recorded in the commit.
- Gates: typecheck clean; lint 0 problems (276 files); format:check clean.
