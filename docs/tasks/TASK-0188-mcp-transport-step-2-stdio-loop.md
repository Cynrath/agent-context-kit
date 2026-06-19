# TASK-0188: MCP Transport Step 2 (Real Stdio Loop, Redaction, Safety Bounds)

## Purpose
Advance the AgentContextKit (`ackit`) MCP transport from the Core/JSON-RPC plumbing implemented in TASK-0178 to a real local stdio read/write loop. After this task, `ackit mcp` reads line-delimited JSON-RPC 2.0 messages from `Console.In`, writes JSON-RPC responses to `Console.Out`, and keeps all diagnostic logs on `Console.Error`. The transport stays strictly local: no network, no telemetry, no child process, no source mutation. Tool responses are sanitized to the same privacy posture as SARIF/JSON output (raw scanner matches are never written; absolute local paths are never written).

This is the first task in PROJECT-CONTROL-0110 and the gate for the `ackit watch` work that follows.

## Current State
- TASK-0178 ships a Core-only `McpRouter` in `src/AgentContextKit.Core/Mcp/` and a thin CLI stub `ackit mcp --stdio <json-request>` in `src/AgentContextKit.Cli/Program.cs`. The CLI stub takes the request as an argument string, never reads `Console.In`, and never runs a long-lived loop. Tool responses are already produced with `match: null` to keep raw scanner values out of the wire.
- `docs/MCP_STDIO_DESIGN.md` documents the intended `Console.In` / `Console.Out` JSON-RPC behavior, the lifecycle (initialize → tools/list → tools/call → notifications/initialized → exit), the safety boundary (no network, no telemetry, no shell exec, repo-relative path allow-list), and exit codes (`0` clean, `2` invalid invocation, `3` scanner/internal error).
- The local environment cannot reach a live MCP host (DIAG-001), so any verification must run as a self-driven subprocess piped through `Console.In`/`Console.Out` or as deterministic unit tests with `StringReader`/`StringWriter` fakes. Live MCP integration is out of scope for this task.
- 315/315 tests are green on `master` at `280b1a4`. The TASK-0188 cumulative suite target is 330+.

## Evidence
- `docs/MCP_STDIO_DESIGN.md` — design source of truth.
- `src/AgentContextKit.Core/Mcp/McpContracts.cs`, `McpRouter.cs` — current prototype.
- `tests/AgentContextKit.Tests/McpRouterTests.cs` — current 7 tests.
- `src/AgentContextKit.Cli/Program.cs` — current `RunMcp` stub (around `RunMcp`/`NormalizeMcpOutputPath`).
- `docs/PROJECT-CONTROL-0110-mcp-step-2-watch-mode-local-hardening.md` — parent control.

## Scope
- Add a Core stdio transport abstraction that:
  - Accepts a `TextReader`/`TextWriter` pair (testable) plus a default `Console.In`/`Console.Out` path.
  - Reads line-delimited JSON-RPC 2.0 messages with a fixed maximum line size (1 MiB) and a per-request bounded timeout (30s).
  - Routes each request through the existing `McpRouter` (string-in/string-out contract is preserved).
  - Writes a single-line JSON-RPC response per request, with `AutoFlush = true`.
  - Treats EOF and `notifications/exit` as a clean shutdown (exit code `0`).
  - Returns JSON-RPC `-32700` for parse errors, `-32600` for invalid requests, `-32601` for unknown methods, `-32602` for invalid params, `-32603` for internal errors, never crashing the loop on a single bad message.
  - Logs diagnostics to an injected `TextWriter` (default `Console.Error`) and never writes diagnostics to `Console.Out`.
  - Validates `repoPath` exactly as `McpRouter` already does (URL/`file:`/UNC rejected, traversal rejected, must be an existing local directory) and never echoes absolute paths in error responses.
  - Re-emits findings with `match: null` (the existing Core behavior is already this; step 2 adds a per-response structural check and explicit privacy tests).
- Add a CLI integration that:
  - Keeps the existing `--stdio <json-request>` flag for backward compatibility and tests.
  - Adds an `--stdio-server` flag (no argument) that activates the real loop. Without `--stdio-server` or `--stdio`, the command prints help and exits `0`.
  - Honors `--lang en|tr` and `--repo <path>` for the default `repoPath` resolution.
  - Sets `Console.Out` `AutoFlush = true` before the loop starts and never writes a banner, version line, or welcome message to `Console.Out`.
  - Sets `TextWriter`/STDIN/STDERR back to defaults on clean exit so a crashed earlier stream does not leak into the next command.
