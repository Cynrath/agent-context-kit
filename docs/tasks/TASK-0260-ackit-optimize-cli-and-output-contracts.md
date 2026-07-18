# TASK-0260: ACKit Optimize CLI and output contracts

## Purpose

Expose the Core instruction audit through a first-class, backward-compatible `ackit optimize` command with reviewable console, JSON, Markdown, SARIF 2.1.0, and self-contained offline HTML formats.

## Current verified state and root cause

Published/current baseline help contains no `optimize` command. Existing CLI patterns keep parsing/output/exit decisions in `AgentContextKit.Cli`, business logic in Core, JSON under schema v2, stable SARIF metadata, EN/TR human localization, repository-relative outputs, and skip-existing behavior. The new Core domain from TASK-0259 needs an additive adapter that preserves those contracts.

## Scope

- Add `ackit optimize [--format console|json|markdown|sarif|html] [--output <repo-relative-file>] [--include <glob>] [--exclude <glob>] [--lang en|tr] [--json] [--ci]`.
- Keep console report-only as the default; `--json` aliases JSON format and writes stdout unless an explicit output is supplied.
- Require `--output` for Markdown, SARIF, and HTML; validate extension and repository containment; skip existing outputs without overwriting.
- Add report-only exit `0`; invalid/output errors `1`; `--ci` returns `2` for Critical and `1` for High findings, otherwise `0`, independent of format/language.
- Add deterministic console summaries, complete machine-readable JSON, Markdown report, privacy-first SARIF with source regions, and HTML that contains no network references and HTML-encodes repository text.
- Add EN/TR help, summary, and known-error parity while keeping technical IDs, enum/status tokens, paths, JSON, and SARIF language-independent.
- Extend command-output schema v2 additively for `optimize`; add sanitized golden/live-output coverage and an optimize SARIF profile/golden parse test according to existing conventions.
- Update CLI contract/reference, JSON, SARIF, HTML, localization, exit-code docs, contract/localization scripts, and source-package smoke workflow.

## Out of scope

- Proposal generation and `--proposal` (implemented separately by dependent TASK-0261), applying changes to source instruction files, remote uploads, Code Scanning upload, provider calls, telemetry, package publication, or release/version selection.
- Changing existing command exits or JSON field meanings.

## Affected files

- `src/AgentContextKit.Cli/Program.cs`
- `src/AgentContextKit.Core/Templates.cs`
- New Core output writer files and necessary abstractions/models
- `docs/schemas/*`, `tests/fixtures/contracts/*`
- CLI/output/localization/SARIF/HTML tests and scripts
- `.github/workflows/cross-platform-source-smoke.yml`
- CLI/output/localization documentation and task/control records

## Data/database impact

None.

## Security impact

No output may contain raw secret matches or absolute repository roots. SARIF uses repository-relative `/` artifact URIs and line regions. HTML is self-contained and encoded. Writes are explicit, inside the repository, and non-overwriting.

## Permission/auth impact

None. Local reads and explicit local artifact writes only.

## Compatibility impact

Additive CLI command and JSON schema branch. Existing commands/options/exits remain unchanged. Published RC1 is documented as not containing this post-RC1 command.

## Localization impact

EN/TR human output and error parity is required. JSON/SARIF semantics and technical identifiers remain invariant.

## UX impact

One obvious command supports terminal review and integration formats. The `--ci` boundary is explicit; default audit never fails solely because findings exist.

## Logging/audit impact

Generated files report Created/SkippedExisting status. No telemetry, upload, or hidden output directory mutation.

## Acceptance criteria

- `ackit optimize` appears in help and returns a deterministic human report.
- `--json` and `--format json` emit equivalent parseable schema-v2 payloads.
- Markdown, SARIF, and HTML require valid explicit paths and never overwrite existing files.
- JSON and SARIF parse; schema/golden/live-output tests cover required fields, IDs, paths, source regions, heuristic flags, metrics, and output status.
- HTML contains no external asset/network reference and encodes fixture-controlled content.
- Human EN/TR exit parity and JSON invariance pass.
- `--ci` exits match highest severity and remain format-independent.
- Existing command behavior and all cumulative tests remain green with 0 warnings/errors.

