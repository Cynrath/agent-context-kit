# TASK-0234: V100 final-candidate local source selection and preparation

## Purpose

Select the exact post-TASK-0233 source-impacting commit as the local V100 final-candidate evidence base and prepare a truthful, version-neutral candidate record without bumping or publishing a package.

## Verified starting state

- Published/package metadata remains immutable `0.2.0-alpha.4`.
- The current shipped/documented CLI surface is the authorized V100 target contract.
- The exact candidate SHA cannot be truthfully recorded until TASK-0233 is committed; execution must use `git rev-parse HEAD` at that boundary.

## Dependencies

- TASK-0232 completed maintainer decision records.
- TASK-0233 completed the last planned source/script/test change in this safe-local chain.

## Scope

- Add `docs/V100_FINAL_CANDIDATE_LOCAL_SELECTION.md`.
- Record the exact TASK-0233 commit as the source-impacting local evidence base.
- Classify later TASK-0234–0238 changes as docs/evidence/governance-only unless inspection proves otherwise.
- Record candidate/predecessor hosted input semantics as current source metadata `0.2.0-alpha.4` and published predecessor `0.2.0-alpha.3`, without selecting a new release version.
- Run local candidate input and path-impact checks.

## Out of scope

- Version bump, package candidate publication, tag, release, workflow dispatch, or final RC acceptance.
- Reusing or replacing the immutable published alpha4 package.
- Claiming that an alpha4 metadata value is a newly published V100 RC.

## Planned files

- `docs/V100_FINAL_CANDIDATE_LOCAL_SELECTION.md`
- `docs/V100_GAP_ANALYSIS.md`
- `docs/ROADMAP.md`
- this task file and active queue/handoff state

## Implementation steps

1. Capture the exact committed TASK-0233 SHA and verify its changed paths.
2. Record why that SHA is the last source-impacting local candidate base.
3. Document the docs-only bridge policy for later commits.
4. Validate candidate/predecessor inputs without `-RequireOriginMaster` while commits remain local.
5. Preserve open hosted/final-acceptance status.

## Data/database impact

None.

## Admin impact

None.

## Security impact

No new sensitive evidence. Candidate records use public commit/package identifiers only.

## Permission/auth impact

None.

## SEO/i18n impact

None.

## Logging/audit impact

Adds an exact SHA and path-classification audit record.

## Acceptance criteria

1. One exact committed SHA is selected as the last source-impacting local V100 candidate base.
2. The record states that no version/release/package selection or mutation occurred.
3. Candidate input semantics are alpha4 current source and alpha3 predecessor only for a future run-unique hosted package.
4. Later docs-only commits are explicitly bridge-classified and do not invalidate source behavior evidence.
5. V100 gaps requiring hosted/final acceptance remain open.
6. One local commit contains this task only.

## Validation commands

```powershell
git rev-parse HEAD
git show --stat --oneline HEAD
powershell -ExecutionPolicy Bypass -File scripts/check-release-candidate-inputs.ps1 -CommitSha (git rev-parse HEAD) -CandidateVersion 0.2.0-alpha.4 -PredecessorVersion 0.2.0-alpha.3
git diff --check
```

## Risks

- Selecting a docs-only or stale SHA. Mitigation: select immediately after TASK-0233 and inspect changed paths.
- Confusing source metadata with a new release version. Mitigation: explicit version-neutral/no-publication wording.

## Rollback plan

Revert the TASK-0234 commit and return the candidate state to unselected.

## Completion-state requirements

- Exact SHA and path classification are recorded.
- TASK-0235 becomes current.

## Completion notes

Completed on 2026-07-10.

- Selected `b1604ae1e73017521d28e5a83f328bb1347406b6` as the last planned source/script/test-impacting local V100 evidence base.
- Reviewed the exact commit paths: only the TASK-0233 performance script, focused test, and supporting evidence/docs changed.
- Local candidate input validation passed for current source metadata `0.2.0-alpha.4` and published predecessor `0.2.0-alpha.3`.
- Recorded the docs-only bridge rule for the future final pushed HEAD.
- No release version, package, tag, GitHub Release, workflow dispatch, publication, or final-candidate acceptance occurred.

Commit: `e19338b`. The next task is TASK-0235.
