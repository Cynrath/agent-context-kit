# TASK-0259: ACKit Optimize core instruction audit domain

## Purpose

Implement the dependency-free, deterministic Core domain for discovering, resolving, normalizing, measuring, and auditing repository AI-agent instructions.

## Current verified state and root cause

At baseline commit `6998e269af4962bbe70a9cb4044727d25dc1a06d`, Core can enumerate repository files and scan safety risks, but it has no instruction-source model, nested `AGENTS.md` precedence resolver, Markdown rule parser, instruction finding catalog, token-cost estimator, or stable audit fingerprint. This is an absent capability, not a defect in published RC1.

## Scope

- Discover root and nested `AGENTS.md` plus supported Claude, Anthropic, Copilot, Cursor, Continue, and workflow/development instruction surfaces. Historical generated handoff/context logs are deliberately not treated as durable instruction sources.
- Reuse repository ignore-directory, `.ackit` config ignore-path, and optional include/exclude glob conventions without reading dependency/generated/binary content.
- Record normalized repository-relative path, source type, directory scope, deterministic precedence, inheritance behavior, character/word/line/token estimates, and parsed rules with original source location.
- Resolve applicable instruction sources for deterministic repository subtrees and identify valid narrower `AGENTS.md` overrides without treating every override as a conflict.
- Parse Markdown headings, list items, imperative paragraphs, and supported Continue prompt text while preserving original rule text and line ranges in memory.
- Normalize casing, Unicode, whitespace, path separators, inline Markdown, common requirement/prohibition phrases, and command fragments conservatively.
- Add stable `ACKITOPT001`-series catalog entries for exact duplicate, redundant near-duplicate, direct contradiction, platform conflict, package-manager conflict, build/test conflict, unverifiable rule, vague rule, stale reference, overly broad scope, shadowed/unreachable rule, repeated boilerplate, unsafe automatic action, and repository safety/release-boundary conflict.
- Emit deterministic severity/category/explanation/evidence/remediation/heuristic metadata, source/scope/line data, and SHA-256 finding fingerprints.
- Calculate deterministic total and avoidable characters, words, lines, and `ceil(characters / 4)` estimated tokens, clearly marked as estimates.
- Add cancellation checks to long-running discovery, parsing, scope, and rule-pair loops.
- Add synthetic nested-scope fixtures and focused Core tests with OS-independent ordering.

## Out of scope

- CLI argument/output implementation, persisted reports, proposal generation, apply/overwrite behavior, remote models/tokenizers, semantic embeddings, or machine learning.
- Automatic interpretation of ambiguous rules or removal of mandatory constraints.
- Changes to existing scanner `ACKIT001`-`ACKIT999` behavior.

## Affected files

- `src/AgentContextKit.Core/Abstractions.cs`
- New Core-owned instruction audit model/catalog/service source files
- `tests/AgentContextKit.Tests/*Optimize*Tests.cs`
- `tests/fixtures/optimize/**`
- `docs/tasks/TASK-0259-...md`
- Control queue/handoff documents after the major phase

## Data/database impact

None. Repository files are read-only inputs; no database or migration.

## Security impact

Only known instruction text formats are read, with size limits and ignored-directory rules. Finding evidence must be sanitized and must not include raw secret-like values or absolute repository roots. No remote call or upload.

## Permission/auth impact

None. Local read-only analysis only.

## Compatibility impact

Additive Core types and interfaces. Existing scanner and generator contracts retain their behavior. New APIs use nullable reference safety and cancellation defaults.

## Localization impact

Core technical IDs/categories/messages remain stable English. Human localization belongs to TASK-0260.

## UX impact

Provides the accurate source/scope/line/finding/metric model consumed by every later output format and proposal.

## Logging/audit impact

No runtime telemetry or log writes. Tests record deterministic fixtures and expected IDs/order without private paths or values.

## Acceptance criteria