## Test steps

- Focused optimize CLI/output/SARIF/HTML/localization tests
- JSON schema and golden contract tests
- `scripts/check-cli-contract.ps1 -FailOnIssues`
- `scripts/check-localization-parity.ps1 -FailOnIssues`
- Release build and full test suite
- Disposable console/JSON/Markdown/SARIF/HTML smokes with parse/offline/privacy checks
- Current-source scan/doctor and `git diff --check`

## Failure handling

Correct adapters or contract assets without weakening schemas, safety checks, HTML encoding, or exit behavior. Preserve generated files for local diagnosis only; do not track ordinary outputs.

## Risks

- Large JSON can expose source text; public DTOs use sanitized evidence and repository-relative locations rather than raw instruction bodies.
- Additive schema drift can break golden parity; live-output and schema tests must change atomically.
- CLI option ambiguity is mitigated by one format selector, `--json` alias, and explicit output requirements.

## Rollback plan

Remove the additive command, writers, schema branch, docs, and tests with a normal successor commit. Existing CLI remains intact.

## Completion notes

Status: `COMPLETED / COMMIT c79932a / LOCAL AND HOSTED VALIDATION PASS`.

Implemented current-source surfaces:

- First-class `ackit optimize` help/dispatch with console, JSON stdout/file, Markdown, SARIF 2.1.0, and self-contained offline HTML.
- Deterministic review-only default plus format-independent `--ci` exits (`0`/`1`/`2` for no High-or-Critical/High/Critical).
- Repository-relative explicit output validation, format-specific extensions, skip-existing behavior, include/exclude forwarding, and no instruction-source rewrite.
- Sanitized schema-v2 JSON, Optimize SARIF profile/golden, source line regions, stable fingerprints, deterministic/heuristic labels, complete metrics, source/scope/override metadata, and EN/TR human parity.
- Current-source three-platform smoke coverage plus CLI/JSON/SARIF/HTML/localization documentation. Published `1.0.0-rc.1` is explicitly documented as predating Optimize.

Local evidence on 2026-07-18:

- Release build: passed with 0 warnings and 0 errors.
- Focused Optimize CLI/report tests: 10 passed, 0 failed, 0 skipped. Combined instruction/contract/localization focus: 32 passed, 0 failed, 0 skipped.
- Full suite: 454 passed, 0 failed, 0 skipped.
- Disposable end-to-end fixture smoke: console, JSON stdout/file, Markdown, SARIF, and HTML passed; JSON/SARIF parsed; HTML had no network/script reference; existing Markdown output was skipped; instruction-source hashes remained unchanged. Result: 25 findings, 9 sources, 8 resolved scopes.
- Installed/current-source doctor: 13/13 PASS. Installed/current-source `scan --ci`: exit 0 with the previously reviewed Medium/Low repository findings and no High/Critical finding.
- CLI contract, localization parity, JSON contract assets, Markdown links, and config/generated conventions: passed. `git diff --check`: passed.
- The tracked-versus-untracked guard correctly remains pending until this task's five new files are staged/committed; it will be rerun before push.

Commit and hosted evidence:

- Exact task commit: `c79932af3271038e00a37270c50a6fb518e8db38`.
- CI run `29651733106`: PASS — https://github.com/Cynrath/agent-context-kit/actions/runs/29651733106
- Source-package smoke run `29651733085`: PASS — https://github.com/Cynrath/agent-context-kit/actions/runs/29651733085
- Published-package smoke run `29651733087`: PASS — https://github.com/Cynrath/agent-context-kit/actions/runs/29651733087

Data/migration/security/permission/deployment impact: no database or migration; local reads and explicit non-overwriting local report writes only; no new permission, provider, telemetry, upload, deployment, publication, tag, release, asset, or attestation action.

Rollback: remove the additive command, report writer/models, schema/profile/golden assets, docs, tests, and source-smoke steps in a normal successor commit. No user instruction source requires restoration because none is modified.