- Tests (in `tests/AgentContextKit.Tests/McpStdioTransportTests.cs`):
  - `Initialize` returns the expected `serverInfo` and `capabilities`.
  - `tools/list` returns exactly the four tools in documented order.
  - `tools/call ackit.health` against a real local repo returns a structured doctor summary.
  - `tools/call ackit.scan` against a real local repo returns a non-empty summary.
  - `tools/call ackit.findings` filters by `minSeverity`.
  - `tools/call ackit.context` returns a write-free preview.
  - `tools/call` with an unknown tool returns `-32602`.
  - `tools/call` with an invalid `repoPath` (URL/`file:`/UNC) returns `-32602`, does not crash, and the loop continues with the next request.
  - Unknown JSON-RPC method returns `-32601 Method not found`.
  - Malformed JSON returns `-32700 Parse error` and the loop continues.
  - An oversized input line returns a JSON-RPC error and the loop continues.
  - `notifications/initialized` is accepted silently.
  - `notifications/exit` cleanly closes the loop with `ExitSuccess`.
  - Multiple sequential requests in a single loop are answered in order, in a single stdout line per request.
  - `stdout` never contains a banner, version string, or any non-JSON-RPC text.
  - `stderr` may contain diagnostic text, but no diagnostic text is ever written to `stdout`.
  - A synthetic secret-bearing fixture never has its raw value appear in any stdout response.
  - Absolute local paths do not appear in any stdout response.
  - Cancellation/timeout via injected `CancellationToken` cancels the read loop and exits `0`.
  - `notifications/shutdown` is treated as a clean exit (alias of `notifications/exit`).

## Out of Scope
- HTTP, SSE, or streamable HTTP transport.
- Authentication, authorization, multi-tenant routing, rate limiting, quotas.
- Process spawn of any external MCP client/host.
- Auto-fix, auto-redaction, or any source mutation. The `redact-check` command behavior remains report-only.
- Removing or replacing the existing `--stdio <json-request>` stub. The stub remains for backward compatibility and direct unit testing.
- `ackit.rules` MCP tool — that is TASK-0192.
- `ackit watch` local implementation — TASK-0189.
- Any new global CLI flag other than `--stdio-server` and any new MCP method other than the lifecycle methods already documented.

## Impact Review
- DB impact: none; no database, migration, schema, or persisted state change.
- Admin impact: none; no admin UI or privileged action surface is added.
- Permission impact: none; the server still does not authenticate, authorize, or call remote endpoints.
- SEO/i18n impact: no SEO impact; the new `--lang` resolution is identical to the existing CLI and `McpRouter` already supports `lang`.
- Audit/security impact: tool responses are passed through the existing Core sanitization (no raw match, no absolute path); diagnostics are routed to `Console.Error`; oversized input and parse errors are returned as JSON-RPC errors, never throwing. Privacy posture is identical to SARIF output.

## Affected Files
- `src/AgentContextKit.Core/Mcp/McpRouter.cs` — add per-tool sanitize assertion and the unknown-method parity for `-32601` (currently returns `-32601` already; covered by tests).
- `src/AgentContextKit.Core/Mcp/McpStdioTransport.cs` — new; transport interface, default implementation, and `TextReader`/`TextWriter`/`CancellationToken` injection points.
- `src/AgentContextKit.Cli/Program.cs` — extend `RunMcp` for `--stdio-server` with `Console.In`/`Console.Out`; keep `--stdio <json-request>` backward compatible; add `mcp --help` text mentioning step 2.
- `tests/AgentContextKit.Tests/McpStdioTransportTests.cs` — new; at least 14 tests covering the bullets above.
- `docs/MCP_STDIO_DESIGN.md` — append "Implementation Plan: Step 2" section that documents the real loop, safety bounds, error surface, sanitization, and lifecycle handling.
- `docs/CLI_REFERENCE.md` — update the `ackit mcp` section to describe the real `--stdio-server` mode while keeping the legacy `--stdio <json-request>` documented as a one-shot test seam.
- `docs/NEXT_TASKS.md` — note TASK-0188 planning commit only in the `Active PROJECT-CONTROL-0110` block after the implementation commit lands.

