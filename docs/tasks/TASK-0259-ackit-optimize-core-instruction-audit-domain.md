# TASK-0259: ACKit Optimize core instruction audit domain

## Purpose

Implement the dependency-free, deterministic Core domain for discovering, resolving, normalizing, measuring, and auditing repository AI-agent instructions.

## Current verified state and root cause

At baseline commit `6998e269af4962bbe70a9cb4044727d25dc1a06d`, Core can enumerate repository files and scan safety risks, but it has no instruction-source model, nested `AGENTS.md` precedence resolver, Markdown rule parser, instruction finding catalog, token-cost estimator, or stable audit fingerprint. This is an absent capability, not a defect in published RC1.

## Scope

- Discover root and nested `AGENTS.md` plus supported Claude, Anthropic, Copilot, Cursor, Continue, Codex handoff/context, and workflow/development instruction surfaces.
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

Status: `PLANNED / BLOCKED ON TASK-0258 PLANNING COMMIT`.
