# TASK-0164 Report And WebUI Accessibility And Offline UX Polish

## Purpose
Improve the offline `ackit report` HTML output and the `ackit webui` static prototype for accessibility and readability without breaking the offline-only contract.

## Current State
- TASK-0150 added a guard test that asserts the generated HTML contains no external network references.
- `docs/HTML_REPORTS.md` and `docs/WEB_UI_PROTOTYPE.md` describe the formats.
- No focused test currently asserts that the generated HTML includes semantic structure (lang attribute, headings, main landmark).

## Scope
- Add a small focused test that asserts the generated HTML carries a `lang` attribute, at least one `<h1>`, and a `<main>` landmark when the Core HTML report generator is used.
- Add a short accessibility note to `docs/HTML_REPORTS.md`.
- No new external resource, no new schema, no SARIF change.

## Out Of Scope
- Adding a hosted Web UI.
- Adding any external CDN, font, or analytics reference.
- Modifying the published `0.2.0-alpha.2` package.

## Affected Files
- `docs/HTML_REPORTS.md` (additive note).
- `tests/AgentContextKit.Tests/` (guard test).

## Implementation
1. Add a focused test that asserts the generated HTML has a `lang` attribute, at least one `<h1>`, and a `<main>` element.
2. Add a small accessibility note to `docs/HTML_REPORTS.md`.

## Security/Privacy Boundary
- No credential, raw finding, or recovery secret may be printed.

## Backward Compatibility
- Pure additive documentation plus a guard test.

## Acceptance Criteria
- New test passes.
- `dotnet test` is 243+/243+ green.
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
- `feat: polish offline report accessibility`

## Push
- Normal `master` push after validation.

## Hosted Checks
- Standard 3/3 expected.
