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

- [x] Merge precedence table-driven tests (base→extends chain→local) all pass; conflicting locked rule → stable error exit 2.
- [x] Expired suppression honored as inactive + diagnostic; future expiry active.
- [x] forbidden-pattern rule fires on fixture and respects redaction contract.
- [x] Network-spy test proves zero remote fetch during resolution incl. npm-package extends path (requires pre-install).
- [x] policy.schema.json validates shipped example policies.

## Test steps

`pnpm vitest run tests/unit/policy tests/integration/policy`.

## Risks

extends-cycle → cycle detection with clear error (mirrors task-graph principle).

## Rollback plan

Focused commit.

## Completion notes

Executed 2026-08-22 on `rebuild/ackit-vnext`.

Implementation (`src/core/policy/`):
- `types.ts` — PolicyDocumentSchema (strictObject, schemaVersion 1): org/repo/pathScopes, extends, rules (ruleId ACKITnnn, enable/severity override/locked), thresholds.severity, suppressions (pathGlobs + REQUIRED reason + optional expiresAt), declarative forbiddenPatterns.
- `resolve.ts` — resolvePolicy: pre-order extends DFS (bases first so later layers override), local paths relative to containing file; `npm:<pkg>/<file>` resolves via createRequire against pre-installed node_modules ONLY — missing package → POL-OFFLINE-BLOCKED ("never fetches", REQ-POL-002); cycle → POL-CYCLE; locked-rule weakening (severity downgrade or disable) → POL-LOCKED-CONFLICT; missing reason → POL-INVALID. Expired suppressions stay in-document but inactive with an explicit diagnostic. policyDigest = sha256 over sorted-key canonical JSON. forbiddenPatternToRule converts declarative patterns into pipeline-compatible ScanRules with redaction-respecting evidence flow.
- CLI `ackit policy check` — chain/digest/diagnostics; PolicyError → exit 2. schemas/policy.schema.json emitted via gen:schemas.

Tests (36 files / 187 tests total, all green):
- Merge precedence base→extends→local incl. non-weakening additions preserved and locked-weakening rejected with POL-LOCKED-CONFLICT.
- Cycle detection A↔B with stable error code.
- Missing-reason rejection; expired suppression flagged inactive via diagnostics while future-dated one remains active.
- Network-spy test: node:http/node:https request mocks at module top level prove ZERO remote calls during resolution including the npm-package extends path resolved from a fixture node_modules.
- Forbidden-pattern rule fires on eval() fixture producing a FindingSchema-valid finding with redacted evidence; clean content negative.
- policy.schema.json contains forbiddenPatterns; digest determinism covered by canonical serializer reuse.

Validation evidence: lint=0 · format:check=0 · typecheck=0 · build=0 · gen:schemas=0 · vitest 36 files / 187 tests=0 · smoke:cli=0 · ackit scan --ci --exclude pnpm-lock.yaml=0.

External actions: none beyond permitted branch pushes recorded earlier under TASK-0290.
