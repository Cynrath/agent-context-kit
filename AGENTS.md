# AgentContextKit Agent Rules

## Default Workflow
- Read `README.md`, `docs/PRODUCT_SPEC.md`, `docs/ARCHITECTURE.md`, and the active task before changing code.
- Use task-first workflow: every implementation change starts from a `docs/tasks/` record.
- Do not code before a task file exists under `docs/tasks/`.
- Continuous progress hard rule: when the user says to continue, do not ask whether to continue; proceed through the next documented task in order with task docs, implementation, verification, and commit.
- Update `.codex/SESSION_HANDOFF.md` after major steps.
- Run relevant tests before reporting completion.
- Prefer safe, minimal, production-ready changes.
- Do not commit generated `.ackit/`, SARIF, HTML, Web UI, prompt pack, context export, `bin/`, or `obj/` artifacts.

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
- Current release: `v0.2.0-alpha.2` published on GitHub and NuGet as a pre-release.
- Current source matches the published `v0.2.0-alpha.2` release plus post-publish workflow/documentation fixes.
- Previous release: `v0.1.0-alpha.2` published and verified; pushed, released, and published.
- NuGet global tool install verification: completed.
- GitHub Release page: completed.
- Published-package smoke workflow installs `AgentContextKit` `0.2.0-alpha.2`.
- Source-package smoke workflow installs the local `AgentContextKit` `0.2.0-alpha.2` package.

## Risk Summary
- No risk findings in the latest local scan.
- `0.2.0-alpha.3` is NO-GO. Do not bump version, tag, publish, or release.

## Recommended Checks
- `dotnet build AgentContextKit.sln -c Release --no-restore`
- `dotnet test AgentContextKit.sln -c Release --no-build`
- `dotnet run --project src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- scan --ci`
- `dotnet run --project src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- doctor`
- `powershell -ExecutionPolicy Bypass -File scripts/verify-release.ps1`

## Handoff
If context is low or work pauses, update:
- `.codex/SESSION_HANDOFF.md`
- `.codex/NEXT_STEPS.md`
- The active task file completion notes
