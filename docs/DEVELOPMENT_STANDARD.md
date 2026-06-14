# Development Standard

## Working Model
- Start every change from a task document. Task-first workflow is mandatory.
- Keep scope small and explicit.
- Prefer safe defaults over surprise behavior.
- Update docs when behavior changes.
- Record assumptions in `docs/DECISIONS.md` or the active task.
- Do not commit generated `.ackit/`, SARIF, HTML, Web UI, prompt pack, context export, `bin/`, or `obj/` artifacts.
- `0.2.0-alpha.3` is NO-GO. Do not bump version, tag, publish, or release.

## Code
- Use C# with nullable reference types enabled.
- Keep public names in English.
- Keep Core independent from console output.
- Avoid unnecessary dependencies.
- Add abstractions only when they improve testability or reduce real coupling.

## Security
- Do not expose stack traces in public CLI output.
- Provide cause and recommended action for errors.
- Do not send code or findings to remote services in the MVP.
- Report, do not mutate, risky content.

## Verification
Run:
```powershell
dotnet restore
dotnet build -c Release
dotnet test -c Release
```

## Recommended Local Release Checks
```powershell
dotnet build AgentContextKit.sln -c Release --no-restore
dotnet test AgentContextKit.sln -c Release --no-build
dotnet run --project src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- scan
powershell -ExecutionPolicy Bypass -File scripts/verify-release.ps1
```

## Release Boundaries
- Keep public release actions maintainer-only.
- Hard prohibitions: never force-push, never rewrite history, never move an existing tag, never create a remote, never publish a package, never create a release, never delete user changes, never expose secrets, never fabricate owner, identity, signature, or recovery evidence.
- Normal `master` commit and push is allowed only when the active project control task explicitly authorizes agent write access and only after local validation passes. Tag, release, and NuGet publication are allowed only through the explicitly authorized release task and OIDC workflow.
- Do not include model name, generator, or AI authorship in commit messages.
