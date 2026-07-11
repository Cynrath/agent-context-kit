# TASK-0242: V100 1.0.0-rc.1 OIDC publication and post-publish verification

## Status

Stopped after partial immutable publication. The single authorized dispatch was consumed; recovery and a second dispatch are prohibited.

## Purpose

Publish the accepted AgentContextKit `1.0.0-rc.1` candidate exactly once through the existing OIDC `release.yml` workflow, create the immutable tag and GitHub prerelease with the prepared release body, create and verify exact package provenance, then synchronize and validate post-publish public state.

## Verified starting state

- User authorization was received on 2026-07-11 for one `release.yml` publish dispatch covering NuGet, tag, GitHub prerelease, release body, provenance/attestation, global install, post-publish smoke, and documentation follow-through.
- Clean `master` equals `origin/master` at TASK-0241 commit `b1fae4d18ce738be6a8679abd7333f95e044e3a6`.
- Exact source/workflow/test/package-metadata candidate is TASK-0239 commit `548b6affd0da25cb379ec1b153b1064fd5ff6f0b`.
- TASK-0240 hosted RC run `29118452246` passed on Windows, Ubuntu, and macOS for candidate `1.0.0-rc.1` and predecessor `0.2.0-alpha.4`.
- TASK-0241 records final-candidate acceptance, zero open P0 gaps, and conditional GO for a separately authorized publish task; V100-09 remains open only for publish-path provenance.
- Read-only checks found no NuGet `1.0.0-rc.1`, no remote `v1.0.0-rc.1` tag, and no matching GitHub Release before dispatch.
- Installed ACKit is published predecessor `0.2.0-alpha.4`; doctor 13/13 passes and scan exits 0.

## Scope

- Finalize this task record and the prepared RC1 release body without changing candidate behavior, package metadata, version, source, tests, scripts, schemas, or release workflow.
- Run exact pre-dispatch local release gates, package inspection/install smoke, dependency review, Unicode temp guard, and absence/immutability checks.
- Commit and push the docs-only publication plan/body bridge; wait for its standard push-triggered CI before publication.
- Dispatch `.github/workflows/release.yml` exactly once with `operation=publish`, `version=1.0.0-rc.1`, identical exact automation/release SHA, and `prerelease=true`.
- Watch that single run to completion without polling loops, manual rerun, recovery dispatch, or second dispatch.
- On success, verify NuGet package existence and repository signature, exact tag target, GitHub prerelease body/assets/digests, exact package attestation/provenance, and installed global tool behavior.
- Update the published-package smoke pin and current public/release/readiness/security/supply-chain/handoff docs to `1.0.0-rc.1` while retaining alpha4 as immutable predecessor evidence.
- Commit and push the post-publish synchronization once, then wait once for final `ci`, `cross-platform-smoke`, and `cross-platform-source-smoke`; use those results as three-platform post-publish package/source smoke evidence.

## Out of scope

- Publishing `1.0.0-rc.1` more than once, moving/replacing its tag, replacing its package, manually uploading a package, force-pushing, rewriting history, or editing immutable release assets after success.
- A second `release.yml` dispatch, `verify-existing` dispatch, automatic recovery, or workflow rerun after any failure.
- NuGet deprecation/unlisting, destructive recovery, ownership/settings/secrets/environment changes, security advisories, or GA `1.0.0` claims.
- Source/behavior/schema/package-version changes after exact hosted candidate acceptance.

## Affected files

Pre-publish:

- this task file
- `docs/RELEASE_BODY_V100_RC1.md`
- planning/handoff status documents if required for the exact publication SHA

Post-publish, only after verified workflow success:

- `.github/workflows/cross-platform-smoke.yml`
- `README.md`
- `README.tr.md`
- `README.nuget.md`
- `CHANGELOG.md`
- `AGENTS.md` and generated agent instruction mirrors when current release status is embedded
- release/readiness/supply-chain/V100/roadmap/queue/index/handoff documents that currently say RC1 is unpublished
- this task file with exact run, package, tag, release, digest, attestation, install, smoke, commit, and CI evidence

