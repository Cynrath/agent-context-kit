# TASK-0192: MCP `ackit.rules` Read-Only Metadata Tool

## Purpose
Extend the MCP tool surface with a read-only `ackit.rules` tool that returns a stable snapshot of the current `RiskRuleCatalog`. The tool exposes rule IDs, names, categories, default severities, and human-readable descriptions plus recommendations, but never returns raw scanner matches, absolute paths, or any file content. This gives agent clients a way to learn the catalog schema before invoking `ackit.findings` or `ackit.scan`.

This is the fifth task in PROJECT-CONTROL-0110.

## Current State
- TASK-0178 introduced the Core `McpRouter` with four tools (`ackit.scan`, `ackit.findings`, `ackit.context`, `ackit.health`).
- TASK-0188 advanced the prototype to a real local stdio transport with safety bounds.
- `RiskRuleCatalog` lives in `src/AgentContextKit.Core/Models.cs` and is the canonical source of truth for rule IDs and severities.
- 422/422 tests are green. The TASK-0192 cumulative suite target is 435+.

## Evidence
- `src/AgentContextKit.Core/Models.cs` — `RiskRule` record and `RiskRuleCatalog` static class with stable IDs (`ACKIT001` through `ACKIT008` and `ACKIT999`).
- `src/AgentContextKit.Core/Mcp/McpRouter.cs` — current four-tool router.
- `docs/MCP_STDIO_DESIGN.md` — tool contract and JSON-RPC surface.

## Scope
- Add a new tool `ackit.rules` to the MCP router. It is purely read-only and does not accept any arguments (the catalog is the same for every repository).
- The tool response is a JSON-RPC success with a `tools/call` result that contains:
  - `rules`: an array of `{ id, name, category, defaultSeverity, description, recommendation }` ordered by `id` ascending.
  - `count`: integer count of rules (matches `rules.length`).
  - `version`: the running CLI `AssemblyInformationalVersion` (matches `serverInfo.version` from `initialize`).
- The `IMcpServer` interface gains an explicit `ListRules(McpRequest)` method. `McpRouter` returns `Success(id, ToolResult(text, dto))` where `text` is a one-line English summary and `dto` is the structured payload.
- Update `McpRouter.Tools` to include `ackit.rules` between `ackit.context` and `ackit.health` so the documented order remains stable.
- Update `McpRouter.CallTool` to dispatch `ackit.rules` to the new helper.
- The tool must not accept a `repoPath` argument; if any argument is supplied it is ignored (the catalog is global).
- Tests:
  - `ackit.rules` returns the documented rules in ascending ID order.
  - Each rule contains all six fields and `defaultSeverity` is a valid `RiskSeverity` enum value.
  - The `version` field equals the server version string passed to the router.
  - Calling `ackit.rules` twice returns structurally equal results.
  - `ackit.rules` is reachable through the real `McpStdioTransport` (one end-to-end test).
  - `ackit.rules` ignores any supplied `arguments` without raising.

## Out of Scope
- New risk rule additions or catalog edits.
- Cross-repository catalog overrides.
- Filtering or paging; the catalog is small and always returned in full.
- Sensitive data: the tool must never include rule examples, raw matches, file paths, or fingerprints.

## Impact Review
- DB impact: none.
- Admin impact: none.
- Permission impact: none.
- SEO/i18n impact: none.
- Audit/security impact: the tool is read-only metadata. The output is stable and contains no user data, no paths, and no matches. The response payload is bounded by the catalog size (currently nine rules).

## Affected Files
- `src/AgentContextKit.Core/Mcp/McpRouter.cs` — add `ListRules` method, `ackit.rules` entry in `Tools`, dispatch in `CallTool`.
- `tests/AgentContextKit.Tests/McpRouterTests.cs` — add new tests.
- `tests/AgentContextKit.Tests/McpStdioTransportTests.cs` — add one end-to-end test through the transport.
- `docs/MCP_STDIO_DESIGN.md` — update the tool table and Step 2 surface to include `ackit.rules`.
- `docs/CLI_REFERENCE.md` — update the `ackit mcp` section to mention `ackit.rules`.

## Implementation Steps
1. Planning commit (this file).
2. Add `ListRules` to `McpRouter` and update `Tools` and `CallTool`.
3. Add tests in `McpRouterTests` (rule list shape, ordering, version field, no-arg tolerance).
4. Add one test in `McpStdioTransportTests` (transport-level reachability).
5. Update `docs/MCP_STDIO_DESIGN.md` tool table.
6. Update `docs/CLI_REFERENCE.md` `ackit mcp` block.
7. Run validation gates.
8. Implementation commit and push.

## Acceptance Criteria
- `ackit.rules` is listed by `tools/list` immediately after `ackit.context` and before `ackit.health`.
- `tools/call` with `name=ackit.rules` returns a structured payload that contains every catalog entry in ascending `id` order.
- All MCP responses keep the existing privacy posture (no raw match, no absolute path).
- The new tests pass; cumulative suite is at least 435/435.

## Tests
- 5 new tests in `McpRouterTests.cs`.
- 1 new test in `McpStdioTransportTests.cs`.

## Validation
- `dotnet build AgentContextKit.sln -c Release --no-restore` — 0 warnings, 0 errors.
- `dotnet test AgentContextKit.sln -c Release --no-build` — at least 435/435 passed.
- `dotnet run --project src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- mcp --help` — exits 0.

## Rollback
Single `git revert <sha>`. No other task depends on TASK-0192.

## Completion Evidence
- Planning commit: `2effa0f` (`docs: plan task 0192 ackit.rules metadata tool`).
- Implementation commit: `02a89a2` (`feat(mcp): add ackit.rules metadata tool`).
- Test count: 428/428 (422 baseline + 6 new tests across McpRouterTests and McpStdioTransportTests).
- Source `scan --ci` exit 0 with existing `.remember` Medium log findings only; no new findings.
- `ackit doctor` 13/13 PASS.
- `ackit mcp --help` exits 0 with the documented surface; `tools/list` returns the five tools in the documented order; `tools/call` with `name=ackit.rules` returns the catalog snapshot.

## Push
- `git push origin master` only.
