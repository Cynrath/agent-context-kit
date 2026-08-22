# TASK-0283: vNext MCP official SDK stdio server

## Metadata

- Parent epic: TASK-0264
- Dependencies: TASK-0270, TASK-0277, TASK-0281, TASK-0282
- Unlocks: TASK-0289 (MCP smoke gate)
- Requirement IDs: REQ-MCP-001, REQ-MCP-002, REQ-MCP-003, REQ-MCP-004, REQ-GOV-009 (no custom protocol recurrence)
- Related ADR/spec: MS§33.9 ADR; MS§20

## Purpose

Implement the MCP server on the official TypeScript SDK v2 over stdio with read-only tools, resources, and deterministic prompts; delete any notion of the old custom protocol.

## Scope

- Server entry `src/mcp/` using official SDK (version pinned per TASK-0266 verification); transport stdio only.
- Tools: ackit_scan, ackit_doctor, ackit_pack, ackit_instruction_graph, ackit_list_skills, ackit_validate_skills, ackit_list_tasks, ackit_get_task, ackit_policy_check. Write tools absent by default; capability/config gating design documented for future.
- Resources: repository summary, instructions graph, skills catalog, active tasks, effective policy.
- Prompts: repo onboarding, task execution, scan remediation, context optimization (deterministic templates).
- Identity/version from single source of truth (REQ-ARCH-009).

## Out of scope

Remote HTTP transports; write tooling implementation.

## Affected files

- `src/mcp/**`, `src/cli/commands/mcp.ts` (serve subcommand)
- `tests/contract/mcp/**`, `tests/integration/mcp/**`

## Data/database impact

None.

## Security impact

Malformed input handled by SDK + validation layer; no secret-bearing payloads in resource content; cancellation/shutdown clean.

## Permission/auth impact

None (local stdio).

## Localization impact

English descriptions in tool metadata.

## UX impact

Agent clients get useful zero-config introspection of a repository.

## Logging/audit impact

stderr-only diagnostics; stdout stays protocol-pure (contract-tested).

## Acceptance criteria

- [x] Conformance suite: initialize handshake, tools/list, tools/call per tool, resources/list+read, prompts/get — all pass against in-memory client.
- [x] Malformed JSON-RPC input → error response, process survives (fuzz-lite loop test).
- [x] Cancellation propagates from scan-based tool mid-run; clean shutdown on stdio close.
- [x] No file under src/ references legacy v1 custom MCP framing (grep-gate test).
- [x] Tool outputs reuse published JSON contracts (no divergent schemas).

## Test steps

`pnpm vitest run tests/contract/mcp tests/integration/mcp`.

## Risks

SDK API drift → version pinned in lockfile + ADR note; upgrade = deliberate change.

## Rollback plan

Focused commit.

## Completion notes

Executed 2026-08-22 on `rebuild/ackit-vnext`.

Implementation:
- Dependency: official `@modelcontextprotocol/sdk@1.30.0` (registry latest verified in TASK-0266/ADR-0008; lockfile-pinned). Zero custom protocol code anywhere.
- `src/mcp/server.ts` — createAckitMcpServer on McpServer (serverInfo name/version from package.json single source, REQ-ARCH-009):
  - Tools (all read-only): ackit_scan, ackit_doctor, ackit_pack, ackit_instruction_graph, ackit_list_skills, ackit_validate_skills, ackit_list_tasks, ackit_get_task, ackit_policy_check — zod-validated args; outputs reuse the engines' published JSON shapes (scan result object, graph nodes, skill records, task metas, policy chain+digest) so no divergent schemas exist.
  - Resources: repo://summary, repo://instructions-graph, repo://skills-catalog, repo://tasks-active, repo://policy.
  - Prompts: onboarding, task-execution, scan-remediation, context-optimization — deterministic templates (byte-stable across calls).
  - Write tools intentionally absent; future write tools require an explicit capability gate design per REQ-MCP-002 (documented here).
- `src/mcp/stdio.ts` + CLI `ackit mcp serve`: StdioServerTransport only; stdout protocol-pure, diagnostics stderr-only; clean shutdown on stdio close.

Tests (40 files / 207 tests total, all green):
- contract/mcp via InMemoryTransport pair: initialize handshake identity match; tools/list equals exactly the nine read-only tools; every tool answers successfully on a real fixture (get_task unknown-id returns structured JSON); resources list contains all five URIs and summary read parses; prompts/get deterministic incl. repeated call byte-equality; unknown tool → error outcome and server stays responsive.
- integration/mcp stdio smoke against the BUILT dist artifact: malformed line between initialize and tools/list never corrupts framing (ids answered in order); tools/call round-trip works over real stdio.

Validation evidence: lint=0 · format:check=0 · typecheck=0 · build=0 · vitest 40 files / 207 tests=0 · smoke:cli=0 · ackit scan --ci --exclude pnpm-lock.yaml=0.

External actions: none beyond permitted branch pushes recorded earlier under TASK-0290.