## Implementation Steps
1. Planning commit (this file).
2. Add `McpStdioTransport` in `src/AgentContextKit.Core/Mcp/` with constructor injection of `TextReader`, `TextWriter`, `TextWriter? diagnosticWriter`, `IMcpServer`, `McpStdioOptions`, and a default factory `Create(IMcpServer server)`.
3. Extend `McpRouter` only if needed; confirm that `match: null` is already returned by every tool result and that `parse error`/`unknown method` already use `-32700` and `-32601` respectively. Add a small per-response invariant test that the tool result never contains a non-null `match`.
4. Extend `RunMcp` in `src/AgentContextKit.Cli/Program.cs` to dispatch:
   - `--help` / `-h` → print updated help (real loop + legacy one-shot) and exit `0`.
   - `--stdio-server` → start the real loop reading `Console.In` and writing `Console.Out`.
   - `--stdio <json-request>` → existing one-shot behavior (kept for backward compatibility and existing tests).
5. Add the new test file with at least 14 tests. Use `StringReader`/`StringWriter` fakes and a fake `IMcpServer` where helpful, but exercise the real `McpRouter` for at least four of them (initialize, tools/list, ackit.health, ackit.scan) to keep end-to-end coverage.
6. Add a subprocess smoke helper that pipes a one-line `initialize` request into the real `ackit mcp --stdio-server` binary and asserts the response is a single line of valid JSON-RPC containing `protocolVersion`. This is for manual verification; it is documented but not run from CI in this task.
7. Append "Implementation Plan: Step 2" to `docs/MCP_STDIO_DESIGN.md`.
8. Update `docs/CLI_REFERENCE.md` `ackit mcp` section.
9. Run the validation gates listed below.
10. Commit and push.

## Security/Privacy Boundary
- No network. No telemetry. No external tool call. No child process spawn.
- `Console.Out` writes only one JSON-RPC response per request line. No banner, no version, no help, no diagnostic.
- `Console.Error` receives all logs and exception messages. Exception messages are sanitized — never include the raw exception `ToString()`, only a short reason and the path/message the router produced.
- `repoPath` is validated exactly as today: must be a real local directory, no `://`, no `file:`, no UNC `\\`, no leading `//`. Traversal `..` segments and absolute-path echoes are rejected with a JSON-RPC `-32602` whose `message` is a generic "Invalid params: repoPath must point to an existing local directory." The exception `Message` value never contains the supplied path.
- Tool responses keep `match: null`. Findings paths are repository-relative (the scanner already returns repository-relative paths).
- `match`-bearing `ackit.findings` responses must not contain the synthetic secret text introduced by the new test fixture. The fixture writes a low-entropy fake marker into a temporary file; the test asserts the marker never appears in any stdout line.
- Cancellation/timeout: a `CancellationToken` is plumbed through the read loop; on cancel, the loop exits with `0` and a short stderr note. The `CancellationToken` is honored by the inner `ReadLineAsync` and the response write; no half-written stdout line is left behind.

## Backward Compatibility
- `ackit mcp --stdio <json-request>` keeps its existing behavior (one-shot JSON-RPC round-trip).
- `ackit mcp --stdio-server` is the new long-lived mode. The default `ackit mcp` invocation (no flags) prints help and exits `0`; this is a documentation-visible behavior change but not a runtime regression for callers who passed an explicit flag.
- The Core `IMcpServer` contract is unchanged.

## Acceptance Criteria
- `McpStdioTransport` is implemented in `src/AgentContextKit.Core/Mcp/`, accepts injected streams, and never throws uncaught exceptions from inside the loop.
- `ackit mcp --stdio-server` reads `Console.In` and writes `Console.Out`; verified by the manual PowerShell smoke in this file.
- All new tests pass; total test count is at least 330 (315 baseline + 15+ new). Every test that already existed remains green.
- `dotnet build AgentContextKit.sln -c Release --no-restore` is clean (0 warnings, 0 errors).
- `ackit scan --ci` exits `0`; `ackit doctor` is 13/13 PASS.
- No raw match text or absolute path text appears in any stdout response in any test.
- No `Console.Out` text is written outside of the JSON-RPC response line.
- `ackit mcp --help` mentions both `--stdio <json-request>` and `--stdio-server` and the new error surface.
- `MCP_STDIO_DESIGN.md` has a "Step 2" section that documents the implementation.

