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
- Tests: at least 6 covering initialize, list tools, call each of the four tools, and an unknown tool error path.

## Out of Scope
- Real stdio piping (read from `Console.In`, write to `Console.Out`).
- Process spawn.
- HTTP transport, SSE, or streamable HTTP.
- Authentication, authorization, rate limiting, or multi-tenant routing.

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
5. Add 6 tests:
   - Initialize returns the expected `serverInfo` and capabilities.
   - ListTools returns exactly the four tools in the documented order.
   - CallTool `ackit.scan` returns a non-empty summary.
   - CallTool `ackit.findings` with min severity filter returns the expected subset.
   - CallTool `ackit.context` with target `codex` returns a non-empty prompt fragment.
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
- 6 new tests pass; total >= 282.

## Tests
- McpRouterTests (6 new).
- Existing tests stay green.

## Validation
- `dotnet build` — 0 errors.
- `dotnet test` — 282+ / 0 / 0.
- `ackit scan --ci` — exit 0.
- `ackit doctor` — 14/14 PASS.
- `scripts/verify-release.ps1` — pass.
- `scripts/check-tracked-vs-untracked-md.ps1 -FailOnIssues` — clean.
- `git status` — clean.

## Rollback
Single `git revert <sha>`. No other task depends on TASK-0178.

## Completion Evidence
- File list: above.
- Commit hash(es): planning + implementation.
- Test count: 282+.

## Push
- `git push origin master` only.

## Hosted Checks
- Local gates only; CI runs on push.
