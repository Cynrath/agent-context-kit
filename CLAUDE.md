# Claude Project Context

Use the same repository rules as AGENTS.md.

## Dogfood / ACKit-First
This repository IS AgentContextKit. Every agent session must dogfood the tool.

- Before ANY task: run `ackit --version`, `ackit doctor`, `ackit scan --ci`.
- Create new task docs with `ackit task "<title>"` first, then fill/refine the generated Markdown.
- Do not create task docs manually unless `ackit task` fails. If it fails, record the exact failure.
- When testing CLI behavior beyond what the installed tool covers, use:
  `dotnet run --project src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release -- <args>`
- Run `ackit doctor` and `ackit scan --ci` before every final commit.
- Never commit generated `.ackit/`, reports, SARIF, prompt packs, context exports, package artifacts, or temp outputs.
- Preserve the task-first workflow, release immutability, and no-network/default safety rules.

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
- Current complete release: `v0.2.0-alpha.4`. NuGet `1.0.0-rc.1` exists in a partial immutable state; TASK-0244/TASK-0247 stopped before mutation and TASK-0250's tag push was rejected, so tag, GitHub prerelease, and provenance remain absent.
- Current publish SHA: `98cdf9723a509a347bd0403f6373dafe81ba03fb`.
- Previous release: `v0.2.0-alpha.3` published and verified; pushed, released, and published.
- NuGet global tool install verification: completed for `0.2.0-alpha.4`.
- Published-package smoke workflow is pinned to `AgentContextKit` `0.2.0-alpha.4` (TASK-0223).
- Source-package smoke workflow installs the local `AgentContextKit` package from source.

## Risk Summary
- No risk findings in the latest local scan.
- `0.2.0-alpha.4` is published and verified by TASK-0220; do not move the tag, replace assets, republish the version, or manually mutate the GitHub Release/NuGet package.
- `1.0.0-rc.1` NuGet publication is immutable at repository commit `258918b33c3d1359aac967604ee524e8b66ddf02`; TASK-0250's latest recovery dispatch `29341087462` is consumed and remote state is unchanged, so do not republish/reuse it or fix/retry/create/move its tag/release/provenance without a new explicit recovery decision.

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
