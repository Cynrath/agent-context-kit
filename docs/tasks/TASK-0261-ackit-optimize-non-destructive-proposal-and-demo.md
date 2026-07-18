# TASK-0261: ACKit Optimize non-destructive proposal and demo

## Purpose

Add an explicit-path, review-only optimized instruction proposal and a safe synthetic repository that proves nested scope, duplicates, conflicts, vague rules, valid overrides, and before/after metrics without modifying source instructions.

## Current verified state and root cause

TASK-0259/TASK-0260 provide audit data and output contracts, but users still need a reviewable consolidation artifact. Existing generators already enforce repository-relative skip-existing behavior; there is no safe instruction proposal or Build Week demo fixture.

## Scope

- Implement `--proposal <repo-relative.md>` as an optional `ackit optimize` artifact request.
- Require the explicit path, `.md`/`.markdown` extension, repository containment, and non-existing target; never default to or overwrite `AGENTS.md`.
- Generate a clearly labeled dry-run/review artifact with consolidated non-conflicting rules, unresolved conflicts for human decision, preserved mandatory security/test/deployment/documentation/release constraints, source mappings, and before/after instruction-body metrics.
- Consolidate only deterministically exact duplicates and conservative near-duplicates that add no constraint; retain the strongest/safest representative and map every removed occurrence to original source path/line.
- Never guess between contradictory rules. List both source locations and required human decision.
- Add mutation-guard tests hashing every source instruction before/after proposal generation, existing-output skip tests, path escape tests, and mandatory-constraint preservation tests.
- Create `samples/ackit-optimize-demo/` with synthetic root/nested `AGENTS.md`, another agent surface, a duplicate, genuine conflict, valid narrower override, vague/unverifiable rule, safe stale reference, and no private/customer/copyrighted data.
- Add expected demo findings/metrics in tests and documented three-minute demo commands.

## Out of scope

- `--apply`, confirmation prompts, in-place rewriting, deletion, remote AI optimization, or source instruction mutation.
- A claim that the proposal is semantically complete or ready to apply without human review.

## Affected files

- New Core proposal generator/model files and CLI plumbing
- Optimize proposal/path/mutation tests
- `samples/ackit-optimize-demo/**`
- Sample gallery/demo docs and task/control records

## Data/database impact

None.

## Security impact

Synthetic fixture values contain no real secret, PII, customer, or private path. Proposal output uses sanitized evidence, preserves safety/release constraints, remains local, and never overwrites source or existing output.

## Permission/auth impact

None. Explicit local artifact creation only.

## Compatibility impact

Additive option on the new command. No existing command changes.

## Localization impact

Proposal structure and public demo docs are English; CLI status/error text retains EN/TR parity. Technical mappings remain language-independent.

## UX impact

Users can inspect a concrete candidate and its provenance without trusting an automatic rewrite. Unresolved decisions are visually separated from safe consolidations.

## Logging/audit impact

Proposal includes source mapping and deterministic before/after metrics. Ordinary generated proposal files remain untracked/ignored unless an explicit reviewed fixture is part of tests.

## Acceptance criteria

- Proposal generation refuses a missing/absolute/escaping/wrong-extension path and skips an existing target.
- Root and nested source instruction files are byte-identical after success and failure paths.
- Mandatory security, tests, deployment, documentation, and release rules remain represented.
- Removed/consolidated rules map to original path and line ranges.
- Genuine conflicts remain unresolved and visible; valid scoped override is retained without false conflict.
- Before/after metrics are deterministic and proposal savings match consolidated source text.
- Synthetic demo produces stable exact duplicate, conflict, vague/unverifiable, and valid-override behavior across OSes.

## Test steps

- Focused proposal and demo fixture tests
- Hash/byte comparison of all fixture instruction files before/after
- CLI demo console/JSON/proposal/SARIF/HTML smoke
- JSON and SARIF parse
- Release build/full tests/current-source scan/doctor/diff checks

## Failure handling

