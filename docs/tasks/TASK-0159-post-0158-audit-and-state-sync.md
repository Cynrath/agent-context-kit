# TASK-0159 Post-0158 Audit And State Sync

## Purpose
Confirm that TASK-0156 through TASK-0158 are accurately recorded as completed in the active queue, NEXT_TASKS, handoff docs, and CHANGELOG, and that the 238/238 test milestone is consistent across all active docs.

## Current State
- TASK-0156 brand and PII keyword starter config is complete at commit `99932de`.
- TASK-0157 safe domain and ignored paths starter config is complete at commit `918cff0`.
- TASK-0158 Turkish CLI locale fallback guard is complete at commit `a5686aa`.
- 238/238 local tests are green.
- The active queue rows for TASK-0156/0157/0158 are still marked "Planned" in `docs/PROJECT_EXECUTION_QUEUE.md`.
- `docs/NEXT_TASKS.md` still records the same rows as "Planned" and the "Next Task" line points to PROJECT-CONTROL-0104.
- `docs/PROJECT_EXECUTION_QUEUE.md` "Local Validation" block still says 197/197 at commit `a179bae`.
- `.codex/NEXT_STEPS.md` still records the 197/197 milestone.

## Scope
- Update the active queue, NEXT_TASKS, and handoff docs to mark TASK-0156/0157/0158 as completed and the 238/238 milestone as the current state.
- Add a `PROJECT-CONTROL-0107` track row pointing at the new control task.
- Refresh the "Next Task" line and the handoff closure note.
- Refresh the "Local Validation" block with the latest SHA and test count.
- Add a small `[Unreleased]` entry in `CHANGELOG.md` summarising the 0156-0158 batch.

## Out Of Scope
- Source/package version metadata change.
- Closing any release blocker.
- Modifying the published `0.2.0-alpha.2` package.

## Affected Files
- `docs/PROJECT_EXECUTION_QUEUE.md`
- `docs/NEXT_TASKS.md`
- `docs/ROADMAP.md`
- `.codex/NEXT_STEPS.md`
- `.codex/SESSION_HANDOFF.md` (additive note)
- `.codex/CONTEXT_PACK.md` (additive note)
- `CHANGELOG.md`

## Implementation
1. In `docs/PROJECT_EXECUTION_QUEUE.md`, mark the C1–C3 rows as Completed, refresh the "Local Validation" block, and add a new PROJECT-CONTROL-0107 row.
2. In `docs/NEXT_TASKS.md`, mark TASK-0156/0157/0158 as completed, add an "Active PROJECT-CONTROL-0107" section, and update the "Next Task" and "Execution Rule" lines.
3. In `docs/ROADMAP.md`, add a short forward-looking note that PROJECT-CONTROL-0107 closes the local product extension and queues the docs-first continuation.
4. In `.codex/NEXT_STEPS.md`, replace the 197/197 reference with the 238/238 milestone and add a closure note for PROJECT-CONTROL-0107.
5. In `.codex/SESSION_HANDOFF.md` and `.codex/CONTEXT_PACK.md`, append a short note that PROJECT-CONTROL-0107 begins at `a5686aa` with 238/238 green and TASK-0159–0167 queued.
6. In `CHANGELOG.md`, add a small `[Unreleased]` entry summarising the recent batch.

## Security/Privacy Boundary
- No credential, private report content, raw finding, certificate, or recovery secret may be printed or committed.

## Backward Compatibility
- Pure additive and corrective documentation. Historical completed rows stay unchanged.

## Acceptance Criteria
- `docs/PROJECT_EXECUTION_QUEUE.md` and `docs/NEXT_TASKS.md` agree on the active control and the 238/238 milestone.
- `.codex/NEXT_STEPS.md` records the 238/238 milestone.
- TASK-0156/0157/0158 are marked completed everywhere.
- `git diff --check` is clean.
- Local Markdown link gate is clean.
- No release write is performed.

## Tests
- No new tests; documentation-only.

## Validation
- `git diff --check` exit 0.
- `powershell -ExecutionPolicy Bypass -File scripts/check-local-markdown-links.ps1 -FailOnIssues` exit 0.
- `powershell -ExecutionPolicy Bypass -File scripts/check-tracked-vs-untracked-md.ps1 -FailOnIssues` exit 0.

## Rollback
- Revert the commit.

## Completion Evidence
Pending. Will be filled after the commit and hosted checks.

## Commit
- `docs: sync state after task 0158`

## Push
- Normal `master` push after validation.

## Hosted Checks
- Standard 3/3 expected.
