# TASK-0256: V100 RC1 attestation-only workflow and three-platform release verification

## Purpose

Add and execute a repository-conventional attestation-only release verification operation that accepts the exact existing RC1 tag/prerelease/assets, creates or reuses both exact GitHub artifact attestations, verifies complete release alignment, and proves installed NuGet global-tool smoke on Windows, Ubuntu, and macOS without publishing NuGet, mutating the tag, or recreating the release.

## Current verified state

- Entry repository state is the clean synchronized TASK-0255 planning baseline at `177810dc2e7dc14304541430cb074c13efc19612`; TASK-0255 must supply the exact existing prerelease and two verified assets before hosted execution.
- `release.yml` currently combines release creation and attestation in `recover-existing`; TASK-0253 proved its GitHub Actions integration cannot create the release, while attestation permissions were not reached.
- Existing static and network-free tests protect NuGet and tag immutability but do not yet define a dedicated exact-existing-release attestation operation.
- Version, release commit, source artifact identity/digest, candidate hashes, and NuGet hash/signature/commit are frozen by the controlling authorization.

## Dependencies

- TASK-0255 complete success with exact prerelease/body/assets and recorded hashes/API digests.
- Current official `actions/attest`, GitHub CLI attestation verification, and workflow permission semantics.
- Exact automation HEAD pushed to `origin/master` with green standard CI before dispatch.

## Scope

- Add a manual attestation-only operation to `.github/workflows/release.yml` or an equivalent repository-conventional workflow.
- Use job permissions `contents: read`, `id-token: write`, and `attestations: write`, adding no broader permission unless validated as necessary.
- Verify automation/release ancestry, exact existing tag target, exact prerelease identity/target/title/body, exact two asset names/sizes/API digests/downloaded hashes, and NuGet package identity before attestation.
- Create missing nupkg/snupkg attestations with `actions/attest@v4`; safely accept exact existing attestations; require `gh attestation verify` for both subjects.
- Run dependent Windows/Ubuntu/macOS jobs that install `AgentContextKit 1.0.0-rc.1` from NuGet and execute the established global-tool smoke.
- Extend static/fixture tests and three-platform source-smoke coverage for the new operation.
- Complete focused/full local validation, logical commit/push, exact-HEAD standard CI, hosted dispatch, and evidence capture.

## Out of scope

- NuGet publish/login/push, package replacement/rebuild, tag mutation, GitHub Release creation/edit/upload/delete, PAT/secret/settings changes, smoke-pin/public README/V100 closure, force push, history rewrite, or GA claims.

## Affected files

- `.github/workflows/release.yml`
- `.github/workflows/cross-platform-source-smoke.yml` if coverage registration changes
- `scripts/check-release-workflow.ps1`
- `scripts/test-supply-chain-workflow.ps1`
- `scripts/github-release-state.ps1` and focused fixtures if reusable exact-release/attestation state helpers are added
- Existing release verification scripts and task/release/queue/handoff documentation

## Data/database impact

None. No database, migrations, auth store, or application data exists.

## Admin impact

No product-admin or repository-settings change.

## Security impact

Critical provenance operation. All immutable release verification must complete before attestation. Wrong tag, body, asset set, size, API digest, downloaded hash, signer workflow, or subject must fail closed.

## Release impact

Adds the missing hosted provenance and supported-platform installation evidence for the exact existing RC1 release without changing its tag, release body, assets, or NuGet package.

## Permission/auth impact

Use only standard GitHub Actions OIDC/attestation identity with minimal job permissions. No PAT, repository secret, environment secret, collaborator, or settings mutation.

## SEO/i18n impact

No runtime localization or SEO change. Technical workflow/test/docs remain English; public English/Turkish synchronization and user-facing release status are deferred to TASK-0257.

## UX impact

Provides auditable provenance for both release assets and installation proof across all supported platforms.

## Logging/audit impact

Record automation/release commits, workflow/run/job IDs, exact inputs, release/asset verification, attestation IDs/verification, signer workflow, platform jobs, dispatch count, and prohibited-action confirmations without credentials.

## Implementation plan

1. Confirm current official attestation/action/CLI permission and idempotency behavior.
2. Design the minimal manual exact-existing-release attestation operation and three-platform dependent matrix.
3. Add fail-closed static and network-free regression coverage for required/forbidden behavior.
4. Run focused tests, full .NET/ACKit/release gates, Unicode guard, diff, Markdown completeness, and `.ackit` guard.
5. Commit/push and wait for exact-HEAD standard CI.
6. Dispatch the operation, inspect any actual failure, fix the root cause when safe, and retry only after a validated change.
7. Verify both attestations and all three platform jobs, then record evidence.

## Acceptance criteria

- Operation contains no NuGet publication path, tag mutation, release creation/edit/upload/delete, or secret/PAT dependency.
- Exact existing tag, release/body, two assets, API digests, sizes, and hashes are mandatory before attestation.
- Missing exact attestations can be created; exact existing attestations can be reused safely; both are verified against the repository and signer workflow.
- Wrong tag target, wrong body/hash/API digest, missing/extra asset, or unverified attestation fails closed.
- Windows, Ubuntu, and macOS installed-package smoke jobs are required and pass for `1.0.0-rc.1`.
- Focused tests, 431/431-or-later full tests, ACKit, release/V100/supply-chain/Markdown/Unicode gates, standard CI, and hosted verification pass.

