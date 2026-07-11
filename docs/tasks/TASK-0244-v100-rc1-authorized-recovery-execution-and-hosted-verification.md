# TASK-0244: V100 RC1 authorized recovery execution and hosted verification

## Purpose

Execute the TASK-0243 exact-existing-package recovery operation exactly once for `AgentContextKit 1.0.0-rc.1`, then verify the resulting immutable tag, prerelease, exact release assets, attestations, and Windows/Ubuntu/macOS global-tool installation evidence without any NuGet publication.

## Verified starting state

- TASK-0242 NuGet package is immutable and installable at exact repository commit `258918b33c3d1359aac967604ee524e8b66ddf02`.
- TASK-0242 validated artifact `8242162439` is unexpired until 2026-07-24.
- Candidate hashes are nupkg `86c2338e5766c3ebe18f234df85b976be449feaf2890a1cec05b561f97c1db4d` and snupkg `f1570e7cfbad411199140cc68fd58c898639060ceaa3b6575adcaf15e2d93b3d`.
- Initial read-only audit found tag/release/two candidate attestations absent.
- Recovery has not been dispatched.

## Dependencies

- TASK-0243 completed, locally validated, pushed, and covered by green standard CI.
- Clean synchronized `master` and unchanged exact remote preconditions immediately before dispatch.
- Explicit user authorization for exactly one `recover-existing` dispatch.

## Scope

- Require TASK-0243 implementation, local validation, clean/synchronized `master`, and successful push-triggered pre-recovery CI.
- Reconfirm once that NuGet RC1 exists and tag/release/attestations remain absent immediately before dispatch.
- Dispatch `.github/workflows/release.yml` exactly once with `operation=recover-existing` and the fixed evidence tuple.
- Wait for that single workflow run without rerun or recovery-on-recovery.
- On success, verify run inputs/jobs, exact tag target, prerelease state/body/assets/digests, both attestations, and three-platform installation evidence.
- On partial failure, inspect the failed job/log once, audit current remote state once, document it, and stop.
- Record hosted evidence separately from TASK-0242 history.

## Implementation steps

1. Validate local/remote preconditions once and assemble the exact immutable input tuple.
2. Dispatch `release.yml` once with `operation=recover-existing`.
3. Discover and block on that run without rerun or duplicate polling.
4. On success, perform one bounded evidence verification; on failure, inspect once, audit once, and stop.
5. Update TASK-0244 and supply-chain/hosted/handoff documents with factual evidence.

## Out of scope

- `operation=publish`, NuGet login/push, a second workflow dispatch, workflow rerun, automatic repair, manual asset upload, package replacement/unlist, tag movement, force push, history rewrite, or repository/settings mutation.
- Updating the published smoke pin; that is conditional TASK-0245 work after full recovery success.

## Affected files

- `docs/tasks/TASK-0244-v100-rc1-authorized-recovery-execution-and-hosted-verification.md`
- `docs/HOSTED_VALIDATION_STATUS.md`
- `docs/PUBLISHED_SUPPLY_CHAIN_STATUS.md`
- `docs/MAINTAINER_DECISION_REGISTER.md`
- `docs/V100_GAP_ANALYSIS.md`
- `docs/V100_RC1_RELEASE_PLAN.md`
- Active roadmap, queue, release-validation, and `.codex` handoff documents

## Data/database impact

None.

## Admin impact

None for the product. GitHub release administration changes only through the authorized workflow token and exact recovery job.

## Security impact

This task performs the authorized remote recovery mutation. It must use exact evidence only, preserve NuGet immutability, create a non-movable tag at the package commit, and create attestations for both exact release assets. Any mismatch or unexpected remote state is a hard stop.

## Permission/auth impact

Uses the existing GitHub Actions `GITHUB_TOKEN` with recovery-job `contents: write`, `actions: read`, `id-token: write`, and `attestations: write`. No NuGet credential, environment login, package write permission, manual token, or owner/settings change is authorized.

## Localization impact

None.

## SEO impact

The GitHub prerelease becomes publicly discoverable if recovery succeeds, but no repository SEO metadata changes are made in TASK-0244.

## UX impact

Completes the missing GitHub prerelease and supplies trustworthy installation evidence on all supported operating systems.

## Logging/audit impact

Record the single run ID, job IDs, exact workflow inputs, source artifact ID/digest, tag target, release URL, asset names/hashes/digests, attestation verification results, and three operating-system outcomes. Preserve TASK-0242 as immutable historical evidence.

## Acceptance criteria

- Pre-dispatch repository and remote preconditions pass on the exact automation commit.
- Exactly one `release.yml` dispatch occurs with `operation=recover-existing`.
- Inputs are: version `1.0.0-rc.1`, release commit `258918b33c3d1359aac967604ee524e8b66ddf02`, source run `29131335084`, prerelease `true`, and the exact TASK-0242 artifact hashes.
- No normal publish operation, NuGet push/login, second dispatch, rerun, manual upload, tag force, or history rewrite occurs.
- Successful run creates `v1.0.0-rc.1` only at the exact release commit.
- Successful run creates the GitHub prerelease from `docs/RELEASE_BODY_V100_RC1.md` with only the verified nupkg/snupkg assets.
- Successful run creates and verifies attestations for both exact assets.
- Successful run verifies global installation on Windows, Ubuntu, and macOS.
- If the run partially fails, no automatic fix occurs; one remote audit is recorded and execution stops before TASK-0245 pin mutation.

## Test steps

1. Verify clean/synchronized `master`, TASK-0243 commit, local gates, and pre-recovery standard CI.
2. Perform one read-only absence/existence precondition block.
3. Execute one `gh workflow run release.yml` command with `operation=recover-existing` and exact inputs.
4. Wait for the discovered run once with `gh run watch --exit-status`.
5. On success, inspect run/job JSON once and verify tag/release/assets/attestations once.
6. On failure, inspect the failed job/log once and perform the bounded one-time immutable-state audit.

## Risks

- The source artifact can expire; do not substitute locally rebuilt packages.
- GitHub propagation or attestation service failure could leave a partial remote state; the one-dispatch hard stop prevents compounding it.
- A successful tag/release without all attestations or platform jobs is still incomplete and must not trigger TASK-0245 smoke-pin changes.

## Rollback plan

There is no destructive rollback for an exact immutable recovery. Before dispatch, fix through a normal successor commit. After dispatch, preserve all remote evidence. If incomplete, document and stop; never move/delete/recreate the tag or replace release assets automatically.

## Completion notes

Status: `PLANNED / AUTHORIZED / NOT_DISPATCHED`. Depends on completed TASK-0243 implementation, push, and pre-recovery CI. The user explicitly authorized exactly one recovery dispatch and explicitly prohibited a second dispatch or normal publish operation.
