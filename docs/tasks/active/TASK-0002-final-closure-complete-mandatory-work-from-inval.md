---
id: "TASK-0002"
title: "Final closure: complete mandatory work from invalid TASK-0001 closeout"
status: pending
schemaVersion: 2
dependencies:
  []
createdAt: "2026-08-24"
completedAt: null
---

## Purpose

Complete all mandatory work left unfinished by the invalid forced close of TASK-0001: CLI monolith split into cohesive modules and pack JSON semantic content parity.

## Scope

- Split src/cli/index.ts (~1800 lines) into cohesive command modules under src/cli/commands/
- Implement pack JSON semantic content parity (included file content + context sections in JSON output)
- Verify MCP behavioral cancellation (not just signal passing)
- Expand installed-tarball E2E to cover full CLI+MCP battery
- Documentation truthfulness sweep

## Out of scope

- npm publish, tag creation, GitHub Release
- New provider adapters without verified official docs
- LLM/vector DB/RAG features

## Affected files

- src/cli/index.ts, src/cli/commands/*.ts
- src/core/context/pack.ts
- src/mcp/server.ts
- scripts/package-smoke.mjs
- docs/reference/cli.md

## Requirement IDs

REQ-DX-002, REQ-CTX-001, REQ-MCP-001..004, REQ-API-001, REQ-PKG-001

## Acceptance criteria

- [ ] src/cli/index.ts reduced to minimal bootstrap (<200 lines)
- [ ] Command implementations in src/cli/commands/*.ts modules
- [ ] No giant orchestration file remains (>500 lines)
- [ ] Public CLI behavior preserved (all existing tests pass)
- [ ] Pack JSON includes context sections AND included file content
- [ ] Pack Markdown and JSON represent same semantic selection
- [ ] No secrets or absolute paths in pack JSON/markdown output
- [ ] Installed tarball E2E covers init/doctor/scan/task/pack/policy/MCP
- [ ] Full suite passes with no flaky release-critical failures
- [ ] Hosted CI green on exact final HEAD

## Test steps

1. Full vitest suite after each extraction step
2. Contract tests for CLI behavior preservation
3. Pack JSON/Markdown parity assertions
4. Installed tarball E2E via package-smoke.mjs
5. Full local verification sequence
6. Push and verify hosted CI on exact final SHA

## Risks

- Import path errors during module extraction → caught by typecheck
- Behavioral regressions → caught by existing 267-test suite
- Circular dependencies → prevented by one-way imports from commands to core

## Rollback plan

Focused commit revert per extraction step.

## Completion notes

(placeholder)
