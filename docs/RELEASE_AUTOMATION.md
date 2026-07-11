# Release Automation

## Trigger And Operations
`.github/workflows/release.yml` is manual-only through `workflow_dispatch`. Pull requests, forks, pushes, and tags cannot start it. Shared inputs are `operation`, `version`, `automation_commit_sha`, `release_commit_sha`, and `prerelease`. Exact existing-package recovery additionally requires `source_run_id`, `source_artifact_digest`, `expected_nupkg_sha256`, and `expected_snupkg_sha256`.

- `publish` validates and publishes a new immutable version. Both commit inputs must equal current `origin/master`.
- `recover-existing` completes a partial GitHub tag/release/provenance state from a prior validated workflow artifact after NuGet already exists. It never logs in to or pushes to NuGet.
- `verify-existing` validates an already-published immutable version. The automation commit must equal current `origin/master`; the release commit may be an older exact package/tag commit.

## Exact Commit Boundary
The publish validation job checks out the automation commit with full history and fails unless both input SHAs, checked-out HEAD, and current `origin/master` are identical. Version metadata must agree across the package project, CLI runtime, source-package smoke workflow, and release verification script.

## Validation Before Publication
The read-only validation job runs restore, Release build, tests, source scan, doctor, JSON/SARIF parse, sample smoke, Markdown links, contract/readiness/security gates, package metadata inspection, pack, package archive inspection, temporary tool installation, and installed-package smoke. Package files are transferred to the release job as a short-retention workflow artifact only after validation succeeds.

## Credential Boundary
The release job uses GitHub environment `nuget-release` and only that job receives:

- `contents: write` for the exact tag and GitHub pre-release;
- `id-token: write` for NuGet Trusted Publishing.
- `attestations: write` for the exact GitHub Release `.nupkg` provenance record.

`NuGet/login@v1` requests a short-lived NuGet credential for user `Cyranth`. The output is used only by `dotnet nuget push`; it is not printed, written to a file, committed, or stored as a repository secret. No API key or `NuGet.Config` credential is supported.

The `verify-existing` job is separate from publication. It has only `contents: read`, does not use the `nuget-release` environment, does not request `id-token: write`, does not call `NuGet/login`, and cannot publish, tag, upload, or edit a GitHub Release.

The `recover-existing` job is also separate from publication and does not use the `nuget-release` environment, `NuGet/login`, `NUGET_API_KEY`, package permissions, or `dotnet nuget push`. It receives `actions: read` to retrieve the exact earlier workflow artifact, `contents: write` for a new non-force exact tag and prerelease, plus `id-token: write` and `attestations: write` for the two exact release assets. A post-recovery matrix has only `contents: read`.

## Artifact Provenance
After NuGet, tag, and GitHub Release verification, the publish job downloads the exact release `.nupkg`. If its SHA-256 already has a repository attestation, creation is skipped. If the attestation lookup returns HTTP 404, the workflow records `exists=false` and lets `actions/attest@v4` create provenance. Other lookup failures remain blocking. `gh attestation verify` then requires the `release.yml` signer workflow. This occurs only in the publish job; alpha.2 is not retrospectively attested.

The exact-existing-package recovery path separately attests both the recovered `.nupkg` and `.snupkg` after their release downloads match the expected SHA-256 inputs. Each asset is verified with `gh attestation verify` against `.github/workflows/release.yml`. These attestations describe the exact recovered release assets and do not claim that NuGet was republished.

## Idempotency And Partial Failure
- Concurrency serializes runs for the same operation and version.
- An existing NuGet version is verified and not republished.
- An existing tag must target the exact requested commit or the workflow fails without moving it.
- If NuGet succeeds and GitHub Release creation later fails, rerun the same inputs. The workflow verifies the package, skips republish, verifies/creates the exact tag, and completes missing release assets.
- If the exact release asset exists but its attestation is missing, the provenance probe records `exists=false` and continues to `actions/attest@v4`; if the attestation already exists, it records `exists=true` and skips creating a duplicate attestation.
- NuGet failure stops tag and release creation.

## Exact Existing-Package Recovery

`scripts/verify-existing-package-recovery.ps1` requires exact candidate nupkg/snupkg hashes, package identity/version/repository commit, a valid NuGet repository signature, and archive-entry content equality between the validated unsigned nupkg and NuGet-served signed nupkg after excluding only `.signature.p7s`. The workflow additionally binds the source run, workflow/event/head SHA, artifact ID/digest/expiry, and exact two-file artifact set.

Recovery is fail-closed: NuGet must exist while tag and GitHub Release are absent; the absence check is repeated immediately before mutation. The tag is pushed without force only at `release_commit_sha`, the prepared version-specific body is required, and only the verified nupkg/snupkg are passed to `gh release create`. Any partial failure is preserved for one read-only audit and a new explicit decision; the workflow must not be dispatched a second time automatically.

`scripts/test-existing-package-recovery.ps1` provides network-free positive, repeated, wrong-hash, wrong-commit, and changed-content fixtures. The workflow static/supply-chain gates reject NuGet login/push, manual release upload/edit, force options, missing evidence bindings, missing second attestation, and write permissions in the three-platform verification matrix.

## Existing Release Recovery Verification
`scripts/verify-existing-release.ps1` performs a read-only verification of NuGet availability, repository-signed package validity, full disposable installed-tool smoke, exact tag target, GitHub pre-release state, required `.nupkg`/`.snupkg` assets, package metadata, and SHA-256 evidence. NuGet and GitHub Release package hashes are recorded independently because NuGet repository signing can change the served package bytes.

`scripts/test-release-recovery.ps1` runs network-free positive, negative, and repeated-invocation fixtures. `scripts/check-release-workflow.ps1` statically rejects publish credentials or remote mutation commands in the `verify-existing` job.

## Local Commands
```powershell
powershell -ExecutionPolicy Bypass -File scripts/prepare-release.ps1 -Version 0.2.0-alpha.3 -CommitSha (git rev-parse HEAD) -AllowDirty -FailOnIssues
powershell -ExecutionPolicy Bypass -File scripts/check-release-workflow.ps1 -FailOnIssues
powershell -ExecutionPolicy Bypass -File scripts/test-supply-chain-workflow.ps1
powershell -ExecutionPolicy Bypass -File scripts/test-release-recovery.ps1
powershell -ExecutionPolicy Bypass -File scripts/test-existing-package-recovery.ps1
powershell -ExecutionPolicy Bypass -File scripts/verify-published-package.ps1 -Version 0.2.0-alpha.3
```

The published-package verifier uses a disposable tool path and repository, checks `version`/`--help`, exercises the installed command surface, expects exit code `2` for a synthetic secret, removes the fixture, and requires a final clean scan.
