# PROJECT-CONTROL-0109: Scan/Export/Hooks Hardening + MCP Prototype Step 1

## Purpose
Continue AgentContextKit (ackit) work after PROJECT-CONTROL-0108 with a focused hardening pass on hooks, scan/export edge cases, and the first concrete step of the previously designed MCP stdio transport. The alpha.3 release remains NO-GO (RB-003, RB-008 unresolved). No tag, release, or NuGet publish.

## Scope
In scope for this control document:
- Hook expansion (Anthropic + Continue targets, dry-run preview).
- MCP transport prototype step 1 (Core interface + JSON-RPC plumbing, no process spawn).
- WebUI no-build static polish (Playwright verified, offline-correct).
- Hosted check status reporter script (PowerShell companion to CI).
- SARIF roundtrip regression test.
- Prompt pack edge cases (empty repo, fixture with secret).
- Catalog rule id and severity stability test.
- Scan `--include` / `--exclude` glob filters.
- Nightly local check workflow (`.github/workflows`).
- Final validation and hosted check sync.

Out of scope:
- Force-push, history rewrite, tag movement, GitHub Release creation, NuGet publish.
- Version bump to `0.2.0-alpha.3`.
- Cloud uploads, telemetry, remote AI calls, MCP HTTP transport.

## Security Boundary
- Local-only; no remote calls beyond what `ackit` already supports.
- Hook scripts never embed secrets, tokens, or signed artifacts.
- All new test fixtures must include a `tests/...` or `samples/...` path so the scanner correctly treats them as non-production.

## Affected Files
- `src/AgentContextKit.Core/Hooks.cs` (new or extended).
- `src/AgentContextKit.Core/Mcp/*.cs` (new).
- `src/AgentContextKit.Cli/Program.cs` (new subcommands).
- `docs/CLI_REFERENCE.md`, `docs/CLI_CONTRACT.md`, `docs/SCANNER_RULES.md`, `docs/SARIF_OUTPUT.md`, `docs/MCP_STDIO_DESIGN.md`, `docs/WEBUI.md`.
- `scripts/hosted-checks-summary.ps1` (new).
- `.github/workflows/nightly-local-check.yml` (new).
- `tests/AgentContextKit.Tests/*` (new test files).

## Implementation Steps
Sequential; do not parallelize across tasks. Each task follows the existing task-first flow: planning commit first, implementation commit, push, then advance.

1. TASK-0177 hook expansion.
2. TASK-0178 MCP transport prototype (Core, no process).
3. TASK-0179 webui no-build static polish.
4. TASK-0180 hosted check status reporter script.
5. TASK-0181 SARIF roundtrip regression test.
6. TASK-0182 prompt pack edge cases.
7. TASK-0183 catalog rule id and severity stability test.
8. TASK-0184 scan `--include` / `--exclude` glob filters.
9. TASK-0185 nightly local check workflow.
10. TASK-0186 final validation and hosted check sync.

## Validation
- `dotnet build AgentContextKit.sln -c Release --no-restore` — 0 errors.
- `dotnet test AgentContextKit.sln -c Release --no-build` — all green.
- `dotnet run --project src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- scan --ci` — exit 0.
- `dotnet run --project src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- doctor` — 14/14 PASS.
- `powershell -ExecutionPolicy Bypass -File scripts/verify-release.ps1` — pass.
- `powershell -ExecutionPolicy Bypass -File scripts/check-tracked-vs-untracked-md.ps1 -FailOnIssues` — clean.
- `git status` clean; `master` aligned with `origin/master`.

## Risks
- MCP tool transport in this environment is currently broken (DIAG-001): `mcp__plugin_*` calls fail with `InputValidationError: required parameter missing`. This blocks Playwright MCP-based webui verification and Context7 doc lookups. Local test/build/scan/doctor gates are unaffected.
- New tasks in this control document must work around the MCP transport by using `Bash` for any browser verification, or by leaving browser verification to a later task.

## Rollback
Per task; each new test file or doc file is reverted by a single `git revert <sha>` because each task is a separate commit. No schema migration, no published artifact.

## Push Policy
- Master commits are allowed.
- No force-push, no tag movement, no GitHub Release, no NuGet publish.
- Commit messages must not mention Claude, Anthropic, AI generated, Generated-by, Co-authored-by, or any model/vendor name.
