# Copilot Instructions

Prefer minimal, tested, secure changes that follow the project docs and task files.

## Repository Health
- README: yes
- LICENSE: yes
- SECURITY: yes
- Tests: yes
- CI: yes
- Agent instructions: yes

## Release Status
- Current release: `v0.2.0-alpha.2` published on GitHub and NuGet as a pre-release.
- Current source matches the published `v0.2.0-alpha.2` release plus post-publish workflow/documentation fixes.
- Previous release: `v0.1.0-alpha.2` published and verified; pushed, released, and published.
- Main stack: `.NET`, `.NET CLI / .NET Tool`, and `GitHub Actions`.
- `0.2.0-alpha.3` remains NO-GO. `RB-003` (independent backup security owner) and `RB-008` (destructive NuGet recovery authority) are unresolved.

## Commit And Push Policy
- Hard prohibitions: never force-push, never rewrite history, never move an existing tag, never create a remote, never publish a package, never create a release, never delete user changes, never expose secrets, never fabricate owner, identity, signature, or recovery evidence.
- Normal `master` commit and push is allowed only when the active project control task explicitly authorizes agent write access and only after local validation passes. Tag, release, and NuGet publication are allowed only through the explicitly authorized release task and OIDC workflow.
- Do not include model name, generator, or AI authorship in commit messages.

## Recommended Checks
- `dotnet build AgentContextKit.sln -c Release --no-restore`
- `dotnet test AgentContextKit.sln -c Release --no-build`
- `dotnet run --project src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- scan --ci`
- `dotnet run --project src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- doctor`
- `powershell -ExecutionPolicy Bypass -File scripts/verify-release.ps1`
