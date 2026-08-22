# TASK-0270: vNext scan engine core pipeline and findings

## Metadata

- Parent epic: TASK-0264
- Dependencies: TASK-0268, TASK-0269
- Unlocks: TASK-0271, TASK-0273 (consumes graph output later), TASK-0279, TASK-0282, TASK-0283, TASK-0284
- Requirement IDs: REQ-SCAN-001, REQ-SCAN-002, REQ-SCAN-007 (terminal+json), REQ-TEST-004/006 partials, REQ-DX-001 (`ackit scan`)
- Related ADR/spec: ADR-0009 (scan/rule architecture), ADR-0007 (exit codes); MS§12

## Purpose

Implement the scan pipeline and stable finding contract with terminal + JSON reporters, deterministic ordering/fingerprints, severity thresholds driving exit codes.

## Scope

- Pipeline stages per REQ-SCAN-001 wired over fs engine; bounded parallel rule evaluation.
- Finding schema (REQ-SCAN-002) as zod type + emitted JSON contract snapshot.
- Rule registry interface (planning stage selects enabled rules by category/config/policy).
- Reporters: pretty terminal (sanitized per REQ-GOV-005) and `--json` pure stdout.
- `ackit scan` command wiring incl. `--ci` threshold behavior → exit 1 when exceeded (ADR-0007).

## Out of scope

Concrete rule catalog content (TASK-0271); baseline/cache/incremental flags (TASK-0279); SARIF/MD/HTML reporters (TASK-0284).

## Affected files

- `src/core/scanner/**`, `src/core/reporting/**` (terminal/json only), `src/cli/commands/scan.ts`
- `tests/unit/scanner/**`, `tests/contract/findings-schema/**`, `tests/integration/scan/**`

## Data/database impact

None.

## Security impact

Evidence redaction enforced at finding-contract level so no downstream reporter can leak secrets.

## Permission/auth impact

None.

## Localization impact

English messages.

## UX impact

Deterministic output order across runs on same repo+config (contract-tested).

## Logging/audit impact

Findings carry fingerprint+documentationKey for audit trails.

## Acceptance criteria

- [ ] Contract snapshot: JSON findings array matches published schema exactly.
- [ ] Determinism test: two consecutive scans produce byte-identical JSON (excluding timestamps field explicitly excluded from contract).
- [ ] Threshold exceeded ⇒ exit 1; clean repo ⇒ 0; invalid config ⇒ 2 (integration asserts).
- [ ] Secret-like evidence string in a fixture file never appears in any output (redaction regression).
- [ ] Cancellation mid-scan yields prompt abort without partial corrupt JSON.

## Test steps

`pnpm vitest run tests/unit/scanner tests/contract/findings-schema tests/integration/scan`.

## Risks

Ordering instability across platforms → sort keys defined in ADR-0009 (path then ruleId then line).

## Rollback plan

Focused commit.

## Completion notes

(placeholder)
