# TASK-0147 Config Check Actionable Diagnostics Examples

## Purpose
Document and test the most common `ackit config-check` diagnostics with copy-ready fix examples so repository operators can act on them without rereading the source.

## Current State
- `src/AgentContextKit.Core/ConfigurationValidation.cs` exposes sanitized diagnostics.
- `docs/CONFIGURATION.md` and `docs/CONFIG_GENERATED_CONVENTIONS.md` describe the config schema and gates.
- No public cookbook maps each `ACKITCFG###` code to a concrete fix.

## Scope
- Add a short cookbook table in `docs/CONFIGURATION.md` that lists the most common `ACKITCFG` codes and a one-line fix.
- Add a focused test that asserts the table mentions the codes produced by current validator examples.
- No new diagnostics, no schema change.

## Out Of Scope
- Adding new diagnostic codes.
- Changing the validator's behavior.
- Modifying the published `0.2.0-alpha.2` package.

## Affected Files
- `docs/CONFIGURATION.md` (additive cookbook only).
- `tests/AgentContextKit.Tests/` (guard test).

## Implementation
1. Enumerate the existing `ConfigDiagnosticCodes` constants and their triggers.
2. Add a short table that maps each code to a one-line fix.
3. Add a focused test that asserts the table mentions at least four representative codes.

## Security/Privacy Boundary
- No credential, raw finding, or recovery secret may be printed.

## Backward Compatibility
- Pure additive documentation plus a guard test.

## Acceptance Criteria
- New test passes.
- `dotnet test` is 208+/208+ green.
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
- `docs: add config-check diagnostics cookbook`

## Push
- Normal `master` push after validation.

## Hosted Checks
- Standard 3/3 expected.
