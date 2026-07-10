# TASK-0236: V100 hosted release-candidate evidence input preparation

## Purpose

Prepare the exact, copy-ready hosted RC evidence input/evidence packet for the final pushed HEAD without dispatching or rerunning any workflow.

## Verified starting state

- The manual `release-candidate-evidence.yml` workflow exists, is `workflow_dispatch` only, and uses read-only contents permissions.
- Historical alpha2/alpha3/alpha4 runs remain valid only for their exact commits.
- The expanded TASK-0233 benchmark is invoked by the existing workflow through the same script path.

## Dependencies

- TASK-0234 source-base selection.
- TASK-0235 local contract-freeze preparation.

## Scope

- Update `docs/RC_HOSTED_EVIDENCE.md`, `docs/HOSTED_VALIDATION_STATUS.md`, and release evidence guidance for the next dispatch.
- Prepare dispatch-time values: `commit_sha = origin/master` after the single final push, `candidate_version = 0.2.0-alpha.4`, `predecessor_version = 0.2.0-alpha.3`.
- Explain run-unique candidate packaging and immutable alpha4 non-mutation.
- Prepare exact validation, dispatch, and read-only evidence-capture commands.
- Record the first remaining authorization boundary as manual workflow dispatch.

## Out of scope

- Running `gh workflow run`, rerunning a workflow, waiting for manual RC evidence, or recording invented run IDs.
- Publishing, version bump, tag, GitHub Release, NuGet, settings, secrets, or provenance creation.

## Planned files

- `docs/RC_HOSTED_EVIDENCE.md`
- `docs/HOSTED_VALIDATION_STATUS.md`
- `docs/RELEASE_CANDIDATE_EVIDENCE.md`
- `docs/RELEASE_VALIDATION.md`
- `docs/V100_GAP_ANALYSIS.md`
- this task file and active queue/handoff state

## Implementation steps

1. Preserve historical hosted tuples and add a clearly future/unexecuted V100 input section.
2. Add exact pre-dispatch input validation and manual dispatch commands.
3. Document expected evidence fields and failure interpretation for the expanded benchmark.
4. Validate the workflow and input scripts locally without `-RequireOriginMaster` while commits are unpushed.
5. Leave the dispatch explicitly unexecuted.

## Data/database impact

None.

## Admin impact

None.

## Security impact

The future workflow remains read-only, no-upload, no-secret, and uses synthetic/public fixtures.

## Permission/auth impact

No permission change. Manual dispatch requires existing maintainer GitHub authority.

## SEO/i18n impact

None.

## Logging/audit impact

No hosted run record is created by this task; only the future evidence schema and commands are documented.

## Acceptance criteria

1. Dispatch-time commit/version/predecessor inputs are exact and copy-ready.
2. Historical evidence is not rewritten as current final-candidate evidence.
3. The expanded performance/resource outputs are included in expected evidence.
4. Static workflow/input validation passes locally.
5. No workflow dispatch/rerun or other remote mutation occurs.
6. One local commit contains this task only.

## Validation commands

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-release-candidate-workflow.ps1 -FailOnIssues
powershell -ExecutionPolicy Bypass -File scripts/test-release-candidate-inputs.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-release-candidate-inputs.ps1 -CommitSha (git rev-parse HEAD) -CandidateVersion 0.2.0-alpha.4 -PredecessorVersion 0.2.0-alpha.3
git diff --check
```

## Risks

- Accidental dispatch from copy-ready commands. Mitigation: commands live under an explicit maintainer-only boundary and are not executed in this task.
- Using a local pre-push SHA. Mitigation: normative command derives `origin/master` after the single final push.

## Rollback plan

Revert the TASK-0236 commit; no remote state exists to roll back.

## Completion-state requirements

- Actual local static/input results and commit are recorded.
- TASK-0237 becomes current.

## Completion notes

Completed on 2026-07-10.

- Prepared dispatch-time inputs: final pushed `origin/master`, `candidate_version=0.2.0-alpha.4`, `predecessor_version=0.2.0-alpha.3`.
- Preserved source-impacting base `b1604ae1e73017521d28e5a83f328bb1347406b6` and the required docs-only bridge review.
- Documented run-unique package semantics so immutable alpha4 cannot be replaced or republished.
- Added exact post-push validation, manual dispatch, evidence-capture, and failure-boundary guidance.
- Local workflow static gate, positive/negative input fixtures, and alpha4/alpha3 current-HEAD input validation all passed.
- No `gh workflow run`, workflow rerun, package/tag/release/settings/secret/provenance mutation, or hosted result claim occurred.

Commit: `6aa5a6b`. The next task is TASK-0237.
