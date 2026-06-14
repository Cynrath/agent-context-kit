# TASK-0137 Add New Stable Scanner Rule IDs And Tests

## Purpose
Extend the central scanner rule catalog with additional stable `ACKIT` IDs and focused tests so the scanner can report more findings under their canonical IDs without changing existing detection behavior.

## Current State
- The Core scanner rule catalog exposes stable `ACKIT` IDs across secrets, tokens, paths, and brand/PII categories.
- `tests/AgentContextKit.Tests/` covers existing IDs through focused scanner tests and a catalog test.

## Scope
- Identify at most two narrow, well-bounded detection categories already present in the Core scanner that do not currently expose a dedicated `ACKIT` ID and add them.
- Add the corresponding `ruleId` mapping in the catalog and a focused test.
- Do not change the existing scanner regex set, allowlist behavior, or default output schema.

## Out Of Scope
- Adding new scanner regexes, file types, or path patterns.
- Changing the default `ackit scan` exit codes, JSON schema version, or SARIF profile.
- Modifying the published `0.2.0-alpha.2` package.
- Adding a new CLI command or subcommand.

## Affected Files
- `src/AgentContextKit.Core/Scanning.cs` (catalog additions only; no regex change).
- `tests/AgentContextKit.Tests/` (focused test additions).
- `docs/SCANNER_RULES.md` (catalog row updates only).

## Implementation
1. Run `dotnet test` to confirm the current green baseline.
2. Inspect the existing `Scanning.cs` catalog to find two well-bounded detection categories that do not yet have a dedicated `ACKIT` ID.
3. Add two new `ACKITxxxx` constants to the catalog with stable IDs that do not collide with the existing range.
4. Wire the catalog into the existing detection path so affected findings expose the new `ruleId` without changing the rule bodies.
5. Add two focused tests: one positive detection on a fixture, one ruleId presence in JSON/SARIF.
6. Update `docs/SCANNER_RULES.md` to add the two new rows in the existing table.

## Security/Privacy Boundary
- No secret literal may be hard-coded in test fixtures; use clearly synthetic non-real placeholder strings that match the existing fixture convention.
- Do not weaken any existing Critical detection.

## Compatibility
- `ruleId` is additive in JSON and SARIF. Existing scan output remains backward-compatible.

## Database Impact
None.

## Admin Impact
None.

## Permission Impact
None.

## SEO/I18n Impact
None.

## Audit/Security Impact
- Strengthens scanner rule transparency.
- Does not modify scanner regex set or detection thresholds.

## Acceptance Criteria
- `dotnet test AgentContextKit.sln -c Release` reports at least 188/188 tests passing.
- The two new `ACKIT` IDs appear in `docs/SCANNER_RULES.md` and the Core catalog.
- `ackit scan --ci` and `ackit doctor` remain clean on the current repository.
- The published `0.2.0-alpha.2` package is not modified.

## Tests
- Two new focused xUnit tests covering positive detection and ruleId exposure.
- Full `dotnet test` must remain green.

## Validation
- `dotnet build AgentContextKit.sln -c Release` clean.
- `dotnet test AgentContextKit.sln -c Release --no-build` 188+/188+ green.
- `ackit scan --ci` clean.
- `ackit doctor` PASS.

## Risks
- Accidentally changing the regex set or detection threshold; mitigated by additive-only changes.

## Rollback
- Revert the commit; no package, tag, or release state to roll back.

## Completion Evidence
Pending. Will be filled after the commit and hosted checks.

## Commit
- `feat: extend scanner rule catalog with stable IDs`

## Push
- Normal `master` push after validation.

## Hosted Checks
- Standard 8/8 expected.