## Tests
- `tests/AgentContextKit.Tests/McpStdioTransportTests.cs` (new; at least 15 tests).

## Validation
- `dotnet restore AgentContextKit.sln` — passed.
- `dotnet build AgentContextKit.sln -c Release --no-restore` — 0 warnings, 0 errors.
- `dotnet test AgentContextKit.sln -c Release --no-build` — at least 330/330 passed.
- `dotnet run --project src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- mcp --help` — exit 0, prints updated help.
- `dotnet run --project src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- mcp --stdio '{"jsonrpc":"2.0","id":"1","method":"initialize","params":{}}'` — backward-compatible one-shot still works.
- `dotnet run --project src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- scan --ci` — exit 0.
- `dotnet run --project src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- doctor` — 13/13 PASS.
- Manual stdio server smoke (PowerShell):
  ```powershell
  $req = '{"jsonrpc":"2.0","id":"1","method":"initialize","params":{}}'
  $resp = $req | dotnet run --project src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- mcp --stdio-server
  $resp | Should -Match '"protocolVersion":"2024-11-05"'
  ```
- `powershell -ExecutionPolicy Bypass -File scripts/check-cli-contract.ps1 -FailOnIssues` — pass.
- `powershell -ExecutionPolicy Bypass -File scripts/check-localization-parity.ps1 -FailOnIssues` — pass.
- `powershell -ExecutionPolicy Bypass -File scripts/check-tracked-vs-untracked-md.ps1 -FailOnIssues` — pass (run after staging/commit).
- `git diff --check` — clean.
- `git status` — clean after commit/push; `master` aligned with `origin/master`.

## Rollback
Single `git revert <sha>`. No other task depends on TASK-0188.

## Completion Evidence
- Planning commit: `ea2f681` (`docs: plan mcp stdio transport step 2`).
- Implementation commit: `6eb7102` (`feat(mcp): add real stdio transport loop`).
- Test count: 345/345 (315 baseline + 30 new). All McpStdioTransportTests pass; existing McpRouterTests still pass after the absolute-path sanitizer change.
- Source `scan --ci` exit 0 with existing `.remember` Medium log findings only; no new findings.
- `ackit doctor` 13/13 PASS.
- `ackit mcp --help`, `ackit mcp --stdio-server`, and the legacy `ackit mcp --stdio <json-request>` all return exit 0.
- Manual stdio server smoke (PowerShell pipe into `dotnet run -- mcp --stdio-server`) returned valid `initialize`, `tools/list`, and `ping` responses in order and exited 0 on `notifications/exit`.
- `scripts/check-cli-contract.ps1 -FailOnIssues`, `scripts/check-localization-parity.ps1 -FailOnIssues`, and `scripts/check-tracked-vs-untracked-md.ps1 -FailOnIssues` return exit 0 in this environment. The git stderr warning about an unreadable directory is pre-existing on this Windows host (transient `8037~1` short-name entries); the cleanup did not surface any contract content gap.
- DIAG-001 (broken `mcp__plugin_*` transport in this environment) is independent of the local stdio loop; this task does not close DIAG-001 and does not claim to.
- Local risk: no Critical/High findings in source `scan --ci`; existing `.remember` Medium log findings remain.
- DIAG-001 (broken `mcp__plugin_*` transport in this environment) is independent of the local stdio loop; this task does not close DIAG-001 and does not claim to.

## Push
- `git push origin master` only.

## Out-of-band Notes
- The product vision of `redact-check` as report-only is preserved. No auto-fix, no diff suggestion, no `--apply` flag is added in this task or any future task in PROJECT-CONTROL-0110. The next-step docs/tasks/responses must reflect this.
- The "Implementation Plan: Step 2" section in `docs/MCP_STDIO_DESIGN.md` must restate the privacy boundary (no raw match, no absolute path) and the lifecycle handling (EOF and `notifications/exit`/`shutdown` exit 0).
