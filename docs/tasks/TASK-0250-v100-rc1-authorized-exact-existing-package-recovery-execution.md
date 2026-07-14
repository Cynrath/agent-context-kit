# TASK-0250: V100 RC1 authorized exact-existing-package recovery execution

## Purpose

After TASK-0249 is pushed and all standard CI is green, perform exactly one authorized NuGet-publish-free `recover-existing` workflow dispatch to complete the immutable `AgentContextKit 1.0.0-rc.1` tag, GitHub prerelease, exact assets, attestations, and three-platform installed-tool verification.

## Verified starting state

- NuGet `AgentContextKit 1.0.0-rc.1` exists and is immutable at repository commit `258918b33c3d1359aac967604ee524e8b66ddf02`.
- Source run `29131335084`, artifact `8242162439`, prepared release body, and full source-artifact/package hashes are recorded by TASK-0242 through TASK-0247.
- TASK-0244 and TASK-0247 stopped before mutation; tag, GitHub prerelease/assets, and both attestations are absent at planning time.
- This task depends on the TASK-0249 correction and exact-HEAD three-workflow standard CI being fully green.

## Dependencies

- Completed/pushed TASK-0249 with green `ci`, `cross-platform-smoke`, and three-OS `cross-platform-source-smoke`.
- Clean synchronized `master`, valid unexpired source artifact, exact immutable evidence tuple, and exact release commit ancestry.
- Explicit authorization for exactly one new `recover-existing` dispatch; NuGet publication remains forbidden.

## Scope

- Perform one bounded immutable preflight covering repository state, NuGet package/signature/content/commit, source artifact identity/digest/hashes, tag/release/attestation absence, and commit ancestry.
- Dispatch `.github/workflows/release.yml` once with `operation=recover-existing`, version `1.0.0-rc.1`, exact automation HEAD, release commit `258918b33c3d1359aac967604ee524e8b66ddf02`, prerelease `true`, source run `29131335084`, and full recorded digests/hashes.
- Watch the returned run ID once and inspect the completed run once.
- On success, verify the exact tag, prerelease body/state/assets/API digests, both attestations, and Windows/Ubuntu/macOS installed-tool smoke jobs.
- On failure, read the failed log once, audit remote immutable state once, document facts, and stop.

## Out of scope

- Any NuGet login/push/change/unlist/delete/replace, normal `publish` operation, second recovery dispatch, rerun, retry, manual/local release asset upload, tag move/force, alternate release commit, settings change, force push, history rewrite, `.ackit/` commit, or GA claim.
- Success-only published-smoke and public-state updates before every recovery criterion passes.

## Affected files

- Remote `.github/workflows/release.yml` run and authorized immutable outputs
- This task and hosted/supply-chain/release/V100/queue/handoff evidence documents

## Data/database impact

None.

## Admin impact

No product admin impact. The authorized GitHub workflow may create only the exact tag/prerelease/assets/attestations in scope.

## Security impact

Critical supply-chain operation. All identity, digest, signature, content-equivalence, commit, absence, body, asset, and attestation gates are fail-closed. NuGet publication must remain impossible.

## Permission/auth impact

Uses only the existing recovery job's GitHub Actions permissions (`actions: read`, `contents: write`, `id-token: write`, `attestations: write`). It must not use `NuGet/login`, an API key, package-write permission, or the publish environment.

## SEO/i18n impact

The successful prerelease becomes public. Repository English/Turkish status synchronization is deferred to TASK-0251 after complete success.

## UX impact

Successful completion gives users one exact RC1 prerelease with trustworthy binary/symbol assets and three-platform installation proof.

## Logging/audit impact

Record the one dispatch/run ID, job IDs, exact inputs, artifact/digest/hashes, signature/commit/content equivalence, tag/release/assets, attestation verification, and three-platform results. Do not record credentials or overwrite older failures.

## Exact implementation steps

1. Verify TASK-0249 hosted CI and run one immutable preflight using the full repository-recorded values.
2. Dispatch `release.yml` once with `operation=recover-existing`; capture the returned run ID.
3. Execute one `gh run watch <RUN_ID> --exit-status --interval 30` and wait for completion.
4. Execute one final run view and branch on the immutable result.
5. On success, verify remote tag/release/body/assets/digests/attestations and matrix jobs once, then record evidence.
6. On failure, perform the mandated one log review and one remote audit, record the state, and stop without TASK-0251.

## Acceptance criteria

