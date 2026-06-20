# Claude Project Context

Use the same repository rules as AGENTS.md.

## Workflow
- Task-first: every implementation change starts from `docs/tasks/`.
- Continuous progress: do not stop between documented tasks; proceed through them in order.
- Do not commit generated `.ackit/`, SARIF, HTML, Web UI, prompt pack, context export, `bin/`, or `obj/` artifacts.

## Commit Completeness Hard Rule
- Before any push, run `git status` and confirm the working tree is clean.
- Run `powershell -ExecutionPolicy Bypass -File scripts/check-tracked-vs-untracked-md.ps1 -FailOnIssues` to confirm no tracked source file is left untracked.
- Never leave a newly created `.md` task file, plan, queue row, or test file uncommitted. New files must be added and committed in the same logical commit that creates them, or in an immediately following commit, before any push.

## Stack
- .NET: .sln/.slnx/*proj/Program.cs
- .NET CLI / .NET Tool: PackAsTool/ToolCommandName
- GitHub Actions: .github/workflows

## Repository Health
- README: yes
- LICENSE: yes
- SECURITY: yes
- Tests: yes
- CI: yes
- Agent instructions: yes

## Release Status
- Current release: `v0.2.0-alpha.2` published and verified on GitHub and NuGet as a pre-release.
- Current source/package metadata is prepared as the local `0.2.0-alpha.3` release candidate; hosted RC evidence and publication are pending.
- Previous release: `v0.1.0-alpha.2` published and verified; pushed, released, and published.
- NuGet global tool install verification: completed.
- Published-package smoke workflow installs `AgentContextKit` `0.2.0-alpha.2`.
- Source-package smoke workflow installs the local `AgentContextKit` `0.2.0-alpha.3` package.

## Risk Summary
- No risk findings in the latest local scan.
- `0.2.0-alpha.3` is release-prepared locally only after TASK-0203 validation; do not tag, publish, create a GitHub Release, or dispatch release workflows.

## Recommended Checks
- `dotnet build AgentContextKit.sln -c Release --no-restore`
- `dotnet test AgentContextKit.sln -c Release --no-build`
- `dotnet run --project src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- scan --ci`
- `dotnet run --project src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- doctor`
- `powershell -ExecutionPolicy Bypass -File scripts/verify-release.ps1`

## Commit And Push Policy
- Follow `AGENTS.md` for the full commit and push policy. Hard prohibitions (force-push, history rewrite, tag movement, release/NuGet publish, secret exposure, user-file deletion) remain in force.
- Normal `master` commit and push is allowed only when the active project control task explicitly authorizes agent write access and only after local validation passes. Tag, release, and NuGet publication are allowed only through the explicitly authorized release task and OIDC workflow.
- Do not include model name, generator, or AI authorship in commit messages.