## Data/database impact

None.

## Security impact

The existing OIDC trusted-publishing path receives short-lived credentials only inside the protected `nuget-release` environment. The workflow creates a GitHub artifact attestation for the exact release nupkg and verifies it against `.github/workflows/release.yml`. No token, certificate, recovery data, package content, or private report is stored in the repository.

## Permission/auth impact

Explicit authorization covers one publish dispatch and the workflow's existing `contents: write`, `id-token: write`, and `attestations: write` permissions. It does not authorize collaborator, owner, secret, variable, environment, branch-protection, ruleset, or security-setting mutation.

## Localization impact

No CLI localization behavior changes. English/Turkish public version guidance must remain aligned after publication; technical tokens and machine-readable contracts remain unchanged.

## UX impact

Users may install the RC globally from NuGet after successful publication. Public docs must clearly label it as a release candidate, not GA, and retain rollback guidance to `0.2.0-alpha.4` or a later successor.

## Logging/audit impact

Record only public run/job IDs, exact SHAs, package/release asset names, public digests, NuGet repository-signature state, and attestation verification. Never record credentials or private environment details.

## Acceptance criteria

1. Pre-dispatch source is clean, synchronized, exact, and all release/package/V100/security/hygiene gates pass.
2. NuGet `1.0.0-rc.1`, tag `v1.0.0-rc.1`, and GitHub Release are absent immediately before dispatch.
3. `release.yml` is dispatched exactly once with `operation=publish`, version `1.0.0-rc.1`, identical automation/release SHA, and prerelease true.
4. The single run succeeds through validate, OIDC publish, installed-package verification, exact tag, GitHub prerelease/body/assets, digest, attestation creation, and attestation verification.
5. NuGet package, tag, release, nupkg/snupkg assets, repository signature, SHA-256 digests, and provenance all match the exact authorized release SHA/version.
6. Global install reports `AgentContextKit 1.0.0-rc.1` and required command smoke succeeds.
7. Post-publish public docs and published-package smoke pin are synchronized without changing the immutable package/tag/release.
8. Final push-triggered `ci`, `cross-platform-smoke`, and `cross-platform-source-smoke` all succeed for the post-publish documentation/pin HEAD; local/origin are equal and clean.
9. V100-09 closes only after exact attestation evidence. V100-11 remains deferred, V100-12 retains its current deferred hosted-doc state, and no GA claim is made.
10. If the single workflow fails at any point, no second dispatch, rerun, recovery, or manual upload occurs. If the package exists, immutable package/tag/release/provenance state is inspected once, recorded, and work stops safely.

## Test steps

1. Validate exact task/candidate bridge, version, clean tree, origin alignment, tag/release/package absence, release body mapping, and workflow safety markers.
2. Run `ackit --version`, doctor, scan, restore, Release build/test, dependency vulnerable/deprecated review, Unicode guard, release/package/V100/CLI/config/JSON/localization/security/supply-chain/readiness gates, package inspection/install smoke, Markdown completeness/links, diff, and `.ackit` tracking checks.
3. Push the pre-publish docs-only bridge and wait once for standard CI.
4. Dispatch the existing release workflow once and use one blocking watch for its run.
5. Perform read-only immutable NuGet/tag/release/asset/digest/attestation/global-install verification.
6. Push the post-publish sync and use one blocking final-CI sequence for all three push-triggered workflows.

## Risks

- NuGet publication is immutable and cannot be overwritten. Mitigation: exact absence checks, exact-SHA preparation, package inspection, OIDC only, and no second publish attempt.
- The workflow can publish NuGet and then fail during tag/release/provenance. Mitigation: the user's hard stop forbids automatic recovery or a second dispatch; inspect once and report the partial immutable state.
- A docs-only pre-publish bridge changes the release SHA from the hosted source candidate. Mitigation: reject any bridge path outside docs/task/handoff/governance, use identical automation/release SHA, and retain TASK-0239 source identity in evidence.
- Post-publish smoke pin changes can fail on one platform. Mitigation: no release mutation; use a normal corrective source commit only if necessary and rerun only push-triggered CI, never `release.yml`.

