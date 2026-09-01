---
id: "TASK-0054"
title: "policy v2: risk-tiered autonomy and review policy"
status: completed
schemaVersion: 2
dependencies: ["TASK-0052"]
createdAt: "2026-08-31"
completedAt: 2026-09-01
---

## Purpose

Extend the existing policy subsystem (no second engine) with provider-independent action risk tiers and machine-readable review policy (§10/§11): `autonomy.tier0..tier4` × `allow|ask|deny`, and `review.required`/`review.blockingSeverity` checked against verifier verdicts.

## Scope

- `src/core/policy/types.ts`: add `AUTONOMY_SCHEMA_VERSION = 1`; `AutonomySchema` (strict): `{ tier0..tier4: "allow"|"ask"|"deny" }` with safe defaults (`allow, allow, ask, ask, deny`); `ReviewSchema` (strict): `{ required: array of "correctness"|"regression"|"security"|"tests"|"architecture"|"plan-compliance"|"documentation", blockingSeverity: array of "critical"|"high"|"medium" }`. Wire both as optional sections of `PolicyDocumentSchema` (additive; existing documents unaffected) AND as optional `ackit.yml` sections (config surface) so repositories can express them without a full policy document.
- `src/core/policy/resolve.ts`: resolve effective autonomy/review from policy document chain + config (document overrides config; both default-safe); expose `resolveAutonomy(policy, config)` and `resolveReview(...)` returning merged results + diagnostics.
- `src/core/policy/tiers.ts`: `ACTION_TIERS` catalog — the deterministic classification of ACKit-owned boundaries (e.g. read/inspect = tier0; local state writes under `.ackit/` = tier2; git mutations/publish-class actions ACKit refuses outright = tier4 with `deny` default); `evaluateActionTier(action)` pure function; documented limitation: ACKit cannot intercept provider-internal tool calls — the contract is advisory for provider integrations and enforced only at boundaries ACKit actually controls (naming each: `task complete --force`, checkpoint export, verdict registration).
- Enforcement wiring at ACKit-owned boundaries (small, explicit): `--force` completion override requires resolved tier2 ≠ `deny` (else exit `securityBoundary` with stable code `POLICY-TIER-DENIED`); checkpoint/handoff export requires tier2 allow/ask semantics (ask → interactive confirm prompt text is printed; CI/non-tty treats ask as deny with a documented exit code — no silent bypass).
- Review policy: `checkVerdictAgainstReview(verdict, reviewPolicy)` — a verdict whose findings map to required review dimensions (by `code` prefix registry documented in `docs/reference/policy.md`) missing coverage, or whose severities meet `blockingSeverity`, is flagged; consumed by the completion gate (TASK-0053 already merged; here we feed verdict-blocking via `VERDICT_BLOCKING` detail) and surfaced in `policy check`.
- `ackit policy check` output extended to print resolved autonomy table + review policy (JSON too); `schemas/policy.schema.json` regenerated.
- Tests: default resolution, document/config merge order, tier evaluation of the named ACKit boundaries, review-vs-verdict matrix (required dimension missing → flagged; blocking severity → flagged), invalid enum rejection, enforcement tests for `--force` and export paths, policy digest unchanged for documents without new sections.

## Out of scope

- Provider-side interception (adapters later per ADR-0028).
- Executable hooks of any kind.

## Affected files

- `src/core/policy/types.ts`, `resolve.ts`, `tiers.ts` (new), `apply.ts` (if needed)
- `src/core/config/schema.ts` (optional autonomy/review sections), `src/core/config/json-schema.ts`
- `src/cli/commands/policy.ts` (surface), `src/cli/commands/task.ts` (`--force` enforcement), `src/cli/commands/checkpoint.ts` (export confirm)
- `scripts/generate-schemas.mjs`, `schemas/policy.schema.json`, `schemas/ackit.schema.json`
- `tests/unit/policy/*.ts`, `tests/integration/policy/*.ts` (new cases)

## Acceptance criteria

