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

- [x] Every built-in rule has: id, category, severity, message, remediation, documentationKey, unit test(s).
- [x] Security fixtures pass: secret in unknown extension detected; binary containing secret-like bytes handled per classifier decision with diagnostic; private-key block detected; connection string detected.
- [x] Redaction regression: outputs (terminal+JSON) contain zero raw fixture secrets.
- [x] Inline allow-comment bypass works but emits advisory finding documenting the bypass.
- [x] Rule ID rename/semantic-change principle documented and enforced by lint-style unit check.

## Test steps

`pnpm vitest run tests/unit/rules tests/security/secrets`.

## Risks

False-positive flood on entropy patterns → confidence tiers; low-confidence = advisory severity only.

## Rollback plan

Rules additive; revert single commit.

## Completion notes

Executed 2026-08-22 on `rebuild/ackit-vnext`.

Catalog (11 built-in rules, all REQ-SCAN-004 families represented):
- Secrets: ACKIT001 high-confidence token shapes (AWS AKIA/ASIA, ghp_, github_pat_, sk-, xoxb-, glpat-, AIza) critical; ACKIT002 private-key blocks critical; ACKIT003 generic credential assignments high; ACKIT004 connection strings with inline credentials high; ACKIT005 entropy-assisted advisory (medium, confidence-tiered per risk note).
- Path safety/leakage: ACKIT010 absolute user-profile path leakage (Windows/POSIX/macOS forms).
- Hygiene: ACKIT020 TODO/FIXME/HACK markers.
- Context/config: ACKIT040 large context markdown (>8000 estimated tokens); ACKIT050 ackit.yml schemaVersion problem.
- CI/release hygiene: ACKIT070 unpinned workflow actions (non-SHA `uses:`) feeding REQ-SEC-004.
- Dependency advisory: ACKIT080 floating dependency specs (latest/git/#ref).
Every rule: stable ACKIT<NNN> id, category, severity, remediation, documentationKey rules/ACKITnnn. Allocation table + semantic-change principle documented in catalog.ts header; snapshot test (`toMatchInlineSnapshot` on sorted ids) gates renames.

Suppression design (documented abuse mitigation): inline marker `ackit-ignore:ACKITnnn[,...]` applies to its own line and the next line via collectSuppressions (shared.ts); suppressed findings carry suppressed=true + reason; every applied bypass additionally emits ACKIT099 advisory (low/hygiene) which itself cannot be suppressed. Config-level file excludes remain the scan.exclude globs from TASK-0269.

Pipeline integration: defaultRegistry now serves builtinRegistry(); binary-classified files produce SCAN-BINARY-SKIPPED diagnostics instead of silent skipping (classifier decision surfaced, REQ-FS-004).

Tests (26 files / 143 tests total, all green):
- unit/rules/catalog.test.ts — metadata completeness per rule, family coverage, id-uniqueness, snapshot gate, ACKIT099 reservation.
- tests/security/secrets/secrets.test.ts — unknown-extension secret detected (v1 lesson #3 closed) with zero raw-secret leakage in both renderers; private key + connection string + generic assignment detected; binary secret-bearing blob → diagnostic, no findings attributed to it; inline suppression → suppressed=true with line-referencing reason AND visible ACKIT099 advisory (suppressed=false); absolute-path leakage + unpinned action flagged; byte-identical JSON across runs.

Bug found & fixed during hardening: suppression expansion mutated a Set while iterating a shared reference (RangeError: Set maximum size exceeded). Fixed by snapshotting occurrences; regression covered by the suppression fixture exercising multi-line expansion.

Validation evidence: lint=0 · format:check=0 · typecheck=0 · build=0 · vitest 26 files / 143 tests=0 · smoke:cli=0 · ackit scan --ci --exclude pnpm-lock.yaml=0.

External actions: none beyond permitted branch pushes recorded earlier under TASK-0290.
