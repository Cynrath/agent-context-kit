# TASK-0151 Prompt Pack And Context Export Redaction Hardening

## Purpose
Strengthen the sanitization assertions in the `ackit prompt-pack` and `ackit context-export` outputs so that the local dry-run prompt pack and the local approval manifest never carry raw secret, PII, brand, or local-path values from the source repository, even when the configuration is permissive.

## Current State
- `src/AgentContextKit.Core/Generation.cs` builds the prompt pack Markdown and the context export JSON.
- `docs/SUPPRESSION_AUDIT.md` and `docs/EXTERNAL_OUTPUT_IMPORT_BOUNDARY.md` describe the redaction policy.
- No focused test currently asserts the prompt pack and the context export are free of raw match text.

## Scope
- Add a focused test that creates a fixture with a clear synthetic secret value and asserts neither the prompt pack Markdown nor the context export JSON contains the raw value.
- No new command, no JSON schema, no SARIF profile change.

## Out Of Scope
- Adding new scanner rules.
- Modifying the published `0.2.0-alpha.2` package.

## Affected Files
- `tests/AgentContextKit.Tests/` (new redaction test).

## Implementation
1. Create a `TempRepository` with a fixture file containing a clearly synthetic, non-real placeholder value.
2. Generate the prompt pack and the context export.
3. Assert the raw value does not appear in either output.

## Security/Privacy Boundary
- Use only clearly synthetic, non-real placeholder values that match the existing fixture convention.

## Backward Compatibility
- Pure additive guard test. Public CLI and outputs remain identical.

## Acceptance Criteria
- New test passes.
- `dotnet test` is 212+/212+ green.
- `ackit scan --ci` and `ackit doctor` clean.

## Tests
- One new xUnit test.

## Validation
- `dotnet build` clean.
- `dotnet test` green.
- `ackit scan --ci` clean.
- `ackit doctor` PASS.

## Rollback
- Revert the commit.

## Completion Evidence
Pending. Will be filled after the commit and hosted checks.

## Commit
- `test: guard prompt pack and context export against raw values`

## Push
- Normal `master` push after validation.

## Hosted Checks
- Standard 3/3 expected.
