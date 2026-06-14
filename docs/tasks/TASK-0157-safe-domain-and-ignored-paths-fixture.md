# TASK-0157 Safe Domain And Ignored Paths Fixture

## Purpose
Document and test a starter `safeDomains` and `ignoredPaths` configuration that a public repository can use to keep fixture and sample content out of the public-release scanner output.

## Current State
- `AckitConfig` accepts `SafeDomains` and `IgnoredPaths` in `.ackit/config.yml`.
- `docs/CONFIGURATION.md` describes the fields.
- `docs/examples/config/ci-config.yml` and `docs/examples/config/strict-config.yml` are already present.

## Scope
- Add a new example config under `docs/examples/config/safe-domains-and-ignored-paths.yml` that targets fixture/sample paths and public package domains.
- Reference the new file from `docs/CONFIGURATION.md`.
- Add a focused xUnit test that asserts the new file is non-empty and contains the canonical comment header.

## Out Of Scope
- Changing the runtime scanner.
- Modifying the published `0.2.0-alpha.2` package.

## Affected Files
- `docs/examples/config/safe-domains-and-ignored-paths.yml` (new file).
- `docs/CONFIGURATION.md` (additive reference).
- `tests/AgentContextKit.Tests/` (guard test).

## Implementation
1. Write the new YAML file with the canonical header and a safe starter set.
2. Reference the file from `docs/CONFIGURATION.md`.
3. Add the guard test.

## Security/Privacy Boundary
- No credential, raw finding, or recovery secret may be printed.
- Use only clearly non-real placeholder domains and paths.

## Backward Compatibility
- Pure additive documentation plus a guard test.

## Acceptance Criteria
- New test passes.
- `dotnet test` is 232+/232+ green.
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
- `docs: add safe domain and ignored paths starter config`

## Push
- Normal `master` push after validation.

## Hosted Checks
- Standard 3/3 expected.
