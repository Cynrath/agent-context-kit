# PROJECT-CONTROL-0110: MCP Step 2 + Watch Mode + Local Hardening

## Purpose
Continue AgentContextKit (ackit) work after PROJECT-CONTROL-0109 with a focused local product hardening pass: advance the MCP transport from the Core/JSON-RPC plumbing implemented in TASK-0178 to a real stdio read/write loop with safety bounds; ship the previously design-only `ackit watch` command from TASK-0173; add regression tests, localization parity, and a docs/state sync. The alpha.3 release remains NO-GO (RB-003, RB-008 unresolved). No tag, release, or NuGet publish.

## Scope
In scope for this control document:

- MCP transport step 2: real stdio loop (`Console.In` line-delimited JSON-RPC, `Console.Out` JSON-RPC responses) with redaction + safety bounds, no process spawn, no HTTP/SSE.
- `ackit watch` local implementation: `FileSystemWatcher`-based, debounced, ignore-list aware, cancellation-safe, deterministic per-change scan pipeline run with compact diff-first status.
- `ackit watch` debounce + ignore-list + cancellation unit tests that do not rely on real file-system timing.
- Trim edge case tests (binary input, large files, UTF-8 boundary safety) on top of the TASK-0172 minimal safe implementation.
- MCP tool surface extension: add a read-only `ackit.rules` metadata tool (rules catalog snapshot) and tests.
- Localization parity for the new `watch` command and the new MCP step 2 error surface (en + tr parity, regression test).
- Docs update: append "Implementation Plan: Step 2" to `docs/MCP_STDIO_DESIGN.md`; update `docs/WATCH_MODE.md` with implementation notes; add `watch` to `docs/CLI_REFERENCE.md`; small surgical edits to other affected docs.
- Docs-first local audit + state sync: refresh `docs/NEXT_TASKS.md`, `.codex/SESSION_HANDOFF.md`, `.codex/CONTEXT_PACK.md`, `.codex/NEXT_STEPS.md` so they agree on the active control, completed history, current test count, alpha.3 NO-GO, and `RB-003`/`RB-008` blockers.
- Final validation and hosted check sync.

Out of scope:

- Force-push, history rewrite, tag movement, GitHub Release creation, NuGet publish.
- Version bump to `0.2.0-alpha.3`.
- Cloud uploads, telemetry, remote AI calls, MCP HTTP/SSE/streamable HTTP transport.
- Process spawn of any external MCP client/host.
- Closing `RB-003` or `RB-008`; no maintainer-gated blocker disposition.

## Security Boundary
- Local-only; no remote calls beyond what `ackit` already supports.
- MCP step 2 must redact tool responses using the same Core redaction rules used by SARIF output; raw matches never leave the Core.
- MCP step 2 must refuse to read or write outside the explicitly passed `repoPath`; non-existent or non-directory paths return a JSON-RPC error, not a tool result.
- `ackit watch` must never auto-execute generated scripts, must never reach the network, and must not persist watcher state across restarts.
- Hook scripts never embed secrets, tokens, or signed artifacts (existing rule; unchanged).
- All new test fixtures must include a `tests/...` or `samples/...` path so the scanner correctly treats them as non-production.

## Affected Files
- `src/AgentContextKit.Core/Mcp/McpContracts.cs` (extended).
- `src/AgentContextKit.Core/Mcp/McpRouter.cs` (extended; new `ackit.rules` tool).
- `src/AgentContextKit.Cli/Program.cs` (new `RunWatch`; `RunMcp` extended for real stdio).
- `src/AgentContextKit.Core/Watcher/` (new; interface + debounce + ignore helpers).
- `src/AgentContextKit.Core/Trim.cs` (new; trim logic moved out of Cli for testability).
- `docs/MCP_STDIO_DESIGN.md` (append Step 2).
- `docs/WATCH_MODE.md` (append implementation notes).
- `docs/CLI_REFERENCE.md` (add `watch`).
- `docs/NEXT_TASKS.md`, `.codex/SESSION_HANDOFF.md`, `.codex/CONTEXT_PACK.md`, `.codex/NEXT_STEPS.md`.
- `tests/AgentContextKit.Tests/*` (new test files).

