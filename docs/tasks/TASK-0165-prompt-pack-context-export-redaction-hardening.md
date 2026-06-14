# TASK-0165 Prompt Pack And Context Export Redaction Hardening

## Purpose
Strengthen the redaction guard tests for `ackit prompt-pack` and `ackit context-export` so the local dry-run pack and the local approval manifest never carry raw secret, PII, brand, or local-path values from the source repository, even when the configuration is permissive.

## Current State
- TASK-0151 added a `PromptPackAndContextExportRedactionGuardTests` class that asserts synthetic raw values do not leak.
- The Core `PromptPackGenerator` and `ContextExportManifestGenerator` already strip raw matches.

## Scope
- Add a focused regression test that uses a different synthetic marker and asserts the marker still does not appear.
- Add a focused regression test that exercises the `--approve` path on the context export and asserts the manifest still omits raw matches.
- No CLI argument change, no JSON schema change.

## Out Of Scope
- Adding new CLI commands.
- Changing the prompt pack or context export output schema.
- Modifying the published `0.2.0-alpha.2` package.

## Affected Files
- `tests/AgentContextKit.Tests/` (additional regression tests).

## Implementation
1. Add a focused test that uses a fresh synthetic marker and asserts the marker is absent from both outputs.
2. Add a focused test that exercises the explicit `--approve` approval path and asserts the manifest still omits raw matches.

## Security/Privacy Boundary
- Use only clearly non-real, synthetic placeholder values.

## Backward Compatibility
- Pure additive guard tests. Public CLI and outputs remain identical.

## Acceptance Criteria
- New tests pass.
- `dotnet test` is 244+/244+ green.
- `ackit scan --ci` and `ackit doctor` clean.

## Tests
- Two new xUnit tests.

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
- `test: harden prompt pack redaction boundaries`

## Push
- Normal `master` push after validation.

## Hosted Checks
- Standard 3/3 expected.
