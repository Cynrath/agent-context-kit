# TASK-0243: V100 RC1 exact existing package recovery operation

## Purpose

Implement and locally validate a fail-closed `recover-existing` release operation for the partial immutable `AgentContextKit 1.0.0-rc.1` publication left by TASK-0242. The operation must reuse the exact validated package artifacts from release run `29131335084`, prove their relationship to the repository-signed NuGet package and release commit `258918b33c3d1359aac967604ee524e8b66ddf02`, and contain no NuGet login or push path.

## Verified starting state

- Clean synchronized `master` at `6362524a3ff1e0776ec1b07ae746fb33f0b88a55` before task creation.
- Installed ACKit upgraded from `0.2.0-alpha.4` to published `1.0.0-rc.1`; doctor 13/13 PASS and scan exit 0.
- TASK-0242 run `29131335084` and validate job `86487127197` produced unexpired artifact `8242162439`; the publish job stopped after NuGet push/propagation verification.
- NuGet RC1 responds successfully; tag, GitHub Release, and candidate asset attestations are absent.

## Dependencies

- TASK-0242 immutable failure/audit evidence.
- Prepared `docs/RELEASE_BODY_V100_RC1.md`.
- Existing release scripts, static gates, and GitHub Actions release permissions.
- Current official GitHub artifact-attestation guidance reviewed through Context7.

## Scope

- Add a dedicated `recover-existing` choice to `.github/workflows/release.yml` without changing normal `publish` semantics.
- Add recovery-only inputs for source run ID and exact nupkg/snupkg SHA-256 values.
- Download artifact `AgentContextKit-1.0.0-rc.1` from run `29131335084` and require its run/head/artifact identity.
- Verify candidate package hashes, NuGet repository signature, package metadata, release commit, and unsigned/signed nupkg content equivalence excluding only the repository signature entry.
- Require the recovery precondition that NuGet exists while tag and GitHub Release do not exist.
- Create an immutable tag only at the exact release commit, create the prerelease from `docs/RELEASE_BODY_V100_RC1.md`, and attach only the verified nupkg/snupkg files.
- Generate and verify GitHub artifact attestations for both release assets.
- Add Windows, Ubuntu, and macOS global-install verification jobs after recovery.
- Add static, positive, and negative tests that prove the recovery path contains no NuGet publication and fails closed on mismatched evidence.
- Update release automation/recovery documentation and active planning/handoff records.

## Implementation steps

1. Add recovery-only workflow inputs/job conditions and keep publish/verify-existing behavior unchanged.
2. Implement the exact package verification helper and fixture tests.
3. Implement fail-closed remote preconditions, exact tag/release creation, asset verification, two attestations, and three-OS install jobs.
4. Extend static/supply-chain workflow guards so future drift cannot introduce NuGet publication into recovery.
5. Update automation/recovery/validation documentation and run focused/full local gates.

## Out of scope

- Dispatching any workflow.
- Publishing, replacing, unlisting, or deprecating any NuGet package.
- Running the normal `publish` operation.
- Creating or moving a tag or GitHub Release during local implementation.
- Uploading assets manually, changing repository settings/secrets/environments/owners, version bumps, history rewrites, or force pushes.
- Rewriting or deleting TASK-0242 failure history.

## Affected files

- `.github/workflows/release.yml`
- `scripts/verify-existing-package-recovery.ps1` (new)
- `scripts/test-existing-package-recovery.ps1` (new)
- `scripts/check-release-workflow.ps1`
- `scripts/test-supply-chain-workflow.ps1`
- `docs/RELEASE_AUTOMATION.md`
- `docs/PACKAGE_RECOVERY.md`
- `docs/RELEASE_VALIDATION.md`
- `docs/tasks/TASK-0243-v100-rc1-exact-existing-package-recovery-operation.md`
- Active roadmap, queue, and `.codex` handoff documents

## Data/database impact

None. The repository has no application database or migration involved in release recovery.

## Admin impact

None. There is no application admin area; repository release maintainers interact only with the explicit workflow dispatch inputs.

## Security impact

High release-integrity impact. The implementation must bind the prior validated artifact, repository-signed NuGet package, exact package metadata, exact release commit, tag, release assets, and attestations. Hash mismatch, unexpected remote state, wrong source run, wrong commit, wrong package metadata, or missing signature must stop before any mutation.

## Permission/auth impact

The recovery job requires only `contents: write`, `actions: read`, `id-token: write`, and `attestations: write`. It must not use the `nuget-release` environment, `NuGet/login`, an API key, package write permission, or any NuGet publication credential. Verification matrix jobs remain read-only.