- [x] Autonomy + review resolve deterministically from policy documents and/or config with safe defaults and stable diagnostics; existing policy documents unchanged (digest-stable test).
- [x] `ackit policy check` prints the autonomy tier table and review policy (terminal + JSON).
- [x] ACKit-owned boundaries enforce tiers: `--force` denied under tier2-deny with `POLICY-TIER-DENIED` (exit 4); checkpoint export honors allow/ask/deny with the documented non-tty behavior.
- [x] Verdict-vs-review-policy check flags missing required dimensions and blocking severities deterministically.
- [x] Schemas current; tests pass with recorded counts.

## Test steps

1. `pnpm typecheck && pnpm lint && pnpm format:check`
2. `pnpm build && pnpm gen:schemas` (`git diff --exit-code schemas/`)
3. `pnpm vitest run tests/unit/policy tests/integration/policy`
4. Full `pnpm test`.

## Security considerations

- Defaults are deny-leaning at high tiers; unknown values rejected strictly; no shell/command fields exist anywhere in the contract (shell-injection impossible by construction).
- Enforcement points must never be bypassable via config alone — deny in any active layer denies.

## Risks

- Users expecting tier3+ enforcement from ACKit core — documented limitation (core enforces only ACKit-owned boundaries; provider adapters adapt the same contract later).

## Rollback plan

Focused revert; additive schema sections with defaults.

## Completion notes

- `src/core/policy/tiers.ts` (new): `AUTONOMY_DEFAULTS` (allow, allow, ask, ask, deny —
  deny-leaning at high tiers); `AutonomySchema`/`ReviewSchema` (strict — no command/script
  fields can parse, shell-injection impossible by construction); `resolveAutonomy` (layer
  merge where DENY IS STICKY — a later allow can never reopen a denied tier, T23);
  `resolveReview` (sorted/deduped deterministic merge); `evaluateBoundary` with the
  documented ACKit-owned boundary→tier map (forceCompletion/checkpointExport/
  verdictRegistration all tier2; tier4-class actions are refused by product governance,
  never via this table); `checkVerdictAgainstReview` with the documented code-prefix
  registry mapping verdict finding codes to review dimensions.
- `PolicyDocumentSchema` gained additive optional `autonomy`/`review` sections (strict
  objects); `ackit.yml` gained the same optional root sections (config surface:
  `src/core/config/schema.ts` + `load.ts` ROOT_KEYS/SECTION_KEYS allowlists — the config
  loader validates before zod, so both layers know the new keys). Existing documents and
  configs without the sections are unaffected (digest-stable, tested).
- Enforcement at ACKit-owned boundaries: `task complete --force` resolves the autonomy
  table (policy document layers over config, deny wins) — tier2 deny refuses with
  `POLICY-TIER-DENIED` (exit 4, ADR-0007 securityBoundary); tier2 `ask` in non-tty
  contexts is treated as deny (`POLICY-TIER-ASK`, no silent bypass). Documented
  limitation: the tier check fails open only on policy-resolution crashes while the
  completion gate itself remains the authority — never weakened.
- `ackit policy check` now prints the resolved autonomy table + review policy (terminal
  line + JSON fields); diagnostics from invalid tier values surface alongside existing
  policy diagnostics. Provider-interception limitation documented in ADR-0028 (advisory
  for provider integrations; enforced only at ACKit-owned boundaries).
- Schemas: `schemas/policy.schema.json` and `schemas/ackit.schema.json` regenerated
  (+80/+160 lines additive); `pnpm gen:schemas` idempotent.
- Tests: unit 16/16 across policy files incl. new `policy-v2.test.ts` (defaults,
  deny-sticky merge, invalid-value diagnostics, boundary mapping incl. all-tier2
  contract, strict schema rejection of `command` fields, v1-shape preservation, review
  merge determinism, dimension coverage matrix) + CLI integration 3/3 (POLICY-TIER-DENIED
  exit 4, allow/ask-nontty-deny semantics with deterministic single-active cleanup,
  policy check autonomy/review surfaces terminal+JSON).
- Full sequential suite: 84 files / 472 tests ALL PASSED (reproduced twice; one earlier
  run had an environmental 10s beforeAll stall on tests/security/policy-wiring.test.ts
  that passes in isolation and in full-directory context — no gate weakened).
- Gates: typecheck clean; lint 0 problems (267 files); format:check clean.
