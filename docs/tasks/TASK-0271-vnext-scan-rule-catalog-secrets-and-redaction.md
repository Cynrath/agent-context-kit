# TASK-0271: vNext scan rule catalog, secrets and redaction

## Metadata

- Parent epic: TASK-0264
- Dependencies: TASK-0270
- Unlocks: TASK-0282 (policy targets rules), TASK-0288 (benchmarks exercise rules)
- Requirement IDs: REQ-SCAN-003, REQ-SCAN-004, REQ-SCAN-005, REQ-FS-004 (unknown-ext scanning consumer), REQ-TEST-003 (secret fixtures), REQ-GOV-005
- Related ADR/spec: ADR-0009 (rule ID namespace/versioning); MS§12.2–12.4

## Purpose

Deliver the built-in rule catalog across all MS§12.3 categories with the secret-detection family and safe redaction/suppression design.

## Scope

- Stable rule-ID namespace (category-based format decided in ADR-0009) + semantics-versioning principle for rule changes.
- Rules: secrets (token formats, private key blocks, generic credential assignments, connection strings, provider tokens, entropy-assisted high-confidence), root escape/path safety, hygiene, absolute-path leakage, generated-artifact hygiene, binary/text anomalies, large context files, config problems, task/docs workflow integrity, CI/release hygiene, dependency advisory.
- Redaction pipeline: evidence masked to type-shape only (e.g., `sk-***`), never raw values anywhere.
- Suppression: inline comment format designed safely (documented abuse risks), config-level ignores, suppression metadata surfaced in findings.

## Out of scope

Policy-engine-owned severity overrides/thresholds (TASK-0282 consumes this registry).

## Affected files

- `src/core/scanner/rules/**`, redaction module
- `tests/security/secrets/**`, `tests/unit/rules/**`

## Data/database impact

None.

## Security impact

Closes v1 lesson #3 (extension allowlist blindness): detection runs over text-classified content regardless of extension; fixtures include unknown-extension and binary-with-secret-bytes cases.

## Permission/auth impact

None.

## Localization impact

Rule messages English; documentationKeys stable.

## UX impact

Remediation text present per rule; FP suppression documented.

## Logging/audit impact

Baseline interplay honored later: baseline must never store new secret evidence (asserted in TASK-0279 tests).

## Acceptance criteria

- [ ] Every built-in rule has: id, category, severity, message, remediation, documentationKey, unit test(s).
- [ ] Security fixtures pass: secret in unknown extension detected; binary containing secret-like bytes handled per classifier decision with diagnostic; private-key block detected; connection string detected.
- [ ] Redaction regression: outputs (terminal+JSON) contain zero raw fixture secrets.
- [ ] Inline allow-comment bypass works but emits advisory finding documenting the bypass.
- [ ] Rule ID rename/semantic-change principle documented and enforced by lint-style unit check.

## Test steps

`pnpm vitest run tests/unit/rules tests/security/secrets`.

## Risks

False-positive flood on entropy patterns → confidence tiers; low-confidence = advisory severity only.

## Rollback plan

Rules additive; revert single commit.

## Completion notes

(placeholder)
