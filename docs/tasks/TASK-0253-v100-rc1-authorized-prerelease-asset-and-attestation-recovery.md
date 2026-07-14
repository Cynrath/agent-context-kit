# TASK-0253: V100 RC1 authorized prerelease asset and attestation recovery

## Purpose

After TASK-0252 is pushed and its exact-HEAD standard CI is green, perform exactly one authorized `recover-existing` dispatch to create and verify the `1.0.0-rc.1` GitHub prerelease, exact assets, two attestations, and Windows/Ubuntu/macOS installed-tool recovery smoke from the verified existing exact tag.

## Verified starting state

- NuGet `1.0.0-rc.1` is already published, immutable, installable, repository-signed, and associated with release commit `258918b33c3d1359aac967604ee524e8b66ddf02`.
- Existing tag `v1.0.0-rc.1` targets the exact release commit and must not be mutated.
- At planning time the GitHub prerelease, its two assets, and their attestations are absent.
- TASK-0252 must supply an exact automation commit with green `ci`, `cross-platform-smoke`, and `cross-platform-source-smoke`.

## Dependencies

- Successful TASK-0252 implementation and hosted validation.
- Exact source run/artifact/digest and candidate hashes recorded in TASK-0252.
- Release commit ancestry from the TASK-0252 automation HEAD.
- Explicit authorization for exactly one new `recover-existing` dispatch in this session.

## Scope

- Run one immutable preflight covering clean/synchronized Git, CI, NuGet identity/signature/content/commit, source run/artifact/digest/hashes, exact tag, release/assets/attestations absence, and commit ancestry.
- Dispatch `release.yml` once with `operation=recover-existing` and the complete exact evidence tuple.
- Use the returned run ID, execute one blocking watch, then one final run view.
- On success, record exact run/job IDs, release URL/body, asset names/digests/hashes, attestation verification, and three-platform smoke evidence.
- Commit successful TASK-0253 evidence separately without pushing until TASK-0254 is complete.

## Out of scope

- NuGet publication or mutation, `publish`, second dispatch, rerun, retry, workflow correction after a remote failure, tag mutation, manual release/asset/attestation creation, settings changes, force push, history rewrite, or GA claims.

## Affected files

- Authorized remote `.github/workflows/release.yml` run and its immutable outputs
- This task plus hosted/release/supply-chain/V100/queue/handoff evidence documents

## Data/database impact

None.

## Admin impact

No product-admin or repository-settings impact. The workflow may create only the authorized prerelease, exact two assets, and exact two attestations.

## Security impact

Critical supply-chain mutation. The immutable preflight and workflow gates must prevent wrong-commit, wrong-artifact, partial-state, republish, and tag-mutation paths.

## Permission/auth impact

Use only existing workflow permissions. No new PAT, secret, GitHub App, NuGet credential, environment, collaborator, ruleset, or branch-protection change.

## SEO/i18n impact

Creates the public English GitHub prerelease from the prepared RC1 body. README English/Turkish status synchronization remains success-only TASK-0254 work.

## UX impact

Users gain a verifiable RC1 prerelease with exact package/symbol assets and installation proof on all three supported operating systems.

## Logging/audit impact

Record dispatch count, run/job IDs, exact inputs, immutable checks, release URL/body, asset identities/digests, attestation verification, and all matrix results without logging credentials.

## Implementation plan

1. Verify the exact TASK-0252 automation HEAD, green CI, clean/synchronized repository, immutable NuGet/source evidence, exact tag, absence state, and ancestry once.
2. Dispatch `recover-existing` exactly once with the full authorized tuple and capture the returned run ID.
3. Watch that run exactly once and wait for completion; run one final structured view.
4. On complete success, perform one read-only evidence verification and record it.
5. On any remote failure, execute the failure boundary exactly and stop without TASK-0254.

## Acceptance criteria

