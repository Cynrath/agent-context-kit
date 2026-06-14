# TASK-0150 Report And Webui Accessibility And Offline UX Polish

## Purpose
Improve the offline `ackit report` HTML output and the `ackit webui` static prototype for accessibility (semantic structure, color contrast notes, keyboard navigation hints) without adding any new external resource, network call, or hosted UI.

## Current State
- `src/AgentContextKit.Core/Generation.cs` emits the HTML report and Web UI prototype.
- `docs/HTML_REPORTS.md` and `docs/WEB_UI_PROTOTYPE.md` describe the formats.
- No focused test currently asserts the offline-only or accessibility properties of the generated HTML.

## Scope
- Add a focused test that asserts the generated HTML does not reference external network resources.
- Add a small accessibility hint to `docs/HTML_REPORTS.md` (no new rendered fields, no schema change).
- No new scanner rule, no JSON schema, no SARIF profile change.

## Out Of Scope
- Adding a hosted Web UI.
- Adding any new external CDN, font, or analytics reference.
- Modifying the published `0.2.0-alpha.2` package.

## Affected Files
- `docs/HTML_REPORTS.md` (small accessibility hint).
- `tests/AgentContextKit.Tests/` (guard test).

## Implementation
1. Add a test that scans the generated HTML for `http://` or `https://` references other than the in-document `#` anchors and W3C `xmlns` URIs.
2. Add a short accessibility hint to `docs/HTML_REPORTS.md`.
3. Confirm `ackit report --output ...` still works.

## Security/Privacy Boundary
- No credential, raw finding, or recovery secret may be printed.

## Backward Compatibility
- Pure additive documentation plus a guard test. Generated HTML remains identical.

## Acceptance Criteria
- New test passes.
- `dotnet test` is 211+/211+ green.
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
- `docs: add offline-only and accessibility guard for report`

## Push
- Normal `master` push after validation.

## Hosted Checks
- Standard 3/3 expected.
