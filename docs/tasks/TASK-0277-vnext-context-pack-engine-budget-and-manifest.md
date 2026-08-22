# TASK-0277: vNext context pack engine budget and manifest

## Metadata

- Parent epic: TASK-0264
- Dependencies: TASK-0272, TASK-0274, TASK-0268 (fs), TASK-0281 (active task input; may land after — interface stubbed here)
- Unlocks: TASK-0278, TASK-0283
- Requirement IDs: REQ-CTX-001, REQ-CTX-002, REQ-CTX-003, REQ-CTX-004, REQ-GOV-004, REQ-TEST-006 (manifest determinism)
- Related ADR/spec: ADR-0003 (context budget/pack architecture); MS§14

## Purpose

Implement deterministic, budgeted context pack generation with safety guarantees and a complete manifest contract.

## Scope

- Selection inputs per REQ-CTX-001; ranking signals per REQ-CTX-003 implemented as transparent weighted scoring (weights documented in ADR-0003, no ML).
- Token estimator: provider-independent character-class heuristic labeled estimate everywhere; adapter seam reserved.
- Budget algorithm with explained truncation/exclusion decisions; `--max-tokens`, `--changed`, `--format markdown|json`.
- Manifest: included/excluded entries with reason, estimatedTokens, hash, relativePath (forward-slash normalized).
- Safety filters: absolute-path scrubbing, secret re-scan pass over emitted content, binary exclusion, out-of-root impossibility via fs engine, dedupe by content hash.

## Out of scope

Optimize suggestions (TASK-0278); MCP exposure.

## Affected files

- `src/core/context/**`, `src/cli/commands/pack.ts`
- `tests/unit/context/**`, `tests/integration/context/**`, `tests/security/context/**`

## Data/database impact

None.

## Security impact

Directly enforces REQ-GOV-004/GOV-005 at artifact boundary; security tests include planted absolute path + secret inside candidate files.

## Permission/auth impact

None.

## Localization impact

Pack preamble English; user repo content passed through untouched otherwise.

## UX impact

Budget overrun message explains what was cut and why (deterministic wording tested).

## Logging/audit impact

Manifest doubles as audit artifact; hashes reproducible cross-platform.

## Acceptance criteria

- [ ] Same repo+config ⇒ two packs byte-identical except declared timestamp field excluded from contract (determinism test).
- [ ] Planted secret in candidate file → file excluded/redacted + finding reference; raw value absent from output.
- [ ] Absolute local path never appears in markdown or json outputs (regex contract over fixtures incl. Windows-style paths).
- [ ] Ranking order matches documented weight table for golden fixture (unit).
- [ ] --changed limits candidates to Git-changed set (with TASK-0279 git module or temp fallback).

## Test steps

`pnpm vitest run tests/unit/context tests/integration/context tests/security/context`.

## Risks

Estimator drift claims → always labeled "estimate"; no exact-token promises anywhere in docs/tests.

## Rollback plan

Focused commit.

## Completion notes

(placeholder)