- Recovery dispatch count is exactly one; NuGet publish count is zero.
- Exact source artifact, candidate hashes, repository signature/content/commit, existing tag, release body, assets, and asset digests all verify.
- Separate nupkg and snupkg attestations exist and verify.
- Windows, Ubuntu, and macOS recovery installed-tool smoke jobs pass.
- No tag create/push/move/delete, manual upload, retry, rerun, settings mutation, or prohibited publication occurs.

## Validation commands

Use the exact immutable preflight and dispatch inputs from the controlling request, one `gh run watch <RECOVERY_RUN_ID> --exit-status --interval 30`, one final structured `gh run view`, and one post-success read-only evidence audit.

## Failure boundary

If the single recovery run fails: do not rerun, redispatch, fix and retry, manually create the release, manually upload assets, or manually attest. Read the failed job log once, inspect remote release state once, record the immutable result, push only factual failure-state documentation after standard CI, and stop.

## Risks

- Artifact expiry, service outage, permission failure, release race, or attestation failure can leave a partial immutable remote state.
- Partial remote mutation cannot be safely rolled back automatically.

## Rollback or safe-stop procedure

There is no destructive rollback. Before dispatch, stop without mutation on any mismatch. After dispatch, preserve the exact remote result and obey the failure boundary.

## Completion evidence requirements

Record the automation and release commits, recovery run/job IDs and URL, source artifact identity/digest, candidate and release asset hashes/digests, NuGet signature/commit, tag target, release body, two attestation verifications, three-platform results, dispatch count one, and NuGet publish count zero.

## Completion notes

Status: `STOPPED / DISPATCH CONSUMED / RELEASE CREATE 403 / REMOTE STATE UNCHANGED`.

Immutable preflight:

- Automation HEAD/origin: `5f6c4ce2d0ab9745207196e6b01371653adfe009`, clean and synchronized; release commit `258918b33c3d1359aac967604ee524e8b66ddf02` is an ancestor.
- TASK-0252 standard runs `29344903472`, `29344903420`, and `29344903850` passed.
- Source run `29131335084`, artifact `8242162439`, artifact digest `sha256:cd5550b2172aa0e4ff9bf700f6eefb04dfd8dbd88c8d7fee22914c1769533b3f`, candidate nupkg SHA-256 `86c2338e5766c3ebe18f234df85b976be449feaf2890a1cec05b561f97c1db4d`, and candidate snupkg SHA-256 `f1570e7cfbad411199140cc68fd58c898639060ceaa3b6575adcaf15e2d93b3d` matched.
- NuGet nupkg SHA-256 `346570f28a738c0f08d0eaa2a3ddb3f4dbcd4121d801530173bb2c40c03d23d5`, NuGet.org repository signature, archive content equivalence, and repository commit `258918b33c3d1359aac967604ee524e8b66ddf02` verified.
- Exact tag `v1.0.0-rc.1` targeted the release commit; GitHub prerelease/assets and both candidate-digest attestations were absent.

Single dispatch result:

- Exactly one `recover-existing` dispatch produced run `29345313517`; recovery job `87127346868` failed.
- Safety gates, exact artifact/package validation, and the exact remote-state recheck passed.
- Step `Create GitHub prerelease from verified exact existing tag` failed at `gh release create` with `HTTP 403: Resource not accessible by integration (https://api.github.com/repos/Cynrath/agent-context-kit/releases)`.
- Release verification, nupkg attestation, snupkg attestation, completed-recovery verification, and recovery matrix were skipped. The matrix placeholder job is `87127568071`.
- The failed log was read exactly once and the final structured run view was taken exactly once.

One post-failure immutable audit confirmed the source artifact and NuGet evidence unchanged, the exact owner-created tag unchanged at the release commit, GitHub prerelease/assets absent, both attestations absent, and the recovery matrix skipped. Dispatch count is one; NuGet publish count is zero.

The failure boundary is active. No rerun, second dispatch, fix-and-retry, manual release/asset/attestation action, settings or permission change, tag mutation, force push, or history rewrite occurred. TASK-0254 was not executed.
