# TASK-0145 Final Validation And Hosted Check Sync

## Purpose
Run the full local validation suite, run all relevant `scripts/check-*.ps1` gates, and confirm the standard hosted 3/3 jobs are green for the final PROJECT-CONTROL-0106 HEAD. Record the final state in the handoff.

## Current State
- TASK-0140 through TASK-0144 have been applied. Local tests should still be 197+/197+ green and the new doc/test additions should pass.
- The standard hosted jobs (ci, cross-platform-smoke, cross-platform-source-smoke) are green for `a179bae` but new commits have been pushed during the active control.
- The final commit of PROJECT-CONTROL-0106 is unknown until the last task lands.

## Scope
- Run the full local validation suite plus every relevant `scripts/check-*.ps1` gate.
- Confirm the standard hosted 3/3 jobs are green for the final HEAD.
- Update `.codex/NEXT_STEPS.md` and `.codex/CONTEXT_PACK.md` with the final PROJECT-CONTROL-0106 closure note and the next-control pointer.

## Out Of Scope
- Any release, tag, or NuGet action.
- Closing `RB-003` or `RB-008`.

## Affected Files
- `.codex/NEXT_STEPS.md` (final closure note).
- `.codex/CONTEXT_PACK.md` (final closure note).

## Implementation
1. Run the full local validation suite.
2. Run every `scripts/check-*.ps1` gate that does not trigger a release or NuGet publish.
3. If everything is green, commit the final handoff note and push.
4. Verify the standard hosted 3/3 jobs are green for the new HEAD.

## Security/Privacy Boundary
- Do not run any release or publish-triggering script. No secret, certificate, or recovery secret may be printed or committed.

## Backward Compatibility
- Pure additive closure note. No runtime, contract, or release impact.

## Acceptance Criteria
- Full local validation suite is green.
- Every relevant `scripts/check-*.ps1` gate that ran is green.
- Standard hosted 3/3 jobs are green for the final HEAD.
- `.codex/NEXT_STEPS.md` and `.codex/CONTEXT_PACK.md` reflect the final closure.

## Tests
- No new tests; this is a final validation task.

## Validation
- See the local and hosted acceptance criteria.

## Rollback
- Revert the final commit.

## Completion Evidence
Pending. Will be filled after the commit and hosted checks.

## Commit
- `docs: record project control 0106 final state`

## Push
- Normal `master` push after validation.

## Hosted Checks
- Standard 3/3 expected for the final HEAD.
