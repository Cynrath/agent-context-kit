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

- [x] Contract snapshot: JSON findings array matches published schema exactly.
- [x] Determinism test: two consecutive scans produce byte-identical JSON (excluding timestamps field explicitly excluded from contract).
- [x] Threshold exceeded ⇒ exit 1; clean repo ⇒ 0; invalid config ⇒ 2 (integration asserts).
- [x] Secret-like evidence string in a fixture file never appears in any output (redaction regression).
- [x] Cancellation mid-scan yields prompt abort without partial corrupt JSON.

## Test steps

`pnpm vitest run tests/unit/scanner tests/contract/findings-schema tests/integration/scan`.

## Risks

Ordering instability across platforms → sort keys defined in ADR-0009 (path then ruleId then line).

## Rollback plan

Focused commit.

## Completion notes

Executed 2026-08-22 on `rebuild/ackit-vnext`.

Implementation:
- `src/core/scanner/types.ts` — FindingSchema as zod strictObject (REQ-SCAN-002 full field set incl. fingerprint, redacted evidence, remediation, documentationKey, suppressed/suppressionReason); Severity order low<medium<high<critical; 15-category enum per REQ-SCAN-004; FindingDraft (pre-redaction, path owned by pipeline); severityAtLeast helper.
- `src/core/scanner/redact.ts` — redactEvidence (prefix/suffix kept, middle masked; short values fully masked) applied at finding construction so reporters structurally cannot see raw values (REQ-GOV-005, ADR-0009); computeFingerprint = sha256 over ruleId|POSIX-relativePath|line|column|redactedEvidence → machine-path independent (REQ-BASE-002).
- `src/core/scanner/rules.ts` + registry.ts — RuleRegistry enforcing stable ACKIT<NNN> namespace with duplicate/id-format guards and deterministic id-sorted enumeration.
- `src/core/scanner/pipeline.ts` — REQ-SCAN-001 stages over the fs engine: discovery via collectScanTargets (ignore+classify) → text-only targets → bounded parallel evaluation in order-stable Promise.all batches → normalize (redact at construction) → fingerprint → deterministic sort relativePath→ruleId→line→column. AbortSignal checked between batches ⇒ aborted:true with structurally valid results. Rule failures become SCAN-RULE-FAILED diagnostics, never crashes (REQ-GOV-007).
- `src/core/reporting/{json,terminal}.ts` — JSON report schemaVersion ackit.scan.v0 (summary bySeverity + diagnostics + findings), deterministic bytes for identical inputs (no timestamps/machine fields); terminal reporter sanitized output only, repo-relative paths.
- CLI: `ackit scan [--ci]` wired over config engine (severityThreshold, limits, excludes); exit codes per ADR-0007: 0 clean/report-only, 1 threshold exceeded under --ci, 2 invalid config, 3 root failure.

Tests (20 files / 100 tests total, all green):
- unit/scanner/redact.test.ts (mask shape, short-value masking, fingerprint determinism/path-independence/uniqueness).
- unit/scanner/pipeline.test.ts on real temp repo: contract-valid findings, redaction of an AWS-style fixture secret, byte-identical consecutive JSON renders, raw secret absent from both renderers, aborted:true with parseable JSON on pre-aborted signal.
- contract/findings-schema/findings.test.ts: strict schema accepts/rejects precisely; category/severity sets documented.
- integration/scan/scan-cli.test.ts through runCli: clean repo exit 0 with pure JSON summary; invalid config exit 2 with CFG-SCHEMA-VERSION stderr diagnostic; --ci exit 1 with matched marker rule and zero raw-secret leakage in stdout.

Notes: rules are injected via defaultRegistry.register/unregister in tests; concrete catalog lands in TASK-0271. zod v4 requires strictObject for unknown-field rejection (default strips).

Validation evidence: lint=0 · format:check=0 · typecheck=0 · build=0 · vitest 20 files / 100 tests=0 · smoke:cli=0 · ackit scan --ci --exclude pnpm-lock.yaml=0.

External actions: none beyond permitted branch pushes recorded under TASK-0290.
