# TASK-0282: vNext policy engine declarative packs

## Metadata

- Parent epic: TASK-0264
- Dependencies: TASK-0269, TASK-0270
- Unlocks: TASK-0283 (policy check tool), TASK-0284 (threshold reporting)
- Requirement IDs: REQ-POL-001, REQ-POL-002, REQ-POL-003, REQ-GOV-001 (offline enforcement), REQ-GOV-002, REQ-CFG-004 (policy.schema.json)
- Related ADR/spec: ADR-0011 area per MS§33.7 (policy engine decision file), plugin boundary ADR; MS§17

## Purpose

Implement policy-as-code: versioned schema, extends chain with deterministic merge, scoping, severity/threshold controls, suppressions with expiry, digest, and declarative rule packs — strictly offline.

## Scope

- Policy document: schemaVersion, extends (local paths + pre-installed npm package refs only), scopes (org/repo/path), rules (enable/disable/lock/severity override/forbidden-pattern type), thresholds, suppressions (reason+expiry date validation).
- Deterministic merge algorithm + conflict diagnostics (duplicate lock overrides = error).
- `ackit policy check` command; effective-policy resolution exposed for MCP/report.
- Policy digest wired into scan cache keys and output summaries.
- schemas/policy.schema.json emitted.

## Out of scope

Remote URL fetching (forbidden); arbitrary JS plugin execution (REQ-POL-003 hard boundary).

## Affected files

- `src/core/policy/**`, `src/cli/commands/policy.ts`
- `schemas/policy.schema.json`, `tests/unit/policy/**`, `tests/integration/policy/**`

## Data/database impact

None.

## Security impact

Lockable rules prevent downstream weakening; offline enforcement tested against network-attempt spy (zero calls).

## Permission/auth impact

None.

## Localization impact

English diagnostics.

## UX impact

Suppression without reason rejected at load time.

## Logging/audit impact

Digest in every scan summary links findings to exact effective policy.

## Acceptance criteria

- [ ] Merge precedence table-driven tests (base→extends chain→local) all pass; conflicting locked rule → stable error exit 2.
- [ ] Expired suppression honored as inactive + diagnostic; future expiry active.
- [ ] forbidden-pattern rule fires on fixture and respects redaction contract.
- [ ] Network-spy test proves zero remote fetch during resolution incl. npm-package extends path (requires pre-install).
- [ ] policy.schema.json validates shipped example policies.

## Test steps

`pnpm vitest run tests/unit/policy tests/integration/policy`.

## Risks

extends-cycle → cycle detection with clear error (mirrors task-graph principle).

## Rollback plan

Focused commit.

## Completion notes

(placeholder)
