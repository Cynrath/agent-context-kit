# TASK-0174 Entropy Scanner Rule Research And Guard Tests

## Purpose
Evaluate a conservative entropy-based scanner rule for high-entropy strings and ship it only with synthetic fixtures and an explicit allowlist.

## Current State
- The Core scanner catalog includes `ACKIT001` through `ACKIT007`.
- The scanner reports `BuildArtifact`, `Token`, `PII`, `Brand`, and other categories.
- No entropy-based rule exists.

## Evidence
- `docs/SCANNER_RULES.md` lists the current catalog.
- The Core scanner pipeline supports an allowlist path set.

## Scope
- Research Shannon entropy threshold, minimum length, file-type/path exclusions, and safe examples.
- Define `ACKIT008 HighEntropyString` with conservative severity and an allowlist.
- Use synthetic fixtures only.
- Update SCANNER_RULES, SARIF_OUTPUT, JSON_OUTPUT, and SECURITY_MODEL docs.
- Add guard tests for synthetic triggers and safe examples.

## Out Of Scope
- Using real credentials in fixtures.
- Broad noisy detection.
- Hard-coding allowlist values that would not generalize.

## Affected Files
- `src/AgentContextKit.Core/**` (new rule and allowlist wiring)
- `tests/AgentContextKit.Tests/**` (rule tests)
- `docs/SCANNER_RULES.md`
- `docs/SARIF_OUTPUT.md`
- `docs/JSON_OUTPUT.md`
- `docs/SECURITY_MODEL.md`

## Implementation Steps
1. Research the entropy threshold and minimum length on synthetic corpora.
2. Add the rule with a conservative severity and an allowlist path set.
3. Add guard tests for synthetic dangerous examples and safe examples.
4. Update docs and ensure the SARIF catalog includes the new rule.

## Security/Privacy Boundary
- Synthetic fixtures only.
- No real credentials, tokens, or certificates in tests or docs.
- Allowlist prevents false positives on common safe strings.

## Backward Compatibility
- Adds a new rule `ACKIT008`; existing rules unchanged.
- JSON schema is additive.

## Acceptance Criteria
- A new rule `ACKIT008 HighEntropyString` exists in the Core catalog.
- Synthetic dangerous example triggers the rule.
- Synthetic safe example does not trigger the rule.
- The rule is listed in `docs/SCANNER_RULES.md` and in the SARIF catalog.
- Existing test suite remains green.

## Tests
- Synthetic trigger test.
- Synthetic safe test.
- Allowlist path test.
- SARIF catalog test for the new rule.

## Validation
- `dotnet test AgentContextKit.sln -c Release --no-build`
- `dotnet run --project src/AgentContextKit.Cli -c Release --no-build -- scan --ci`

## Rollback
Revert the commit.

## Completion Evidence
Pending. Will be filled after implementation and tests.

## Commit
- `feat: add high entropy scanner guard` (if implemented)
- `docs: research entropy scanner rule boundaries` (if design-only)

## Push
- Normal `master` push after validation.

## Hosted Checks
- ci
- cross-platform-smoke
- cross-platform-source-smoke
