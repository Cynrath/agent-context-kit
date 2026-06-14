# TASK-0136 Active Docs Project Control And Test Count Refresh

## Purpose
Refresh the active planning and queue docs so they consistently reference PROJECT-CONTROL-0104 as the active control and the verified local test count.

## Current State
- `master` is at `cf5b6ae` with 186/186 local tests green.
- `docs/PROJECT_EXECUTION_QUEUE.md` and `docs/NEXT_TASKS.md` currently call out PROJECT-CONTROL-0103 as the active track and reference historical `TASK-0116–TASK-0134` as the most recent queue.
- `docs/NEXT_TASKS.md:78` already names PROJECT-CONTROL-0104 as the future control but does not mark it active.
- `.codex/SESSION_HANDOFF.md`, `.codex/CONTEXT_PACK.md`, and `.codex/NEXT_STEPS.md` are intentionally historical and remain accurate.

## Scope
- Mark PROJECT-CONTROL-0104 as the active control in the queue and `NEXT_TASKS.md`.
- Add the initial TASK-0135 row to the active queue.
- Keep historical task summaries intact; do not rewrite them.
- Add a single-sentence local validation status line with the verified 186/186 test count.
- Add a release note that `v0.2.0-alpha.3` remains NO-GO and `RB-003`/`RB-008` remain maintainer-gated.

## Out Of Scope
- Changing source/package metadata, tag, release, or NuGet state.
- Closing any `RB-xxx` blocker.
- Editing closed task files or historical SESSION_HANDOFF sections.

## Affected Files
- `docs/PROJECT_EXECUTION_QUEUE.md`
- `docs/NEXT_TASKS.md`
- `.codex/NEXT_STEPS.md` (small addendum: active control pointer)

## Implementation
- Add a new "Active PROJECT-CONTROL-0104 Track" section header and initial row referencing the new control task file and TASK-0135/0136.
- Keep existing "Active PROJECT-CONTROL-0103 Track" rows marked Completed or completed to the safe boundary; do not delete them.
- Append TASK-0136 to the new active track.
- Update the "Next Task" line in `NEXT_TASKS.md` to point at PROJECT-CONTROL-0104.
- Update the "Next Clear Steps" pointer in `.codex/NEXT_STEPS.md` to PROJECT-CONTROL-0104.

## Security/Privacy Boundary
None. Documentation-only.

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
- Makes the active control unambiguous.
- Preserves the alpha.3 NO-GO and `RB-003`/`RB-008` blocker visibility.

## Acceptance Criteria
- `docs/PROJECT_EXECUTION_QUEUE.md` has a new "Active PROJECT-CONTROL-0104 Track" section listing the new control task plus TASK-0135 and TASK-0136.
- `docs/NEXT_TASKS.md` "Next Task" line points to PROJECT-CONTROL-0104.
- `.codex/NEXT_STEPS.md` lists the active control.
- Historical rows are not removed; only an "Active PROJECT-CONTROL-0104 Track" addition is made.

## Tests
None. Documentation-only.

## Validation
- `powershell -ExecutionPolicy Bypass -File scripts/check-local-markdown-links.ps1 -FailOnIssues` exit 0.
- `git diff --check` exit 0.

## Risks
Accidentally rewriting historical rows; mitigated by additive edits only.

## Rollback
Revert the commit.

## Completion Evidence
Pending. Will be filled after the commit and hosted checks.

## Commit
- `docs: refresh active project control to 0104`

## Push
- Normal `master` push after validation.

## Hosted Checks
- Standard 8/8 expected.