Do not loosen non-overwrite or containment checks. Keep ambiguous/unsafe rules in the proposal and add a regression fixture for every corrected false positive/negative.

## Risks

- Removing a subtle constraint is unsafe; only exact or high-confidence same-polarity containment can be consolidated, and mandatory categories are preserved.
- Demo metrics can drift with parser changes; fixture expectations and documentation must update together after review.

## Rollback plan

Remove the additive proposal generator/option/fixture/docs via normal successor commit. Source instructions are never mutated, so no data rollback is required.

## Completion notes

Status: `IMPLEMENTED / LOCAL VALIDATION PASS / COMMIT AND HOSTED VALIDATION PENDING`.

Implemented so far:

- Explicit `--proposal <repo-relative.md>` CLI option with containment, extension, output-collision, instruction-source, and skip-existing safeguards.
- Core review proposal with exact/conservative-near consolidation, source mapping, retained scoped overrides, mandatory-category preservation, sanitized text, parsed-rule before/after metrics, and unresolved conflict/unsafe-action decisions.
- Optional additive JSON proposal metadata plus schema/golden/live-output coverage and EN/TR known-error parity.
- Safe `samples/ackit-optimize-demo` fixture with exact cross-platform audit/proposal expectations and three-minute demo commands.
- Mutation, failure-path, sanitization, cancellation, deterministic-ordering, demo, CLI, schema, and localization tests.

Local completion evidence on 2026-07-18:

- Release build: PASS, 0 warnings and 0 errors.
- Full suite: 463 passed, 0 failed, 0 skipped.
- Proposal/demo/CLI focus after final hardening: 15 passed, 0 failed, 0 skipped. Combined proposal/demo/CLI/localization/schema focus: 25 passed, 0 failed, 0 skipped.
- Proposal safety coverage: success/error source hashes, explicit path/extension/containment, instruction-source rejection, symbolic-link/junction rejection where supported, atomic create-new concurrency, skip-existing, cancellation, secret/PII/local-path sanitization, mandatory-category retention, source mapping, unresolved decisions, and deterministic ordering all PASS.
- Demo smoke: console, JSON stdout/file, Markdown, SARIF 2.1.0, self-contained HTML, and proposal PASS; 4 sources, 16 rules, 4 scopes, 1 valid override, 10 findings, 270 whole-surface estimated tokens, and parsed-rule proposal 192 -> 156 (36 avoided). Re-run skipped the existing proposal; all four source instruction SHA-256 hashes remained unchanged; generated `.ackit` output was removed.
- CLI contract, EN/TR localization parity, JSON schema/golden/live outputs, Markdown links, config/generated conventions, package metadata, and sample smoke gates: PASS.
- Installed and current-source doctor: 13/13 PASS. Installed/current-source `scan --ci`: exit 0 with only previously reviewed Medium/Low repository findings and no new Optimize-task finding. Installed/current-source public-release redact check: exit 0 with only five pre-existing Low local-path findings outside this task.
- Changed-file format verification: PASS. Repository-wide `dotnet format --verify-no-changes` reports only five pre-existing `FINALNEWLINE` findings in untouched tests (`CatalogRuleStabilityTests.cs`, `NightlyWorkflowYamlGuardTests.cs`, `PromptPackEdgeCaseTests.cs`, `SarifRoundtripTests.cs`, and `ScanIncludeExcludeTests.cs`); they are not regressions and were not broadened into this task.
- `git diff --check`: PASS. No generated `.ackit`, package, SARIF, HTML, proposal, `bin`, or `obj` artifact is intended for tracking.

Data/migration/security/permission/compatibility/deployment impact: no database or migration; additive current-source CLI/schema behavior; local reads and one explicit atomic non-overwriting Markdown artifact write; no credential, permission, provider, telemetry, upload, deployment, publication, release, tag, asset, attestation, or immutable RC1 mutation.

Rollback: remove the additive proposal interface/models/generator/CLI option/schema metadata, demo fixture/tests/docs, and source-smoke assertion in a normal successor commit. Source instructions need no restoration because the implementation never changes them.
