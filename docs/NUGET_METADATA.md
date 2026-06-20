# NuGet Metadata

AgentContextKit package metadata is defined in `src/AgentContextKit.Cli/AgentContextKit.Cli.csproj`.

## Current Status
Source package metadata and the currently published NuGet package are `AgentContextKit` `0.2.0-alpha.3`.

Shared package metadata:
- `RepositoryUrl` is `https://github.com/Cynrath/agent-context-kit`.
- `PackageProjectUrl` is `https://github.com/Cynrath/agent-context-kit`.
- `Authors` is `Cynrath`.
- `Company` is `Cynrath`.

Publication state:
- GitHub Actions latest `master` run is green.
- GitHub Release page for `v0.2.0-alpha.2` is completed as a pre-release.
- NuGet publish is completed for `0.2.0-alpha.2`.
- NuGet global tool install verification is completed for `0.2.0-alpha.2`.
- GitHub Release page for `v0.2.0-alpha.3` is completed as a pre-release.
- NuGet publish is completed for `0.2.0-alpha.3`.
- NuGet global tool install verification is completed for `0.2.0-alpha.3`.
- Publish SHA: `92984c6448332aa24b7cff94647f627bf944e535`.
- `release.yml` `operation=verify-existing` run `27870813763` succeeded for the immutable alpha.3 release state.

The public NuGet owner identity is `Cyranth`, while package metadata and repository persona use `Cynrath`. This intentional current-state disposition is documented in `docs/NUGET_OWNER_IDENTITY.md`; metadata remains `Cynrath` and no owner mutation is performed.

This review follows Microsoft Learn NuGet package authoring guidance for package ID, version, authors, description, project URL, README, repository metadata, tags, release notes, and license expression:
- https://learn.microsoft.com/nuget/create-packages/package-authoring-best-practices#package-metadata
- https://learn.microsoft.com/nuget/reference/msbuild-targets#pack-target

## Metadata Review
Run report-only mode:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-package-metadata.ps1
```

Run as a failing gate:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-package-metadata.ps1 -FailOnIssues
```

With the current package metadata, `-FailOnIssues` should return exit code `0`.

The script is local-only and read-only. It does not pack, push, publish, tag, redact, delete, create remotes, or change package metadata.

## Public Install
Install the currently published global tool:

```powershell
dotnet tool install --global AgentContextKit --version 0.2.0-alpha.3
ackit version
ackit --help
```

Expected version output:

```text
AgentContextKit 0.2.0-alpha.3
```

## Required Fields
- `PackAsTool`: `true`
- `ToolCommandName`: `ackit`
- `PackageId`: `AgentContextKit`
- `Version`: `0.2.0-alpha.3`
- `Authors`: `Cynrath`
- `Company`: `Cynrath`
- `PackageReadmeFile`: `README.md`
- `PackageLicenseExpression`: `MIT`
- `RepositoryType`: `git`
- `RepositoryUrl`: `https://github.com/Cynrath/agent-context-kit`
- `PackageProjectUrl`: `https://github.com/Cynrath/agent-context-kit`
- `PackageRequireLicenseAcceptance`: `false`
- `Description`: non-empty
- `PackageTags`: includes `ai`, `coding-agent`, `security`, `cli`, and `oss`
- `PackageReleaseNotes`: non-empty
- `README.md`: present and explicitly packed into the package root

## Future Publish Gates
Before future public publish after `0.2.0-alpha.3`:
1. Run `scripts/check-package-metadata.ps1 -FailOnIssues`.
2. Run `scripts/audit-public-release.ps1 -FailOnIssues`.
3. Run `scripts/check-release-blockers.ps1 -FailOnBlockers`.
4. Run `scripts/check-public-release-gates.ps1 -FailOnIssues`.
5. Run `scripts/verify-release.ps1`.
6. Confirm GitHub Actions latest release run is green.
7. Confirm the target GitHub Release page is ready.
8. Publish only after explicit maintainer approval.
9. Confirm the `release.yml` provenance probe has been hardened so a missing attestation can lead to `actions/attest@v4` instead of failing the publish job.
