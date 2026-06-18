# TASK-0178: MCP Transport Prototype (Core, No Process)

## Purpose
Implement the first concrete step of the MCP stdio transport described in `docs/MCP_STDIO_DESIGN.md`. The prototype lives entirely inside the `AgentContextKit.Core` library and a thin CLI subcommand stub. No child process is spawned; no real MCP wire traffic happens. The deliverable is a Core interface, a request/response record set, a deterministic router for the four initial tools (`ackit.scan`, `ackit.findings`, `ackit.context`, `ackit.health`), and unit tests.

## Current State
- `docs/MCP_STDIO_DESIGN.md` documents the protocol, tool set, and security boundary.
- No Core code exists for the transport; the design is text-only.
- DIAG-001 notes that the current MCP tool transport in this environment is broken, but that does not block local Core + unit-test development.

## Evidence
- `docs/MCP_STDIO_DESIGN.md` — design source of truth.
- `src/AgentContextKit.Core/Abstractions.cs` — already has `ILLMProvider`, `IRiskScanner`, etc., so the new types fit the same pattern.

## Scope
- Add Core records: `McpRequest`, `McpResponse`, `McpToolDefinition`, `McpServerInfo`, `McpCapabilities`.
- Add Core interface: `IMcpServer` with `Initialize`, `ListTools`, `CallTool`, and a `McpRouter` that wires the four tools to existing Core services.
- Add a CLI subcommand stub `ackit mcp` that, on `--stdio`, reads from a provided input string and writes to a provided output string (no real stdin/stdout). On `--help`, prints the design summary and exits 0.
- Tests: at least 7 covering initialize, list tools, call the four initial tools, and an unknown tool error path.

## Out of Scope
- Real stdio piping (read from `Console.In`, write to `Console.Out`).
- Process spawn.
- HTTP transport, SSE, or streamable HTTP.
- Authentication, authorization, rate limiting, or multi-tenant routing.

## Impact Review
- DB impact: none; no database, migration, schema, or persisted state change.
- Admin impact: none; no admin UI or privileged action surface is added.
- Permission impact: none; the prototype is explicit local CLI/Core routing only and does not add authentication, authorization, remote calls, or multi-tenant access.
- SEO/i18n impact: no SEO impact; user-facing docs and help are updated, and machine-readable JSON-RPC fields remain stable English technical identifiers.
- Audit/security impact: local-only, no process spawn, no real stdio loop, no network path, no automatic file export except explicit repo-relative `--output`; scan findings keep raw matches out of tool responses.

## Affected Files
- `src/AgentContextKit.Core/Mcp/McpContracts.cs` — new.
- `src/AgentContextKit.Core/Mcp/McpRouter.cs` — new.
- `src/AgentContextKit.Core/AgentContextKit.Core.csproj` — includes the new files automatically (default `Compile` glob).
- `src/AgentContextKit.Cli/Program.cs` — adds `RunMcp` subcommand.
- `tests/AgentContextKit.Tests/McpRouterTests.cs` — new.
- `docs/MCP_STDIO_DESIGN.md` — append "Implementation Plan: Step 1" section.

## Implementation Steps
1. Planning commit with this task file.
2. Add `McpContracts.cs` with records and the `IMcpServer` interface.
3. Add `McpRouter.cs` that depends on `IRepositoryScanner`, `IRiskScanner`, `IAgentInstructionGenerator`, and `IDoctor` (or the closest existing abstraction; doctor currently has `IDoctorCheck` and `RunDoctor`; for this task, use a small `IAckitHealthProbe` interface in the same file).
4. Add `RunMcp` in `Program.cs` with `--stdio <input> --output <output>` flags; the route logic is in Core.
5. Add 7 tests:
   - Initialize returns the expected `serverInfo` and capabilities.
   - ListTools returns exactly the four tools in the documented order.
   - CallTool `ackit.scan` returns a non-empty summary.
   - CallTool `ackit.findings` with min severity filter returns the expected subset.
   - CallTool `ackit.context` with target `codex` returns a non-empty prompt fragment.
   - CallTool `ackit.health` returns a structured doctor snapshot.
   - CallTool of an unknown tool returns `-32602 Invalid params`.
6. Update `docs/MCP_STDIO_DESIGN.md` with "Implementation Plan: Step 1".
7. Implementation commit.
8. Run gates.
9. Push.

## Security/Privacy Boundary
- The router must reject any `repoPath` argument that is not a real local directory; the existing scanner validates this.
- Tool responses are redaction-passed by the same Core redaction rules used by SARIF output.
- No file content beyond redaction-passed values leaves the Core.
- No network code is introduced.

## Backward Compatibility
- New Core types are additive.
- New CLI subcommand is gated behind explicit `ackit mcp ...` invocation; default `ackit` behavior is unchanged.

## Acceptance Criteria
- All four tools can be invoked through `IMcpServer` and return deterministic, redaction-passed results.
- Unknown tools return a JSON-RPC `-32602` error.
- 7 new tests pass; total >= 283.

## Tests
- McpRouterTests (7 new).
- Existing tests stay green.

## Validation
- `dotnet restore AgentContextKit.sln` — passed.
- `dotnet build AgentContextKit.sln -c Release --no-restore` — 0 warnings, 0 errors.
- `dotnet test tests/AgentContextKit.Tests/AgentContextKit.Tests.csproj -c Release --no-build --filter "FullyQualifiedName~McpRouterTests"` — 7/7 passed.
- `dotnet test AgentContextKit.sln -c Release --no-build` — 283/283 passed.
- `dotnet run --project src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- mcp --help` — passed.
- `dotnet run --project src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- scan --ci` — exit 0; existing `.remember` Medium log findings only.
- `dotnet run --project src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- doctor` — 13/13 PASS.
- `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/check-cli-contract.ps1 -FailOnIssues` — passed.
- `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/check-localization-parity.ps1 -FailOnIssues` — passed.
- `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-release.ps1` — passed; dirty-tree blocker was expected before commit.
- `scripts/check-tracked-vs-untracked-md.ps1 -FailOnIssues` — run after staging/commit.
- `git status` — clean after commit/push.

## Rollback
Single `git revert <sha>`. No other task depends on TASK-0178.

## Completion Evidence
- File list: above.
- Commit hash(es): pending implementation commit.
- Test count: 283/283.
- Local risk: no Critical/High findings in source `scan --ci`; existing `.remember` Medium log findings remain.

## Push
- `git push origin master` only.

## Hosted Checks
- Local gates only; CI runs on push.
