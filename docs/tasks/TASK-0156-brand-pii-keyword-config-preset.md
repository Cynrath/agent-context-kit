# TASK-0156 Brand And PII Keyword Config Preset

## Purpose
Document and test the safest default `brandKeywords` and `piiKeywords` lists that a public repository can use in `.ackit/config.yml` so operators do not have to invent placeholders from scratch.

## Current State
- `AckitConfig` accepts `BrandKeywords` and `PiiKeywords` in `.ackit/config.yml`.
- `docs/CONFIGURATION.md` describes the fields but does not recommend a starter set.
- `docs/examples/config/` ships three example configs (minimal, strict, CI).

## Scope
- Add a new example config under `docs/examples/config/brand-pii-starters.yml` with safe default brand and PII keyword placeholders.
- Reference the new file from `docs/CONFIGURATION.md`.
- Add a focused xUnit test that asserts the new file is non-empty and contains the canonical comment header.

## Out Of Scope
- Changing the runtime scanner.
- Modifying the published `0.2.0-alpha.2` package.

## Affected Files
- `docs/examples/config/brand-pii-starters.yml` (new file).
- `docs/CONFIGURATION.md` (additive reference).
- `tests/AgentContextKit.Tests/` (guard test).

## Implementation
1. Write the new YAML file with the canonical header and a safe starter set.
2. Reference the file from `docs/CONFIGURATION.md`.
3. Add the guard test.

## Security/Privacy Boundary
- No credential, raw finding, or recovery secret may be printed.
- Use only clearly non-real placeholder values.

## Backward Compatibility
- Pure additive documentation plus a guard test.

## Acceptance Criteria
- New test passes.
- `dotnet test` is 231+/231+ green.
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
- `docs: add brand and pii keyword starter config`

## Push
- Normal `master` push after validation.

## Hosted Checks
- Standard 3/3 expected.