## Test steps

- Commands and gates listed in the controlling Phase 5 and final validation sections.
- Positive and negative workflow fixtures for every mandatory and forbidden marker.
- One exact-HEAD standard CI discovery/watch/view sequence per pushed implementation HEAD.
- Manual workflow dispatch followed by structured run/job/log and attestation verification evidence.

## Failure handling

Inspect the actual failing step/log, fix only the root cause, validate locally, commit/push normally, and retry. Do not repeat identical failed operations, weaken verification, or mutate NuGet/tag/release assets to make a test pass.

## Risks

- Attestation API propagation or existing-attestation semantics may differ from release API behavior.
- Incomplete idempotency can duplicate attestations or incorrectly skip verification.
- Cross-platform runner differences can expose PowerShell/path/install issues.

## Rollback plan

Workflow/script changes roll back through normal successor commits only. Attestations are additive immutable evidence and are not deleted. NuGet, tag, release, and assets remain unchanged.

## Completion evidence

Record implementation commit, local validation, standard CI runs/jobs, attestation workflow run/jobs, exact release verification, both attestation verifications, three-platform install/smoke results, dispatch count, and immutable/prohibited-action confirmations.

## Completion notes

Status: `COMPLETED / BOTH ATTESTATIONS VERIFIED / THREE-PLATFORM INSTALLED SMOKE PASS`.

- Added `attest-existing` to `.github/workflows/release.yml` with only `contents: read`, `id-token: write`, and `attestations: write`. It cannot publish NuGet, create/edit/upload/delete a release, or mutate/push a tag.
- Before attestation it verifies current automation HEAD/origin, release ancestry, exact remote tag target, prepared body, non-draft prerelease identity/title, exact two asset names/sizes/API digests/downloaded hashes, NuGet repository signature/content equivalence, and repository commit.
- Missing exact attestations use two conditional `actions/attest@v4` steps; existing attestations may be reused, but both subjects must pass `gh attestation verify` against `Cynrath/agent-context-kit/.github/workflows/release.yml`. The exact tag/release/body/assets are reverified afterward.
- A dependent `verify-attested-package` matrix requires `windows-2025`, `ubuntu-latest`, and `macos-latest` installed-package smoke through `scripts/verify-published-package.ps1`.
- Added `scripts/verify-existing-release-assets.ps1` and network-free fixtures for wrong tag/target/title/body/draft state, missing/extra asset, size, API digest, and downloaded hash. Static negative fixtures reject NuGet publication, tag mutation, release creation, missing attestation verification, and missing macOS coverage.
- Live read-only validation against release `353913024` exposed and corrected current `gh release view --json` title field usage from obsolete `title` to `name`; the exact live body/asset verification then passed.
- Local validation passed: ACKit doctor 13/13; scan exit 0; restore; Release build 0 warnings/0 errors; 431/431 tests; focused exact-release/recovery/supply-chain fixtures; release/V100/security/supply-chain/Markdown gates; YAML parse; Unicode guard 0 before/0 after; tracked `.ackit` count 0; `git diff --check` clean.
- Initial local implementation validation was complete before the first implementation push.
- Implementation commit `0a9abd04cc515c049d60a7cbbcc2d446a355fb15` passed exact-HEAD standard runs: `ci` `29349381415`, `cross-platform-smoke` `29349381490`, and `cross-platform-source-smoke` `29349381465`.
- First `attest-existing` dispatch run `29349599514`, job `87142124518`, passed safety and exact release/package verification, then stopped in `Query exact attestation state`. Both attestation actions, both CLI verifications, final recheck, and matrix job `87142353303` were skipped.
- Root cause: the expected attestation HTTP 404 was correctly classified as absent, but its native `$LASTEXITCODE=1` remained at script end and made the step fail without throwing. One post-failure audit confirmed both attestations absent and tag `v1.0.0-rc.1` unchanged at the release commit.
- Correction explicitly sets `$global:LASTEXITCODE = 0` only on the verified 404 path. Static regression coverage now fails if this accepted-404 exit-state reset is removed. No NuGet, tag, release, asset, or attestation mutation occurred in the failed run.
- Correction commit `83ab0a5c125fe25ec61dbd09026825e3cba18738` passed exact-HEAD standard runs: `ci` `29349905919`, `cross-platform-smoke` `29349906036`, and `cross-platform-source-smoke` `29349905891`.
- Corrected run `29350091782` completed successfully. Attestation job `87143810767` passed safety, exact release/package verification, two `actions/attest@v4` steps, both signer-workflow CLI verifications, and final immutable tag/release/body/asset revalidation.
- nupkg attestation `35295200` verifies digest `86c2338e5766c3ebe18f234df85b976be449feaf2890a1cec05b561f97c1db4d`; snupkg attestation `35295205` verifies digest `f1570e7cfbad411199140cc68fd58c898639060ceaa3b6575adcaf15e2d93b3d`. Each digest has exactly one repository attestation.
- Installed-package smoke passed on Ubuntu job `87144074850`, Windows job `87144074884`, and macOS job `87144074933`, all within run `29350091782`.
- Workflow dispatch count for TASK-0256: two. The first failed pre-attestation; the second followed a validated root-cause correction. NuGet publish count: zero. Tag mutation count: zero. Release/body/asset mutation count: zero. TASK-0257 is unblocked.
