# Release Automation

## Trigger And Operations
`.github/workflows/release.yml` is manual-only through `workflow_dispatch`. Pull requests, forks, pushes, and tags cannot start it. Inputs are `operation`, `version`, `automation_commit_sha`, `release_commit_sha`, and `prerelease`.

- `publish` validates and publishes a new immutable version. Both commit inputs must equal current `origin/master`.
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

## Artifact Provenance
After NuGet, tag, and GitHub Release verification, the publish job downloads the exact release `.nupkg`. If its SHA-256 already has a repository attestation, creation is skipped. Otherwise `actions/attest@v4` creates provenance, and `gh attestation verify` requires the `release.yml` signer workflow. This occurs only in the publish job; alpha.2 is not retrospectively attested.

## Idempotency And Partial Failure
- Concurrency serializes runs for the same operation and version.
- An existing NuGet version is verified and not republished.
- An existing tag must target the exact requested commit or the workflow fails without moving it.
- If NuGet succeeds and GitHub Release creation later fails, rerun the same inputs. The workflow verifies the package, skips republish, verifies/creates the exact tag, and completes missing release assets.
- NuGet failure stops tag and release creation.

## Existing Release Recovery Verification
`scripts/verify-existing-release.ps1` performs a read-only verification of NuGet availability, repository-signed package validity, full disposable installed-tool smoke, exact tag target, GitHub pre-release state, required `.nupkg`/`.snupkg` assets, package metadata, and SHA-256 evidence. NuGet and GitHub Release package hashes are recorded independently because NuGet repository signing can change the served package bytes.

`scripts/test-release-recovery.ps1` runs network-free positive, negative, and repeated-invocation fixtures. `scripts/check-release-workflow.ps1` statically rejects publish credentials or remote mutation commands in the `verify-existing` job.

## Local Commands
```powershell
powershell -ExecutionPolicy Bypass -File scripts/prepare-release.ps1 -Version 0.2.0-alpha.3 -CommitSha (git rev-parse HEAD) -AllowDirty -FailOnIssues
powershell -ExecutionPolicy Bypass -File scripts/check-release-workflow.ps1 -FailOnIssues
powershell -ExecutionPolicy Bypass -File scripts/test-supply-chain-workflow.ps1
powershell -ExecutionPolicy Bypass -File scripts/test-release-recovery.ps1
powershell -ExecutionPolicy Bypass -File scripts/verify-published-package.ps1 -Version 0.2.0-alpha.3
```

The published-package verifier uses a disposable tool path and repository, checks `version`/`--help`, exercises the installed command surface, expects exit code `2` for a synthetic secret, removes the fixture, and requires a final clean scan.
