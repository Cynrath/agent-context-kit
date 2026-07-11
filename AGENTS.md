# AgentContextKit Agent Rules

## Default Workflow
- Read `README.md`, `README.nuget.md`, `docs/PRODUCT_SPEC.md`, `docs/ARCHITECTURE.md`, and the active task before changing code or package metadata.
- Use task-first workflow: every implementation change starts from a `docs/tasks/` record.
- Do not code before a task file exists under `docs/tasks/`.
- Continuous progress hard rule: when the user says to continue, do not ask whether to continue; proceed through the next documented task in order with task docs, implementation, verification, and commit.
- Update `.codex/SESSION_HANDOFF.md` after major steps.
- Run relevant tests before reporting completion.
- Prefer safe, minimal, production-ready changes.
- Do not commit generated `.ackit/`, SARIF, HTML, Web UI, prompt pack, context export, `bin/`, or `obj/` artifacts.

## NuGet Package README Boundary
- GitHub repository presentation lives in root `README.md`.
- NuGet package presentation lives in root `README.nuget.md`.
- `src/AgentContextKit.Cli/AgentContextKit.Cli.csproj` owns `PackageReadmeFile` and the explicit package-root packing entry for `README.nuget.md`.
- Changes intended to fix the nuget.org package page must update `README.nuget.md`, the CLI `.csproj` package metadata, `scripts/check-package-metadata.ps1`, `docs/PACKAGING.md`, and `docs/NUGET_METADATA.md` together.
- Keep `README.nuget.md` pure Markdown: no raw HTML blocks, no GitHub-only layout markup, no relative local image paths, and no generated report artifacts.
- Do not try to fix NuGet rendering by weakening or removing the GitHub README layout unless the GitHub README itself is the intended target.
- A published NuGet version is immutable for this purpose; visible package README corrections require a later authorized package publish.

## Dogfood / ACKit-First
This repository IS AgentContextKit. Every agent session must dogfood the tool.

- Before ANY task: run `ackit --version`, `ackit doctor`, `ackit scan --ci`.
- Create new task docs with `ackit task "<title>"` first, then fill/refine the generated Markdown.
- Do not create task docs manually unless `ackit task` fails. If it fails, record the exact failure in the task.
- When testing CLI behavior beyond what the installed tool covers, use:
  `dotnet run --project src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release -- <args>`
- Run `ackit doctor` and `ackit scan --ci` before every final commit.
- Never commit generated `.ackit/`, reports, SARIF, prompt packs, context exports, package artifacts, or temp outputs.
- Preserve the task-first workflow, release immutability, and no-network/default safety rules.
- Run safe ackit commands in temp/output-safe locations when possible.

## Safety
- Keep the MVP offline-first and local-only.
- Do not upload repository content.
- Do not add telemetry, LLM calls, or remote services without a documented decision.
- Do not overwrite existing user files by default.
- Do not delete files or run destructive git commands unless explicitly requested.
- Treat secret/PII/brand leakage as a release-blocking concern.

## Code Standards
- Public APIs, classes, and methods use English names.
- Keep CLI parsing/output separate from Core business logic.
- Keep IO, scanning, rendering, reporting, and config responsibilities separate.
- Use nullable reference types.
- Keep dependencies minimal.
- Add focused tests for behavior changes.

## Git Discipline
- Check `git status` before edits.
- Hard prohibitions: never force-push, never rewrite history, never move an existing tag, never create a remote, never publish a package, never create a release, never delete user changes, never expose secrets, never fabricate owner, identity, signature, or recovery evidence.
- Agents may create logical commits and perform normal `master` pushes only when the active project control task explicitly authorizes agent write access and only after local validation passes. Tag, release, and NuGet publication are allowed only through the explicitly authorized release task and OIDC workflow.
- Use small logical commits when practical.
- Do not commit `.env`, dumps, uploads, `bin/`, `obj/`, `node_modules`, backups, or generated junk.
- Do not include model name, generator, or AI authorship in commit messages.

## Commit Completeness Hard Rule
- Before any push, run `git status` and confirm the working tree is clean.
- Run `powershell -ExecutionPolicy Bypass -File scripts/check-tracked-vs-untracked-md.ps1 -FailOnIssues` to confirm no Markdown or other tracked source file is left untracked.
- Never leave a newly created `.md` task file, plan, queue row, or test file uncommitted. New files must be added and committed in the same logical commit that creates them, or in an immediately following commit, before any push.
- If a push reveals a missing commit, stop and commit the missing file before continuing; do not continue to the next task.

## Repository Health
- README: yes
- LICENSE: yes
- SECURITY: yes
- Tests: yes
- CI: yes
- Agent instructions: yes

## Stack
- .NET: .sln/.slnx/*proj/Program.cs
- .NET CLI / .NET Tool: PackAsTool/ToolCommandName
- GitHub Actions: .github/workflows

## Release Status
- Current complete release: `v0.2.0-alpha.4`. NuGet `1.0.0-rc.1` exists in a partial immutable state; TASK-0244 recovery stopped before mutation, so tag, GitHub prerelease, and provenance remain absent.
- Current publish SHA: `98cdf9723a509a347bd0403f6373dafe81ba03fb`.
- Previous release: `v0.2.0-alpha.3` published and verified; pushed, released, and published.
- NuGet global tool install verification: completed for `0.2.0-alpha.4`.
- GitHub Release page: completed for `v0.2.0-alpha.4`.
- Published-package smoke workflow is pinned to `AgentContextKit` `0.2.0-alpha.4` (TASK-0223).
- Source-package smoke workflow installs the local `AgentContextKit` package built from source.

## Risk Summary
- No risk findings in the latest local scan.
- `0.2.0-alpha.4` is published and verified by TASK-0220; do not move the tag, replace assets, republish the version, or manually mutate the GitHub Release/NuGet package.
- `1.0.0-rc.1` NuGet publication is immutable at repository commit `258918b33c3d1359aac967604ee524e8b66ddf02`; TASK-0244's recovery dispatch is consumed, so do not republish/reuse it or fix/retry/create/move its tag/release/provenance without a new explicit recovery decision.

## Recommended Checks
- `dotnet build AgentContextKit.sln -c Release --no-restore`
- `dotnet test AgentContextKit.sln -c Release --no-build`
- `dotnet run --project src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- scan --ci`
- `dotnet run --project src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- doctor`
- `powershell -ExecutionPolicy Bypass -File scripts/check-package-metadata.ps1 -FailOnIssues`
- `powershell -ExecutionPolicy Bypass -File scripts/verify-release.ps1`

## Handoff
If context is low or work pauses, update:
- `.codex/SESSION_HANDOFF.md`
- `.codex/NEXT_STEPS.md`
- The active task file completion notes
