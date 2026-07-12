# TASK-0247: V100 RC1 authorized exact-package recovery execution

## Purpose

After TASK-0246 is pushed and all standard CI is green, execute the exact-existing-package recovery operation exactly once for `AgentContextKit 1.0.0-rc.1`, then verify the immutable tag, prepared prerelease, exact TASK-0242 release assets, both attestations, and Windows/Ubuntu/macOS installed-tool smoke evidence without any NuGet publication.

## Verified starting state

- TASK-0242 published the immutable NuGet package from release commit `258918b33c3d1359aac967604ee524e8b66ddf02` but did not create tag/release/provenance.
- TASK-0244 run `29151228607` failed before mutation and consumed only the earlier authorization.
- Exact TASK-0242 source run/artifact and hashes remain recorded in TASK-0243/TASK-0244.
- A new dispatch is prohibited until TASK-0246 implementation and standard hosted CI are fully green.

## Dependencies

- Completed/pushed TASK-0246 commit with green `ci`, `cross-platform-smoke`, and `cross-platform-source-smoke` runs.
- Clean synchronized `master` and a single bounded remote-state preflight immediately before dispatch.
- Exact source run `29131335084`, artifact `8242162439`, release body `docs/RELEASE_BODY_V100_RC1.md`, and exact package hashes.
- Explicit authorization for exactly one new `recover-existing` dispatch.

## Scope

- Verify once that the exact source artifact remains valid, NuGet RC1 exists unchanged, and tag/release/attestations are absent.
- Dispatch `.github/workflows/release.yml` exactly once with `operation=recover-existing`.
- Use version `1.0.0-rc.1`, release commit `258918b33c3d1359aac967604ee524e8b66ddf02`, tag `v1.0.0-rc.1`, and the exact TASK-0242 evidence tuple.
- Discover the new workflow run once and wait through one `gh run watch <RUN_ID> --exit-status --interval 30` invocation.
- On success, inspect the run evidence once and verify exact tag target, prerelease body/state/assets, both attestations, and Windows/Ubuntu/macOS global-tool smoke results.
- On partial failure, inspect the failed log once, perform one immutable remote-state audit, document facts, and stop without TASK-0248 success-only mutations.
- Preserve TASK-0242 and TASK-0244 as separate failed historical records.

## Implementation steps

1. Require green TASK-0246 standard CI and assemble the immutable recovery tuple.
2. Run one atomic preflight and one `recover-existing` dispatch.
3. Discover the run once and block on it once.
4. Branch once on final outcome: success evidence verification, or one log plus one remote-state audit and safe stop.
5. Record TASK-0247 evidence separately and update active status documents factually.

## Out of scope

- Normal `release.yml` publish operation or any NuGet login/push/change/unlist/replace/delete.
- A second recovery dispatch, rerun, retry, automatic fix, or manual package/asset upload.
- Moving or force-updating any tag; creating RC1 at any commit other than the exact release commit.
- Force push, history rewrite, repository/security/collaborator/settings changes, or GA readiness claim.
- Updating the published smoke pin before every recovery done criterion succeeds.

## Affected files

- Remote `.github/workflows/release.yml` run state only through the authorized dispatch
- `docs/tasks/TASK-0247-v100-rc1-authorized-exact-package-recovery-execution.md`
- `docs/HOSTED_VALIDATION_STATUS.md`
- `docs/PUBLISHED_SUPPLY_CHAIN_STATUS.md`
- `docs/MAINTAINER_DECISION_REGISTER.md`
- `docs/V100_GAP_ANALYSIS.md`
- `docs/V100_RC1_RELEASE_PLAN.md`
- Active roadmap, queue, release-validation, and `.codex` handoff records

## Data/database impact

None.

## Admin impact

No product admin impact. The authorized GitHub workflow creates only the exact tag/prerelease/assets/attestations described by this task.

## Security impact

This is a high-impact supply-chain mutation. Every exact source-run, artifact, hash, signature, package metadata, commit, and absent-state gate must pass before mutation. The workflow must never gain a NuGet publication path.

## Permission/auth impact

The recovery job may use GitHub Actions `contents: write`, `actions: read`, `id-token: write`, and `attestations: write`. It must not use `NuGet/login`, `NUGET_API_KEY`, package write permission, the `nuget-release` environment, repository settings permission, or manual credentials.

## Localization impact

None. Technical evidence is recorded in English; Turkish public documentation is synchronized only after complete success.

## SEO impact

A successful prerelease becomes publicly discoverable on GitHub. No site metadata or runtime SEO code changes.

## UX impact

A successful run gives users an exact GitHub prerelease with trustworthy assets and three-platform installation proof. A failed run leaves an explicit factual stop rather than an ambiguous retry.

## Logging/audit impact

Record the single dispatch/run/job IDs, immutable inputs, source artifact identity/digest, tag target, release URL/body/state, asset names/hashes/digests, attestation verification, and three-platform results. Never log credentials or erase older failure evidence.

## Acceptance criteria

- TASK-0246 standard CI is fully green before dispatch.
- Exactly one new `release.yml` dispatch uses `operation=recover-existing`; `operation=publish` is never run.
- Inputs bind version `1.0.0-rc.1`, commit `258918b33c3d1359aac967604ee524e8b66ddf02`, tag `v1.0.0-rc.1`, source run `29131335084`, artifact `8242162439`, prerelease `true`, and exact nupkg/snupkg hashes.
- No NuGet push/login/change/unlist/replace/delete or manual package upload occurs.
- Successful recovery creates the tag only at the exact release commit.
- Successful recovery creates the prerelease from the prepared body with only the verified exact nupkg/snupkg assets.
- Separate provenance/attestation is created and verified for both exact release assets.
- Global install and basic command smoke tests pass on Windows, Ubuntu, and macOS.
- The run is discovered once and watched once; no rerun or second dispatch occurs.
- Partial failure triggers one log review, one remote-state audit, documentation, and a hard stop.

## Test steps

1. Confirm clean/synchronized `master` and green TASK-0246 standard CI.
2. Execute one bounded immutable-state/source-artifact preflight.
3. Dispatch `release.yml` once with exact `recover-existing` inputs.
4. Discover the run once and execute `gh run watch <RUN_ID> --exit-status --interval 30` once.
5. On success, inspect run/jobs once and verify tag/release/assets/attestations once.
6. On failure, inspect the failed log once and audit immutable remote state once.

## Risks

- The retained source artifact can expire; local rebuild or substitute upload is forbidden.
- A service or attestation failure can leave a new partial immutable state; no retry/rerun is allowed.
- A tag/release race between preflight and mutation must fail closed through in-workflow repeated state gates.
- Success of tag/release alone is insufficient; both attestations and all three platform smokes are required for TASK-0248.

## Rollback plan

There is no destructive rollback. Before dispatch, correct through a normal successor commit. After dispatch, preserve all remote evidence exactly; do not move/delete/recreate tags, releases, assets, or attestations. On incomplete recovery, document and stop for a new explicit decision.

## Completion notes

Status: `PLANNED / BLOCKED UNTIL TASK-0246 CI IS GREEN`.

