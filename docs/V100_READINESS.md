# Historical v1.0 Asset Readiness

This page records an early local milestone that assembled v1.0-target contract, convention, documentation, and release-gate assets. It confirms that those assets are present and linked. It does not prove 1.0 product readiness or approve a release.

Actual 1.0 gaps and blocking evidence are tracked in `docs/V100_GAP_ANALYSIS.md`. The current complete prerelease is `v1.0.0-rc.1`; this does not claim `1.0.0` GA readiness.

## Historical Local Readiness Scope
The v1.0 local readiness review covers:
- TASK-0035 stabilization planning.
- TASK-0036 stable CLI contract review.
- TASK-0037 config and generated-file convention freeze.
- TASK-0038 documentation and release gate freeze.
- TASK-0039 final local readiness consolidation.
- Release validation documentation and the documentation index.
- Context pack, next steps, and session handoff continuity.

## Usage
Run the review in report-only mode:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-v100-readiness.ps1
```

Run it as a failing local gate for missing local readiness assets:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-v100-readiness.ps1 -FailOnIssues
```

`-FailOnIssues` validates historical readiness assets and the presence of the current gap analysis. It does not fail merely because planned 1.0 product gaps remain open.

## Current Published State
- `RepositoryUrl` is `https://github.com/Cynrath/agent-context-kit`.
- `PackageProjectUrl` is `https://github.com/Cynrath/agent-context-kit`.
- GitHub repository is public.
- GitHub Release `v1.0.0-rc.1` is published as a prerelease with exact validated assets.
- NuGet package `AgentContextKit` version `1.0.0-rc.1` is published; both asset attestations and three-platform installed smoke are verified.
- NuGet global tool install verification is completed.
- `ackit sarif` is included in the published package.

Current release follow-ups are tracked by `docs/RELEASE_BLOCKERS.md`, `docs/PUBLIC_RELEASE_AUDIT.md`, `docs/PUBLIC_RELEASE_GATES.md`, and `docs/MAINTAINER_RELEASE_HANDOFF.md`.

## What This Gate Proves
- Required historical task/docs/script assets exist.
- Package URLs and the current local release tag are available.
- The maintained 1.0 gap analysis is linked.

It does not prove API/CLI stability, migration safety, performance, security response readiness, support lifetime, or release supply-chain completeness.

TASK-0099 narrows the predecessor published-state uncertainty: `0.2.0-alpha.1` has a valid NuGet.org repository signature, no observed author signature, no package/release SBOM, no accessible GitHub package attestation, and a NuGet owner profile that differs from the project persona. Alpha.2 requires the same read-only supply-chain audit before equivalent claims are made. These remain maintainer decisions rather than completed controls.

## Actual 1.0 Readiness
`docs/V100_GAP_ANALYSIS.md` is the source of truth. A 1.0 release candidate requires zero open P0 gaps and an explicit disposition for every P1 gap.

TASK-0092 records a conditional local contract freeze in `docs/RELEASE_CANDIDATE_CONTRACT_FREEZE.md` and keeps the maintainer decision at NO-GO in `docs/MAINTAINER_RC_DECISION.md` until remaining P0, hosted, and remote evidence is complete.

## Required Validation
Run these checks when reviewing the historical assets and current gap register:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-v100-readiness.ps1 -FailOnIssues
powershell -ExecutionPolicy Bypass -File scripts/check-cli-contract.ps1 -FailOnIssues
powershell -ExecutionPolicy Bypass -File scripts/check-config-generated-conventions.ps1 -FailOnIssues
powershell -ExecutionPolicy Bypass -File scripts/check-v100-documentation-release-gates.ps1 -FailOnIssues
powershell -ExecutionPolicy Bypass -File scripts/check-v050-readiness.ps1 -FailOnIssues
powershell -ExecutionPolicy Bypass -File scripts/check-published-supply-chain-status.ps1 -FailOnIssues
dotnet build AgentContextKit.sln -c Release --no-restore
dotnet test AgentContextKit.sln -c Release --no-build
dotnet run --project src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- scan --ci
powershell -ExecutionPolicy Bypass -File scripts/verify-release.ps1
git diff --check
rg -n "<maintainer-real-name-pattern>" .
```

Use the local maintainer real-name pattern without committing that pattern to documentation. The grep is expected to exit with no matches.

## Maintainer-Only Boundary
This readiness review does not:
- Create or push release tags.
- Push commits.
- Create remotes.
- Publish NuGet packages.
- Upload repository content.
- Call LLM providers.
- Read, store, generate, or validate API keys.
- Redact, overwrite, or delete files.

Follow `docs/MAINTAINER_RELEASE_HANDOFF.md` only after explicit maintainer approval.
