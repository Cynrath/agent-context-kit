# TASK-0255: V100 RC1 authenticated GitHub prerelease and exact asset completion

## Purpose

Complete the immutable `AgentContextKit 1.0.0-rc.1` GitHub prerelease through the authenticated local GitHub CLI session after diagnosing the TASK-0253 GitHub Actions integration HTTP 403, using only the retained exact TASK-0242 nupkg and snupkg.

## Current verified state

- Entry `master`, local HEAD, and `origin/master` are clean and synchronized at `177810dc2e7dc14304541430cb074c13efc19612`.
- Installed ACKit is `1.0.0-rc.1`; doctor is 13/13 PASS and `scan --ci` exits 0 without Critical/High blockers.
- NuGet `AgentContextKit 1.0.0-rc.1` is immutable at release commit `258918b33c3d1359aac967604ee524e8b66ddf02`; republishing is prohibited.
- Owner-created exact tag `v1.0.0-rc.1` is required to remain at the release commit.
- TASK-0253 run `29345313517` passed its immutable gates and received `HTTP 403: Resource not accessible by integration` from `gh release create`; its historical boundary remains preserved.
- Source run `29131335084`, artifact `8242162439`, artifact digest, candidate hashes, NuGet hash, and signature/commit evidence must be reverified read-only before release creation.

## Dependencies

- Exact TASK-0242 source artifact remains available and unexpired.
- Authenticated local `gh` identity has repository write access.
- Current GitHub Release/assets/attestations state has no mismatched or conflicting component.
- Prepared body `docs/RELEASE_BODY_V100_RC1.md` remains the authoritative release text.

## Scope

- Diagnose the TASK-0253 token/permission boundary from the failed log, workflow permissions, read-only Actions settings, local `gh auth status`, and current official GitHub CLI/API documentation.
- Securely download source artifact `8242162439` to a temporary directory and verify its exact two-file set, artifact digest, candidate hashes, NuGet repository signature/content equivalence/repository commit, and exact tag.
- Inspect current release/assets/attestations and fail closed on any identity, target, body, asset, size, digest, or hash mismatch.
- Create the exact prerelease with the authenticated local `gh` session, existing exact tag, prepared body, exact title, prerelease flag, and only the validated nupkg/snupkg.
- Verify release URL, tag/target/title/body/prerelease state, exact asset set, sizes, GitHub API digests, and downloaded hashes.
- Record factual completion evidence without rewriting historical recovery failures.

## Out of scope

- NuGet login/push/republication/unlist/deprecation/replacement, normal `publish`, package rebuilding, tag creation/move/delete/recreate/force-update, PAT or secret creation, mismatched asset overwrite, attestation creation, smoke-pin change, V100-09 closure, force push, history rewrite, or `1.0.0` GA claims.

## Affected files

- `docs/tasks/TASK-0255-v100-rc1-authenticated-github-prerelease-and-exact-asset-complet.md`
- Release, hosted-validation, supply-chain, decision, queue, roadmap, and handoff documentation required to record the exact result
- Authenticated remote GitHub prerelease `v1.0.0-rc.1` and its exact two release assets

## Data/database impact

None. The project contains no application database or migration surface.

## Admin impact

No product-admin surface. Repository settings are inspected read-only; no settings mutation is planned.

## Security impact

Critical supply-chain operation. Every package, tag, release, body, asset, digest, and identity condition must be verified before or immediately after the single exact release mutation. Credentials and temporary artifact paths must not be logged or committed.

## Release impact

Completes the missing public GitHub prerelease/body/two-asset surface for the already-published immutable RC1. It does not publish or change NuGet and does not by itself close provenance or V100-09.

## Permission/auth impact

Use the existing authenticated local `gh` session only after confirming its account and repository write access. Do not create a PAT, secret, collaborator, environment, ruleset, or permission change. The GitHub Actions integration failure is diagnostic evidence, not a reason to weaken repository security.

## SEO/i18n impact

No CLI localization or SEO metadata change. Technical artifacts remain English; public English/Turkish README parity and release discoverability wording are owned by TASK-0257.

## UX impact

Creates the missing discoverable GitHub prerelease with the prepared release notes and exact installable/symbol packages.

## Logging/audit impact

Record the authenticated account without tokens, exact source artifact identity/digest, hashes, signature/commit, tag target, release URL/body, asset IDs/names/sizes/digests/hashes, mutation count, and prohibited-action confirmations.

## Implementation plan

1. Complete read-only current-state and official-documentation diagnosis.
2. Download and verify the exact retained source artifact in a secure temporary directory.
3. Recheck exact tag, absent/non-conflicting release state, and authenticated write capability.
4. Create or safely complete only the exact prerelease and exact two assets.
5. Download and verify release identity, body, asset metadata, API digests, and hashes.
6. Record evidence and preserve the temporary artifact only for the minimum required operation lifetime.

## Acceptance criteria

- Local authenticated identity and repository write capability are verified without exposing credentials.
- Exact tag remains at `258918b33c3d1359aac967604ee524e8b66ddf02`.
- Source artifact contains only `AgentContextKit.1.0.0-rc.1.nupkg` and `.snupkg`; all recorded digests/hashes/signature/content/commit checks pass.
- GitHub prerelease exists at the exact tag with title `AgentContextKit 1.0.0-rc.1`, exact prepared body, prerelease state, and exactly the validated two assets.
- Release asset sizes, API digests, and downloaded SHA-256 values verify.
- NuGet publish count and tag mutation count remain zero.

## Test steps

- Phase 1 ACKit/Git preflight.
- `gh auth status`, harmless authenticated reads, workflow-log/permission/settings inspection, and official GitHub CLI/API documentation lookup.
- Exact artifact/NuGet verification through existing recovery scripts and explicit hash checks.
- Structured `gh release view` plus exact asset download/hash/body/target verification.
- `git status`, `git diff --check`, and tracked `.ackit/` guard before commit.

## Failure handling

Do not repeat an identical failed mutation. Diagnose and correct the actual local/workflow cause when safe. If a partial release appears, preserve correct exact components, add only missing exact components, and fail closed on mismatches. Never delete or overwrite a release asset to hide a mismatch.

## Risks

- Source artifact expiry can remove the only authorized unsigned candidate files.
- A pre-existing partial release or asset race can create ambiguous remote state.
- Authenticated identity may have broader access than the Actions integration; commands must remain tightly scoped to the exact tag/release/assets.

## Rollback plan

GitHub Release content is not rolled back destructively. On a mismatch, stop and preserve evidence. Repository documentation corrections use normal successor commits. NuGet and the exact tag remain immutable.

## Completion evidence

Record release URL/ID, exact tag target, title/body/prerelease verification, asset IDs/names/sizes/API digests/downloaded hashes, source/NuGet evidence tuple, authenticated identity boundary, remote mutation count, and clean Git state.

## Completion notes

Status: `PLANNED / WAITING FOR TASK-FIRST PLAN COMMIT`.