- Exactly one recovery dispatch and zero NuGet publishes occur in this session.
- The workflow uses the exact source run/artifact/digest, candidate hashes, automation HEAD, release commit, tag, and prepared body.
- NuGet signature/content/repository commit match the immutable package record.
- `v1.0.0-rc.1` targets only `258918b33c3d1359aac967604ee524e8b66ddf02`.
- The GitHub prerelease contains only the exact nupkg/snupkg assets with the recorded hashes/API digests and exact prepared body.
- Separate nupkg and snupkg attestations exist and verify.
- Windows, Ubuntu, and macOS install and smoke `AgentContextKit 1.0.0-rc.1` successfully.
- No prohibited publication, retry, manual mutation, tag move, settings change, or history rewrite occurs.

## Validation commands

Use the repository exact-package verifier and GitHub/NuGet read-only APIs during the single preflight, then:

```powershell
gh run watch <RECOVERY_RUN_ID> --repo Cynrath/agent-context-kit --exit-status --interval 30
gh run view <RECOVERY_RUN_ID> --repo Cynrath/agent-context-kit --json databaseId,status,conclusion,headSha,event,jobs,url
```

## Risks

- Artifact expiry, service outage, race, or attestation failure may leave a new partial immutable state.
- A partial mutation cannot be automatically rolled back safely; retries and manual completion are forbidden.
- Tag/release creation alone is not completion without exact assets, both verified attestations, and all three smoke jobs.

## Rollback/safe-stop behavior

There is no destructive rollback. If preflight fails, do not dispatch. If the one run fails or partially mutates remote state, do not fix/retry/rerun/redispatch/upload; read the failed log once, inspect remote state once, record the exact immutable state, and stop.

## Completion evidence

Status: `STOPPED / SINGLE DISPATCH CONSUMED / TAG PUSH REJECTED / REMOTE STATE UNCHANGED`.

TASK-0249 implementation commit `ca4b46967d18c03c8f39a5bf8e2dacb5745d249e` passed standard runs `29340782994`, `29340783184`, and `29340782999`. The source-smoke run passed the expected-404 regression on Windows, Ubuntu, and macOS.

The single immutable preflight passed with a clean synchronized repository and this exact tuple:

| Evidence | Exact value |
| --- | --- |
| Automation commit | `ca4b46967d18c03c8f39a5bf8e2dacb5745d249e` |
| Release commit | `258918b33c3d1359aac967604ee524e8b66ddf02` |
| Source run / artifact | `29131335084` / `8242162439` |
| Artifact digest | `sha256:cd5550b2172aa0e4ff9bf700f6eefb04dfd8dbd88c8d7fee22914c1769533b3f` |
| Candidate nupkg SHA-256 | `86c2338e5766c3ebe18f234df85b976be449feaf2890a1cec05b561f97c1db4d` |
| Candidate snupkg SHA-256 | `f1570e7cfbad411199140cc68fd58c898639060ceaa3b6575adcaf15e2d93b3d` |
| NuGet-served nupkg SHA-256 | `346570f28a738c0f08d0eaa2a3ddb3f4dbcd4121d801530173bb2c40c03d23d5` |
| NuGet signature/content/commit | PASS / equivalent excluding `.signature.p7s` / `258918b33c3d1359aac967604ee524e8b66ddf02` |
| Tag/release/two attestations | Absent before dispatch |

Exactly one `recover-existing` dispatch was accepted. The dispatch response directly returned run [`29341087462`](https://github.com/Cynrath/agent-context-kit/actions/runs/29341087462); no discovery query was needed. One `gh run watch --exit-status --interval 30` observed the failure in job `87112724358`.

The run passed:

- `Run exact recovery safety gates`;
- `Validate exact source artifact and existing NuGet package`;
- `Recheck exact remote recovery state`.

It then failed in `Create exact immutable tag and GitHub prerelease`. The failed log was read exactly once. `git push origin refs/tags/v1.0.0-rc.1` was rejected by GitHub:

```text
refusing to allow a GitHub App to create or update workflow
.github/workflows/cross-platform-source-smoke.yml without `workflows` permission
```

The rejection occurred before `gh release create`; release verification, both attestations, completed-recovery verification, and the Windows/Ubuntu/macOS recovery matrix were skipped.

One post-failure immutable-state audit then proved:

- source artifact valid and unchanged at the recorded digest;
- NuGet package present and unchanged at SHA-256 `346570f28a738c0f08d0eaa2a3ddb3f4dbcd4121d801530173bb2c40c03d23d5`;
- NuGet repository signature valid and repository commit still `258918b33c3d1359aac967604ee524e8b66ddf02`;
- remote `v1.0.0-rc.1` tag absent;
- GitHub prerelease and assets absent;
- nupkg attestation absent;
- snupkg attestation absent.

No NuGet login/push/change/unlist/replace/delete, normal publish operation, rerun, second dispatch, manual upload, tag movement, settings change, force push, or history rewrite occurred. The TASK-0250 dispatch budget is consumed. TASK-0251 success-only work is prohibited.
