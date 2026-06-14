# TASK-0141 Project Queue And Handoff Consistency Audit

## Purpose
Reconcile `docs/PROJECT_EXECUTION_QUEUE.md`, `docs/NEXT_TASKS.md`, `.codex/NEXT_STEPS.md`, `.codex/SESSION_HANDOFF.md`, and `.codex/CONTEXT_PACK.md` so they agree on the active control, completed history, current test count, alpha.3 NO-GO, and `RB-003`/`RB-008` blockers.

## Current State
- `docs/PROJECT_EXECUTION_QUEUE.md` still lists PROJECT-CONTROL-0105 as "In progress" even though the closed commit is `a179bae`.
- `docs/NEXT_TASKS.md` correctly lists PROJECT-CONTROL-0105 as completed but does not yet mark PROJECT-CONTROL-0106 as active.
- `.codex/NEXT_STEPS.md` still references PROJECT-CONTROL-0104 as the active control.
- The 197/197 test count is implicit in the most recent commit but is not surfaced in the queue's "Local Validation" block, which still says 186/186 at commit `d104e02`.
- Alpha.3 NO-GO and `RB-003`/`RB-008` blockers are correctly preserved.

## Scope
- Update the active queue row for PROJECT-CONTROL-0105 to "Completed" with the new test count.
- Add a new active PROJECT-CONTROL-0106 track row pointing to the new control task file.
- Update `NEXT_TASKS.md` to mark PROJECT-CONTROL-0106 as the active control.
- Update `.codex/NEXT_STEPS.md` to point at PROJECT-CONTROL-0106 and to record the 197/197 milestone.
- Update `.codex/SESSION_HANDOFF.md` and `.codex/CONTEXT_PACK.md` to record the closure of PROJECT-CONTROL-0105 and the start of PROJECT-CONTROL-0106.
- Preserve all alpha.3 NO-GO and `RB-003`/`RB-008` references verbatim.

## Out Of Scope
- Closing `RB-003` or `RB-008`.
- Modifying historical task records.
- Claiming release readiness.

## Affected Files
- `docs/PROJECT_EXECUTION_QUEUE.md`
- `docs/NEXT_TASKS.md`
- `.codex/NEXT_STEPS.md`
- `.codex/SESSION_HANDOFF.md` (additive note only)
- `.codex/CONTEXT_PACK.md` (additive note only)

## Implementation
1. In `docs/PROJECT_EXECUTION_QUEUE.md`, change the PROJECT-CONTROL-0105 row to "Completed" and add a new PROJECT-CONTROL-0106 row.
2. Update the "Local Validation" block with the 197/197 count and the latest commit SHA (`a179bae`).
3. In `docs/NEXT_TASKS.md`, mark PROJECT-CONTROL-0105 as completed, add a new "Active PROJECT-CONTROL-0106" section, and update the "Next Task" line.
4. In `.codex/NEXT_STEPS.md`, replace the PROJECT-CONTROL-0104 reference with PROJECT-CONTROL-0106 and add the 197/197 test note.
5. In `.codex/SESSION_HANDOFF.md` and `.codex/CONTEXT_PACK.md`, append a short note that PROJECT-CONTROL-0106 begins at `a179bae` with 197/197 green and TASK-0140–0145 queued.

## Security/Privacy Boundary
- No credential, private report content, raw finding, certificate, or recovery secret may be printed or committed.

## Backward Compatibility
- The new content is purely additive and corrective. Historical completed rows stay unchanged.

## Acceptance Criteria
- `docs/PROJECT_EXECUTION_QUEUE.md` shows PROJECT-CONTROL-0105 as "Completed" and PROJECT-CONTROL-0106 as "In progress".
- `docs/NEXT_TASKS.md` lists PROJECT-CONTROL-0106 as the active control.
- `.codex/NEXT_STEPS.md` references PROJECT-CONTROL-0106 and the 197/197 milestone.
- The 197/197 number is consistent across all three active docs.
- Alpha.3 NO-GO and `RB-003`/`RB-008` remain visible.
- `git diff --check` is clean.
- Local Markdown link gate is clean.

## Tests
- No new tests; documentation-only.

## Validation
- `git diff --check` exit 0.
- `powershell -ExecutionPolicy Bypass -File scripts/check-local-markdown-links.ps1 -FailOnIssues` exit 0.

## Rollback
- Revert the commit.

## Completion Evidence
Pending. Will be filled after the commit and hosted checks.

## Commit
- `docs: refresh active queue after project control 0105`

## Push
- Normal `master` push after validation.

## Hosted Checks
- Standard 3/3 expected.