## Implementation Steps
Sequential; do not parallelize across tasks. Each task follows the existing task-first flow: planning commit with a per-task `TASK-XXXX-...md` file, implementation commit, push, then advance.

1. TASK-0188 MCP transport step 2 (real stdio loop, redaction, safety bounds).
2. TASK-0189 `ackit watch` local implementation (FileSystemWatcher, debounce, ignore list, cancellation).
3. TASK-0190 `ackit watch` debounce + ignore-list + cancellation unit tests.
4. TASK-0191 trim edge case tests (binary input, large files, UTF-8 boundary).
5. TASK-0192 MCP tool surface extension (`ackit.rules` read-only metadata tool).
6. TASK-0193 localization parity for new commands and MCP step 2 error surface.
7. TASK-0194 docs update (MCP_STDIO_DESIGN Step 2, WATCH_MODE implementation notes, CLI_REFERENCE).
8. TASK-0195 docs-first local audit + state sync.
9. TASK-0196 final validation and hosted check sync.

## Validation
- `dotnet build AgentContextKit.sln -c Release --no-restore` — 0 errors.
- `dotnet test AgentContextKit.sln -c Release --no-build` — all green.
- `dotnet run --project src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- scan --ci` — exit 0.
- `dotnet run --project src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- doctor` — 13/13 PASS.
- `dotnet run --project src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- watch --help` — exits 0 with the documented `watch` surface.
- `dotnet run --project src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- mcp --help` — exits 0 with the step-2 surface described.
- `powershell -ExecutionPolicy Bypass -File scripts/verify-release.ps1` — pass.
- `powershell -ExecutionPolicy Bypass -File scripts/check-cli-contract.ps1 -FailOnIssues` — pass.
- `powershell -ExecutionPolicy Bypass -File scripts/check-localization-parity.ps1 -FailOnIssues` — pass.
- `powershell -ExecutionPolicy Bypass -File scripts/check-tracked-vs-untracked-md.ps1 -FailOnIssues` — clean.
- `git diff --check` — clean.
- `git status` — clean; `master` aligned with `origin/master`.

## Risks
- MCP tool transport in this environment is currently broken (DIAG-001): `mcp__plugin_*` calls fail with `InputValidationError: required parameter missing`. This blocks Playwright MCP-based webui verification and Context7 doc lookups. Local test/build/scan/doctor gates are unaffected.
- MCP step 2 unit tests must use `StringReader`/`StringWriter`-style fakes; live MCP transport cannot be reached from the test process.
- `ackit watch` is platform-dependent (`FileSystemWatcher` semantics differ on Windows/Linux/macOS); tests must use a fake `IFileWatcher` interface to stay deterministic on hosted runners.
- New tasks in this control document must work around the MCP transport by using `Bash` for any browser verification, or by leaving browser verification to a later task.
- A failed `git push` mid-task would leave the docs/plan ahead of the implementation; this is acceptable because the planning commit always precedes the implementation commit per the task-first flow.

## Rollback
Per task; each new test file or doc file is reverted by a single `git revert <sha>` because each task is a separate commit. No schema migration, no published artifact, no remote write.

## Push Policy
- Master commits are allowed.
- No force-push, no tag movement, no GitHub Release, no NuGet publish.
- Commit messages must not mention Claude, Anthropic, AI generated, Generated-by, Co-authored-by, or any model/vendor name.

## Hard Rules (repeat from prior control docs)
- `0.2.0-alpha.3` remains NO-GO because `RB-003` (independent backup security owner) and `RB-008` (destructive NuGet recovery authority) remain unresolved.
- Closing `RB-003` or `RB-008` without explicit maintainer-provided evidence is forbidden.
- No release write is performed; no `RB-003`/`RB-008` is closed by this control document.
- This control document does not claim release readiness or 1.0 readiness.