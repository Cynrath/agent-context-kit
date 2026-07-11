# Copilot Instructions

Prefer minimal, tested, secure changes that follow the project docs and task files.

## Maintenance Note
This file is hand-maintained. `ackit generate` does not regenerate it. Update it through a regular `docs/tasks/` task and a normal commit, never through the generator.

## Commit Completeness Hard Rule
- Before any push, run `git status` and confirm the working tree is clean.
- Run `powershell -ExecutionPolicy Bypass -File scripts/check-tracked-vs-untracked-md.ps1 -FailOnIssues` to confirm no tracked source file is left untracked.
- Never leave a newly created `.md` task file, plan, queue row, or test file uncommitted. New files must be added and committed in the same logical commit that creates them, or in an immediately following commit, before any push.

## Workflow
- Task-first workflow is mandatory. Every implementation change starts from a `docs/tasks/` record before code is written.

## Repository Health
- README: yes
- LICENSE: yes
- SECURITY: yes
- Tests: yes
- CI: yes
- Agent instructions: yes

## Release Status
- Current complete release: `v0.2.0-alpha.4`. NuGet `1.0.0-rc.1` exists in a partial immutable state; TASK-0244 recovery stopped before mutation, so tag, GitHub prerelease, and provenance remain absent.
- Current publish SHA: `98cdf9723a509a347bd0403f6373dafe81ba03fb`.
- Previous release: `v0.2.0-alpha.3` published and verified; pushed, released, and published.
- Main stack: `.NET`, `.NET CLI / .NET Tool`, and `GitHub Actions`.
- `0.2.0-alpha.4` is published and verified by TASK-0220. Do not move the tag, replace assets, republish the version, or manually mutate the GitHub Release/NuGet package.
- `1.0.0-rc.1` NuGet publication is immutable at repository commit `258918b33c3d1359aac967604ee524e8b66ddf02`; TASK-0244's recovery dispatch is consumed, so do not republish/reuse it or fix/retry/create/move its tag/release/provenance without a new explicit recovery decision.

## Commit And Push Policy
- Hard prohibitions: never force-push, never rewrite history, never move an existing tag, never create a remote, never publish a package, never create a release, never delete user changes, never expose secrets, never fabricate owner, identity, signature, or recovery evidence.
- Normal `master` commit and push is allowed only when the active project control task explicitly authorizes agent write access and only after local validation passes. Tag, release, and NuGet publication are allowed only through the explicitly authorized release task and OIDC workflow.
- Do not include model name, generator, or AI authorship in commit messages.
- Do not commit generated `.ackit/`, SARIF, HTML, Web UI, prompt pack, context export, `bin/`, or `obj/` artifacts.

## Recommended Checks
- `dotnet build AgentContextKit.sln -c Release --no-restore`
- `dotnet test AgentContextKit.sln -c Release --no-build`
- `dotnet run --project src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- scan --ci`
- `dotnet run --project src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- doctor`
- `powershell -ExecutionPolicy Bypass -File scripts/verify-release.ps1`
