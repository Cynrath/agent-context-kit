# NuGet Metadata

AgentContextKit package metadata is defined in `src/AgentContextKit.Cli/AgentContextKit.Cli.csproj`.

## Current Status
Source/package metadata is `AgentContextKit` `1.0.0-rc.1`. NuGet RC1 is published and repository-signed at commit `258918b33c3d1359aac967604ee524e8b66ddf02`, but tag/GitHub prerelease/provenance remain absent after TASK-0244 and TASK-0247 both stopped before mutation. `0.2.0-alpha.4` remains the latest complete release and exact hosted predecessor.

Shared package metadata:
- `RepositoryUrl` is `https://github.com/Cynrath/agent-context-kit`.
- `PackageProjectUrl` is `https://github.com/Cynrath/agent-context-kit`.
- `Authors` is `Cynrath`.
- `Company` is `Cynrath`.

Publication state:
- GitHub Actions latest `master` run is green.
- GitHub Release page for `v0.2.0-alpha.4` is completed as a pre-release.
- NuGet publish is completed for `0.2.0-alpha.4`.
- NuGet global tool install verification is completed for `0.2.0-alpha.4`.
- Publish SHA: `98cdf9723a509a347bd0403f6373dafe81ba03fb` (commit `98cdf97`).
- `README.nuget.md` package README is shipped with this release.

Previous release state:
- GitHub Release page for `v0.2.0-alpha.2` is completed as a pre-release.
- NuGet publish is completed for `0.2.0-alpha.2`.
- NuGet global tool install verification is completed for `0.2.0-alpha.2`.

The public NuGet owner identity is `Cyranth`, while package metadata and repository persona use `Cynrath`. This intentional current-state disposition is documented in `docs/NUGET_OWNER_IDENTITY.md`; metadata remains `Cynrath` and no owner mutation is performed.

This review follows Microsoft Learn NuGet package authoring guidance for package ID, version, authors, description, project URL, README, repository metadata, tags, release notes, and license expression:
- https://learn.microsoft.com/nuget/create-packages/package-authoring-best-practices#package-metadata
- https://learn.microsoft.com/nuget/reference/msbuild-targets#pack-target

## NuGet README Rendering Contract

The repository intentionally separates the GitHub README and NuGet package README:

- `README.md` is the GitHub repository README.
- `README.nuget.md` is the NuGet package README.
- `src/AgentContextKit.Cli/AgentContextKit.Cli.csproj` owns `PackageReadmeFile` and the explicit package-root packing entry.

Keep `README.nuget.md` pure Markdown. Do not add raw HTML, GitHub-only alignment/layout markup, relative local image paths, generated reports, or package artifacts. If nuget.org rendering breaks, edit `README.nuget.md` and the package metadata/check/docs files together.

`scripts/check-package-metadata.ps1 -FailOnIssues` enforces the renderer boundary by rejecting raw HTML/layout elements, CSS/layout attributes, and relative image references. GitHub-specific presentation remains confined to `README.md` and `README.tr.md`.

A published NuGet version cannot be corrected in place for README rendering. The fix becomes visible on nuget.org only after a later authorized package publish.

TASK-0246 improves the repository source for a future package without mutating or republishing the existing RC1 package. Therefore the already-published `1.0.0-rc.1` package page is not claimed to change retroactively.

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
dotnet tool install --global AgentContextKit --version 0.2.0-alpha.4
ackit version
ackit --help
```

Expected version output:

```text
AgentContextKit 0.2.0-alpha.4
```

## Required Fields
- `PackAsTool`: `true`
- `ToolCommandName`: `ackit`
- `PackageId`: `AgentContextKit`
- `Version`: `1.0.0-rc.1` in current source; published install examples remain `0.2.0-alpha.4` until a separately authorized publish completes
- `Authors`: `Cynrath`
- `Company`: `Cynrath`
- `PackageReadmeFile`: `README.nuget.md`
- `PackageLicenseExpression`: `MIT`
- `RepositoryType`: `git`
- `RepositoryUrl`: `https://github.com/Cynrath/agent-context-kit`
- `PackageProjectUrl`: `https://github.com/Cynrath/agent-context-kit`
- `PackageRequireLicenseAcceptance`: `false`
- `Description`: non-empty
- `PackageTags`: includes `ai`, `coding-agent`, `security`, `cli`, and `oss`
- `PackageReleaseNotes`: non-empty
- `README.nuget.md`: present and explicitly packed into the package root

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