## Localization impact

No CLI localization or machine-readable CLI contract change. Workflow step names and technical evidence remain English.

## SEO impact

None. No public page metadata or search-indexing behavior changes in TASK-0243.

## UX impact

Maintainers receive an explicit operation name and exact evidence inputs that distinguish recovery from normal publication. Ambiguous or incomplete recovery inputs fail with actionable errors.

## Logging/audit impact

The workflow records source run/artifact identity, expected and actual hashes, package repository commit, tag target, release asset digests, attestation verification, and per-platform install results without logging credentials or package-owner secrets.

## Acceptance criteria

- `recover-existing` is a distinct workflow operation and the existing `publish` operation is not invoked.
- Recovery contains no `NuGet/login`, `dotnet nuget push`, manual upload outside `gh release create`, or `--skip-duplicate` path.
- Source run must be `29131335084`, workflow `release`, event `workflow_dispatch`, head SHA `258918b33c3d1359aac967604ee524e8b66ddf02`, and artifact name `AgentContextKit-1.0.0-rc.1` when TASK-0244 dispatches it.
- Exact candidate hashes are required: nupkg `86c2338e5766c3ebe18f234df85b976be449feaf2890a1cec05b561f97c1db4d`; snupkg `f1570e7cfbad411199140cc68fd58c898639060ceaa3b6575adcaf15e2d93b3d`.
- The NuGet-served package must be repository-signed, identify version `1.0.0-rc.1`, and record repository commit `258918b33c3d1359aac967604ee524e8b66ddf02`.
- Candidate and NuGet nupkg archive content must match after excluding only `.signature.p7s`.
- Recovery fails before mutation unless NuGet exists and both tag and GitHub Release are absent.
- Tag creation is non-force and targets only the exact release commit.
- GitHub prerelease uses the prepared RC1 body and contains only the verified nupkg/snupkg assets.
- Both release assets receive verified GitHub attestations from `.github/workflows/release.yml`.
- Windows, Ubuntu, and macOS install and report `AgentContextKit 1.0.0-rc.1` in the same recovery run.
- Static/fixture tests, release gates, full .NET tests, ACKit checks, and hygiene checks pass locally.
- No workflow is dispatched in TASK-0243.

## Test steps

1. `ackit doctor`
2. `ackit scan --ci`
3. `powershell -ExecutionPolicy Bypass -File scripts/test-existing-package-recovery.ps1`
4. `powershell -ExecutionPolicy Bypass -File scripts/check-release-workflow.ps1 -FailOnIssues`
5. `powershell -ExecutionPolicy Bypass -File scripts/test-supply-chain-workflow.ps1`
6. `powershell -ExecutionPolicy Bypass -File scripts/test-release-recovery.ps1`
7. `dotnet build AgentContextKit.sln -c Release --no-restore`
8. `dotnet test AgentContextKit.sln -c Release --no-build`
9. Relevant V100, security/supply-chain, package metadata, Markdown, and hygiene gates.
10. `git diff --check`

## Risks

- A wrong artifact could create release assets unrelated to the published package; exact run, artifact, hash, metadata, and archive-content checks mitigate this.
- A race could create the tag/release between preflight and mutation; the workflow rechecks remote state immediately before mutation and never force-updates.
- An attestation for only one asset would leave incomplete provenance; both nupkg and snupkg require separate attest and verify steps.
- Artifact retention expires on 2026-07-24; TASK-0244 must use the verified hosted artifact while available and must not reconstruct or manually upload substitutes.

## Rollback plan

Before dispatch, revert the workflow/script/docs commit normally if validation fails. After any recovery dispatch, tag/release/assets/attestations are treated as immutable evidence: do not move, replace, or delete them automatically. If the single recovery run partially fails, perform one read-only remote audit, record the exact state, and stop for a new explicit decision.

## Completion notes

Status: `IN_PROGRESS / TASK_FIRST_RECORD_COMPLETE`. Starting state verified on 2026-07-11: repository HEAD/origin `6362524a3ff1e0776ec1b07ae746fb33f0b88a55`; NuGet RC1 accessible; release run `29131335084` failed after its validate job succeeded; artifact `8242162439` is unexpired with digest `sha256:cd5550b2172aa0e4ff9bf700f6eefb04dfd8dbd88c8d7fee22914c1769533b3f`; tag, GitHub Release, and both candidate-asset attestations are absent. No recovery dispatch has occurred.