## Rollback plan

Before publication, correct with a normal successor commit and do not dispatch until evidence is green. After NuGet publication, never reuse or replace `1.0.0-rc.1`; if unhealthy, stop, document, and require separate maintainer authorization for deprecation/unlisting and a fixed successor version. Never move `v1.0.0-rc.1`, mutate its successful release assets, force-push, or rewrite history.

## Completion notes

Stopped safely on 2026-07-11 after the single authorized release dispatch.

### Pre-dispatch evidence

- Docs-only publication bridge commit: `258918b33c3d1359aac967604ee524e8b66ddf02`.
- Candidate bridge from `548b6affd0da25cb379ec1b153b1064fd5ff6f0b` contained only docs/evidence/governance paths.
- Pre-publish standard runs passed: `ci` `29131066882`, `cross-platform-smoke` `29131066912`, and `cross-platform-source-smoke` `29131066885`.
- Full local preflight passed: no vulnerable/deprecated packages; build 0 warnings/0 errors; 431/431 tests; Unicode guard clean; exact release preparation, package metadata/install, V100/CLI/config/JSON/localization/security/supply-chain/public-release gates, Markdown, diff, and `.ackit` hygiene green.
- NuGet `1.0.0-rc.1`, remote `v1.0.0-rc.1`, and GitHub Release were absent immediately before dispatch.

### Single release run

- Exactly one `release.yml` publish dispatch was sent for version `1.0.0-rc.1`, automation/release SHA `258918b33c3d1359aac967604ee524e8b66ddf02`, and `prerelease=true`.
- Run [`29131335084`](https://github.com/Cynrath/agent-context-kit/actions/runs/29131335084): `failure`.
- `validate exact package` job `86487127197`: success.
- `publish and create release` job `86487525013`: OIDC login and NuGet publish succeeded; `Verify published package` failed after its bounded retry window because NuGet had not become available to that runner.
- Tag, GitHub prerelease, release verification, release-asset provenance inspection, `actions/attest@v4`, and attestation verification were skipped.
- No second dispatch, rerun, `verify-existing`, recovery, manual upload, tag/release mutation, or force push was performed.

### One-time immutable-state audit

| Field | Verified state |
| --- | --- |
| NuGet package | `AgentContextKit 1.0.0-rc.1` accessible |
| NuGet repository signature | Verified; NuGet.org Repository certificate |
| NuGet repository commit | `258918b33c3d1359aac967604ee524e8b66ddf02` |
| NuGet nupkg SHA-256 | `346570f28a738c0f08d0eaa2a3ddb3f4dbcd4121d801530173bb2c40c03d23d5` |
| Global tool install | PASS; `AgentContextKit 1.0.0-rc.1` |
| Validated workflow nupkg SHA-256 | `86c2338e5766c3ebe18f234df85b976be449feaf2890a1cec05b561f97c1db4d` |
| Validated workflow snupkg SHA-256 | `f1570e7cfbad411199140cc68fd58c898639060ceaa3b6575adcaf15e2d93b3d` |
| Remote tag | Absent |
| GitHub prerelease | Absent |
| Exact package attestation | Absent; attestation steps were skipped |
| Three-platform RC1 post-publish smoke | Not run; published-package pin remains on immutable alpha4 because hard-stop applies |

### Final disposition

Status: `PARTIAL_IMMUTABLE_PUBLICATION / NUGET_PUBLISHED / TAG_RELEASE_PROVENANCE_ABSENT / STOPPED_BY_AUTHORIZATION_BOUNDARY`.

TASK-0242 is not successfully complete. A future recovery decision requires new explicit authorization and must never republish or replace `1.0.0-rc.1`, move an existing tag, or fabricate provenance.
