---
id: "TASK-0100"
title: "MCP schema documentation and CI hint parity"
status: active
schemaVersion: 2
dependencies:
  - "TASK-0099"
createdAt: "2026-11-17"
completedAt: null
---


## Purpose

Align the documented read-only MCP contract with actual schemas and give the
advertised `ackit_scan.ci` option CLI-compatible exit hint semantics.
Scoped edits/tests/commits/PRs are user-authorized (2026-11-17).

## Scope

- Confirmed: docs advertise removed `root` and `includeGlobs` arguments; `ci` is
  accepted but unused, so report-only scans hint failure as if CI was requested.
- Correct documentation without reopening root overrides or arbitrary file
  inclusion. Wire `ci` to the advisory exit hint while retaining report content.
- Add schema/documentation and real-fixture behavioral contracts.
- Startup inspection also confirmed that CLI `--root` is accepted globally but
  the MCP side-effect entry ignores it. Bind only the startup root through an
  explicit stdio serve function; preserve ACKIT_ROOT/cwd fallbacks and never add
  a per-tool root override. Verify precedence via real CLI stdio clients.

## Out of scope

- New tools, write capabilities, SDK upgrades, changed root/security boundaries,
  transport redesign and broader error-format changes.

## Affected files

- `src/mcp/server.ts`, `docs/reference/mcp.md`, MCP contract/integration tests.
- `src/mcp/stdio.ts`, CLI MCP registration and startup-root integration tests.

## Dependencies

TASK-0099. TASK-0101 follows this task.

## Required tests

- MCP conformance, stdio, cancellation, root-boundary and cross-surface tests;
  root lint/format/typecheck/build/full tests; offline and ACKit gates.

## Acceptance criteria

- [~] Docs list precisely the tool input properties; no per-call root or pack
  includeGlobs is reintroduced.
- [ ] Report-only scan hints 0, `ci: true` hints 1 only for unsuppressed findings
  at the configured threshold; clean/suppressed cases hint 0.
- [ ] Cancellation, stdio purity, root confinement and CLI/SDK/MCP parity pass.

## Test steps

1. Compare live `tools/list` schemas to the reference table in a contract test.
2. Call scan with default/false/true CI on real clean/breaching/suppressed fixtures.
3. Run MCP/security/parity subsets followed by the affected full gates.

## Security considerations

No network/write capability, data migration or permission change. The server
continues to bind a canonical root once at construction. The hint is advisory;
tool calls never terminate the server process.

## Risks

- Consumers relying on the incorrect default hint must request `ci: true`;
  document this patch correction. No argument removal from the actual API.

## Rollback plan

Forward corrective PR limited to MCP implementation/docs/tests; no tag changes.

## Completion notes

Plan allocated by repository CLI on 2026-11-17. No implementation yet.

Dependencies: TASK-0099
