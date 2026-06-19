# TASK-0194: Docs Update — MCP Step 2, WATCH_MODE Notes, CLI_REFERENCE

## Purpose
Verify and finalize the docs that PROJECT-CONTROL-0110 called out for update:
- `docs/MCP_STDIO_DESIGN.md` already has a "Step 2" implementation section added in TASK-0188 and was extended in TASK-0192 with the `ackit.rules` row. Confirm both sections are present, accurate, and reference the correct behavior.
- `docs/WATCH_MODE.md` already has an "Implementation Plan: Step 1" section added in TASK-0189. Confirm the section accurately documents the implementation choices.
- `docs/CLI_REFERENCE.md` already documents `ackit mcp` (Step 2 surface), `ackit watch`, and the watch command in TASK-0189. Confirm the entries are accurate.
- `docs/NEXT_TASKS.md` should reflect TASK-0188 through TASK-0193 completion. Add a state-sync note once TASK-0195 lands.

This is the seventh task in PROJECT-CONTROL-0110. Most of the docs were updated inline with TASK-0188, TASK-0189, TASK-0192, and TASK-0193; the remaining work is verification, a few surgical corrections, and a single small clarifying paragraph on the watch command's `--json` behavior introduced by TASK-0193.

## Current State
- `master` is at `292accc` (TASK-0193 evidence commit). 428/428 tests are green.
- TASK-0188 added "Implementation Plan: Step 2" to `docs/MCP_STDIO_DESIGN.md`.
- TASK-0189 added "Implementation Plan: Step 1" to `docs/WATCH_MODE.md`.
- TASK-0189 added the `ackit watch` block to `docs/CLI_REFERENCE.md`.
- TASK-0188 added the Step 2 `ackit mcp` block to `docs/CLI_REFERENCE.md`.
- TASK-0192 added the `ackit.rules` row to the tool table in `docs/MCP_STDIO_DESIGN.md`.
- TASK-0191 added TextTrimmer to Core but did not add a new docs section.
- TASK-0193 routed the watch startup message to `Console.Error` in `--json` mode. This is a behavior change that the docs do not yet call out.

## Evidence
- `docs/MCP_STDIO_DESIGN.md`
- `docs/WATCH_MODE.md`
- `docs/CLI_REFERENCE.md`
- `docs/NEXT_TASKS.md`

## Scope
- Re-read each of the four docs against the current code paths and confirm accuracy. No structural rewrites.
- Add a small clarifying paragraph to the `ackit watch` block in `docs/CLI_REFERENCE.md` documenting that the startup message goes to `Console.Error` when `--json` is set, so JSON consumers can parse `Console.Out` cleanly.
- Confirm the `docs/MCP_STDIO_DESIGN.md` tool table includes the `ackit.rules` row added in TASK-0192.
- Confirm the `docs/CLI_REFERENCE.md` `ackit mcp` section mentions the five tools (`ackit.scan`, `ackit.findings`, `ackit.context`, `ackit.rules`, `ackit.health`).
- Confirm the `docs/WATCH_MODE.md` Step 1 section matches the implemented Core types and the CLI dispatch.

## Out of Scope
- Architectural rewrites of the docs.
- New sections beyond the small clarifying paragraph.
- Translation work — covered by TASK-0193.
- Adding docs for the `McpStdioTransport` lifecycle in code comments (already covered inline).
- Updating hosted-check docs (`docs/HOSTED_CHECKS.md`) — that file is for hosted CI, not affected by TASK-0110.

## Impact Review
- DB impact: none.
- Admin impact: none.
- Permission impact: none.
- SEO/i18n impact: none; English documentation surface unchanged in shape.
- Audit/security impact: none.

## Affected Files
- `docs/CLI_REFERENCE.md` — add a small paragraph clarifying the watch `--json` stderr behavior.
- `docs/NEXT_TASKS.md` — leave for TASK-0195 (state sync); no change here.

## Implementation Steps
1. Planning commit (this file).
2. Re-read each doc and confirm accuracy against the current code paths.
3. Apply the small `ackit watch --json` paragraph in `CLI_REFERENCE.md`.
4. Run validation gates.
5. Implementation commit and push.

## Acceptance Criteria
- All four docs reflect the current code paths without contradictory statements.
- `dotnet test AgentContextKit.sln -c Release --no-build` still reports 428/428 green.
- `dotnet run --project src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- mcp --help` exits 0.
- `dotnet run --project src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- watch --help` exits 0.

## Tests
- No new tests. Verification is by reading and by running the existing gates.

## Validation
- `dotnet build AgentContextKit.sln -c Release --no-restore` — 0 warnings, 0 errors.
- `dotnet test AgentContextKit.sln -c Release --no-build` — 428/428 passed.

## Rollback
Single `git revert <sha>`. No other task depends on TASK-0194.

## Completion Evidence
- Planning commit: `9771253` (`docs: plan task 0194 docs update`).
- Implementation commit: `d20a908` (`docs: clarify ack-it watch --json stderr routing`).
- Test count: 428/428 unchanged.
- `ackit scan --ci` exit 0; `ackit doctor` 13/13 PASS; `ackit mcp --help` exits 0; `ackit watch --help` exits 0.

## Push
- `git push origin master` only.
