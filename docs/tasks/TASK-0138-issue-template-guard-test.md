# TASK-0138 Add Focused Test For The Updated Issue Template And Final Audit Sync

## Purpose
Add a focused xUnit test that guards the GitHub issue template version placeholder value so accidental drift is caught in CI, and refresh the active planning docs with the final TASK-0135+ status.

## Current State
- TASK-0135 updated the four GitHub issue template placeholders from `0.2.0-alpha.1` to `0.2.0-alpha.2`.
- No test currently guards that the placeholders match the current published version.

## Scope
- Add a single repository-static test that asserts the four `.github/ISSUE_TEMPLATE/*.yml` files contain the current published version string in the `ackit version` field.
- Refresh `docs/PROJECT_EXECUTION_QUEUE.md` and `docs/NEXT_TASKS.md` with the TASK-0137/0138 final status.

## Out Of Scope
- Editing the YAML schemas, body, or labels.
- Adding additional template guard tests beyond the four files.

## Affected Files
- `tests/AgentContextKit.Tests/` (one new test).
- `docs/PROJECT_EXECUTION_QUEUE.md` (final status row).
- `docs/NEXT_TASKS.md` (final status row).

## Implementation
1. Add a `IssueTemplateVersionPlaceholderTests.cs` (or equivalent) test class that reads the four files and asserts the `0.2.0-alpha.2` string is present and `0.2.0-alpha.1` is absent in the version placeholder region.
2. Run `dotnet test` to confirm green.
3. Update the active project control section in `docs/PROJECT_EXECUTION_QUEUE.md` with the TASK-0137/0138 final status.
4. Update `docs/NEXT_TASKS.md` accordingly.

## Security/Privacy Boundary
None.

## Compatibility
No runtime change.

## Database Impact
None.

## Admin Impact
None.

## Permission Impact
None.

## SEO/I18n Impact
None.

## Audit/Security Impact
Adds a CI guard against accidental version drift in public-facing issue intake templates.

## Acceptance Criteria
- One new test added and passing.
- `dotnet test` reports at least 189/189 green.
- The active project control rows in `docs/PROJECT_EXECUTION_QUEUE.md` and `docs/NEXT_TASKS.md` reflect TASK-0135/0136/0137/0138 final status.

## Tests
- One new xUnit test.

## Validation
- `dotnet build` clean.
- `dotnet test` green.
- Markdown link gate green.

## Risks
None.

## Rollback
Revert the commit.

## Completion Evidence
Pending. Will be filled after the commit and hosted checks.

## Commit
- `test: guard issue template version placeholder`

## Push
- Normal `master` push after validation.

## Hosted Checks
- Standard 8/8 expected.
