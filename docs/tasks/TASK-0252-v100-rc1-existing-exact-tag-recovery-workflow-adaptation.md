# TASK-0252: V100 RC1 existing exact tag recovery workflow adaptation

## Purpose

Adapt the NuGet-publish-free `recover-existing` operation so it completes the immutable `AgentContextKit 1.0.0-rc.1` GitHub prerelease from the already-created exact tag without creating, pushing, moving, deleting, or otherwise mutating any tag.

## Verified starting state

- Entry HEAD and `origin/master` are `7c46a3d573ae1f7208a2bb75557ea643190ea6ef` on clean `master`.
- Installed ACKit is `1.0.0-rc.1`; doctor is 13/13 PASS and `scan --ci` exits 0 with no Critical/High blocker.
- NuGet `AgentContextKit 1.0.0-rc.1` is immutable at release commit `258918b33c3d1359aac967604ee524e8b66ddf02`.
- Local and remote tag `v1.0.0-rc.1` both resolve to the exact release commit.
- GitHub prerelease, release assets, nupkg attestation, and snupkg attestation are absent.
- Historical TASK-0242, TASK-0244, TASK-0247, and TASK-0250 failures remain preserved.

## Dependencies

- Exact source run `29131335084`, artifact `8242162439`, artifact digest `sha256:cd5550b2172aa0e4ff9bf700f6eefb04dfd8dbd88c8d7fee22914c1769533b3f`.
- Candidate nupkg SHA-256 `86c2338e5766c3ebe18f234df85b976be449feaf2890a1cec05b561f97c1db4d`.
- Candidate snupkg SHA-256 `f1570e7cfbad411199140cc68fd58c898639060ceaa3b6575adcaf15e2d93b3d`.
- Existing recovery verification scripts and prepared RC1 release body.

## Scope

- Replace the recovery tag-absence/tag-creation contract with fail-closed exact-existing-tag verification.
- Require package, source run, source artifact, digest, candidate hashes, repository signature/content/commit, tag, release absence, asset absence, and attestation absence before mutation.
- Create the prerelease with `gh release create --verify-tag --target <exact-release-commit>` and only the validated nupkg/snupkg.
- Preserve attestation ordering after exact release-asset verification.
- Add focused cross-platform regression coverage for accepted/missing/wrong tag and unexpected release/asset/attestation state.
- Complete local validation, commit separately, push with the planning commit, and require green `ci`, `cross-platform-smoke`, and `cross-platform-source-smoke` before TASK-0253.

## Out of scope

- NuGet login/push/republication, normal `publish`, tag creation/push/ref API mutation, manual release/asset/attestation mutation, workflow dispatch, settings changes, force push, history rewrite, or GA claims.

## Affected files

- `.github/workflows/release.yml`
- `.github/workflows/cross-platform-source-smoke.yml` if required for regression execution
- `scripts/check-release-workflow.ps1`
- `scripts/test-supply-chain-workflow.ps1`
- `scripts/test-existing-package-recovery.ps1`
- `scripts/github-release-state.ps1`
- `scripts/test-github-release-state.ps1`
- `scripts/verify-existing-package-recovery.ps1`
- `scripts/verify-existing-release.ps1`
- Release, recovery, supply-chain, queue, roadmap, task, and handoff documentation

## Data/database impact

None. No database, migration, stored data, or schema changes.

## Admin impact

No product-admin impact. Repository administration and settings remain unchanged.

## Security impact

Critical supply-chain hardening. Every remote identity and immutable artifact condition must fail closed before release creation. The recovery path must make NuGet publication and all tag mutation impossible.

## Permission/auth impact

No new credential, PAT, secret, GitHub App, environment, collaborator, or repository permission. Existing workflow permissions remain limited to the authorized release/attestation operation.

## SEO/i18n impact

No public status change in this task. Repository technical artifacts remain English; later README English/Turkish parity is owned by TASK-0254.

## UX impact

Maintainers receive an auditable recovery path that accepts only the exact pre-existing tag and refuses ambiguous or partial remote state.

## Logging/audit impact

Static and fixture tests must prove mutation ordering, tag immutability, NuGet-publish absence, and exact state checks without exposing credentials.

## Implementation plan

1. Inspect the release workflow, source-smoke workflow, recovery helpers/tests, TASK-0250 evidence, and release/supply-chain docs.
2. Replace tag absence and mutation with exact tag fetch/resolve/target verification.
3. Rename the release mutation step to `Create GitHub prerelease from verified exact existing tag` and use `--verify-tag` plus the exact target.
4. Extend fail-closed regression fixtures and static gates.
5. Run focused and full validation, update this task and handoff docs, and create the separate TASK-0252 implementation commit.
6. Push planning plus implementation once and wait for the three exact-HEAD standard workflows.

## Acceptance criteria

- Exact existing tag is accepted; missing or wrong-SHA tag fails before mutation.
- Existing release, unexpected assets, or unexpected attestations follow a documented fail-closed contract.
- Recovery contains no `git tag`, tag `git push`, tag ref API mutation, NuGet login, or NuGet push.
- Release creation follows package/artifact/tag/release-state verification; attestations follow exact asset verification.
- Windows, Ubuntu, and macOS source-smoke execute the relevant recovery tests.
- Focused scripts, Release build, full tests, ACKit, V100, supply-chain, package, Markdown, Unicode-path, diff, and `.ackit` tracking gates pass.
- TASK-0252 HEAD passes `ci`, `cross-platform-smoke`, and `cross-platform-source-smoke` before any recovery dispatch.

## Validation commands

Use the focused and full local validation commands authorized in the controlling request, including the established Unicode temporary-path regression guard and the pre-push tracked/untracked Markdown gate.

## Failure boundary

Local implementation or test failures may be fixed and retested. No remote recovery dispatch occurs in this task. If standard CI is not fully green, TASK-0253 must not start.

## Risks

- A weak tag check could release from the wrong commit.
- A stale partial remote state could be overwritten unless every absence check is fail-closed.
- Static substring checks can miss semantically equivalent mutations unless workflow and fixture coverage are both used.

## Rollback or safe-stop procedure

Before remote dispatch, use normal successor commits only; do not reset, rewrite, force-push, mutate tags, or delete user work. If CI remains red, stop before TASK-0253 and report exact evidence.

## Completion evidence requirements

Record the implementation commit, local test counts/results, exact CI run IDs, tag-immutability assertions, clean-tree state, and confirmation that no release/NuGet/tag mutation or workflow dispatch occurred.

## Completion notes

Status: `PLANNED / NOT IMPLEMENTED`.