- Root and nested `AGENTS.md` precedence resolves correctly for all fixture subtrees.
- Supported instruction surfaces expose source type, scope, precedence, and inherited applicability.
- Rules preserve original text and exact line ranges while providing conservative normalized representations.
- Exact duplicates, genuine contradictions, vague rules, platform/package/build-test conflicts, stale paths, unsafe actions, and safety-boundary conflicts produce stable expected findings.
- The valid nested scoped override fixture is recorded as an override and produces no false conflict.
- Findings and scopes have identical order and forward-slash paths across OSes.
- Metrics use documented deterministic arithmetic and distinguish total from avoidable estimated context.
- Cancellation is observed.
- Focused and cumulative tests pass with 0 build warnings/errors.

## Test steps

- `dotnet build AgentContextKit.sln -c Release --no-restore`
- `dotnet test tests/AgentContextKit.Tests/AgentContextKit.Tests.csproj -c Release --no-build --filter "FullyQualifiedName~InstructionAudit"`
- `dotnet test AgentContextKit.sln -c Release --no-build`
- Current-source `scan --ci` and `doctor`
- `git diff --check`

## Failure handling

Prefer narrowing deterministic rules and adding negative fixtures over suppressing failures. Any material unrelated issue becomes a separate task. Stop for unresolved Critical/High ACKit findings.

## Risks

- Text similarity can over-report; near-duplicate and broad-scope classifications are explicitly heuristic and require conservative thresholds.
- Platform/package differences can be intentional; nested `AGENTS.md` precedence and narrower scope must suppress valid-override false positives.
- Pairwise comparison can grow quadratically; size limits, cancellation, normalized grouping, and bounded candidate comparisons mitigate this.

## Rollback plan

Remove the additive Core files/tests through a normal successor commit. Existing command behavior remains independently intact.

## Completion notes

Status: `COMPLETED / COMMIT d49bd446 / LOCAL AND HOSTED VALIDATION PASS`.

- Added the dependency-free `IInstructionAuditor`, source/scope/rule/finding/metrics domain, 15 stable `ACKITOPT001`-`ACKITOPT015` rules, deterministic fingerprints/order, conservative Markdown and Continue JSON parsing, nested `AGENTS.md` precedence, valid scoped-override classification, stale-reference checks, cancellation, and local `ceil(characters / 4)` context estimates.
- Added a synthetic nested-scope fixture and 12 focused regression tests covering all 15 rule IDs, source lines, valid overrides, ignore/include/exclude behavior, stable ordering/metrics, cancellation, stale dot-directory paths, historical-context exclusion, and secret-safe finding evidence.
- Historical `.codex/HANDOFF.md` and `.codex/CONTEXT_PACK.md` artifacts were excluded after dogfood proved they contain narrative state rather than durable instructions; scanning them produced non-actionable historical conflict noise.
- Focused tests: 12 passed, 0 failed, 0 skipped. Full suite: 443 passed, 0 failed, 0 skipped. Release build: 0 warnings, 0 errors.
- Current-source `doctor`: 13/13 PASS. Current-source `scan --ci`: exit 0 over 646 files with no Critical/High finding; only pre-existing classified Medium/Low repository-artifact findings remain.
- Whitespace formatting verification passes for all new/modified Optimize source and test files. The repository-wide optional format check separately reports only five pre-existing task-unrelated test files with missing final newlines; none was modified or suppressed.
- Real-repository dogfood: 9 instruction sources, 123 parsed rules, 52 resolved scopes, 1 valid scoped override, and 51 review findings. The only stale-reference findings are inside the intentionally invalid synthetic fixture.
- Exact task commit: `d49bd446b227b1b77038b50f2f704c483168af52`.
- CI run `29650061884`: PASS — https://github.com/Cynrath/agent-context-kit/actions/runs/29650061884
- Published-package smoke run `29650061875`: PASS — https://github.com/Cynrath/agent-context-kit/actions/runs/29650061875
- Current-source smoke run `29650061881`: PASS — https://github.com/Cynrath/agent-context-kit/actions/runs/29650061881
- No workflow dispatch/rerun, package publication, release/tag/asset/attestation mutation, deployment, or immutable RC1 change occurred.
