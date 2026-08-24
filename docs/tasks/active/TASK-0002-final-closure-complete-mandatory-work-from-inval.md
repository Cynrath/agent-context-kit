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

'ROUND-2 CLOSURE STATUS:

COMPLETED in this session:
- Pack binary bypass fixed (P0): canonical classifier + catalog secret gate (commit 194d84b)
- Pack divergent secret detection replaced with canonical rules (P0) (commit 194d84b)
- Policy extends root escape contained (P0): realpath + isInsideRoot + POL-ROOT-ESCAPE (commit 194d84b)
- Policy scope semantics implemented: org/repo/pathScopes with table-driven tests (commit 194d84b)
- MCP root confinement: no root parameter, server constructed with single canonical root (commit a5f9510)
- MCP scan parity: executeConfiguredScan shared between CLI and MCP (commit a5f9510)
- Incremental empty-set bug: defined-but-empty filterPaths = zero-target scan (commit fb60184)
- Bare ackit real health summary: fake || true removed (commit fb60184)
- Skills discover/scaffold/sync/doctor commands added (commit fb60184)
- Package smoke behavioral rewrite with full command battery (commit f664115)
- Cache hot path integrated into scanner pipeline with await cacheSet (commit 2aa15ba)
- Policy forbiddenPatterns + enabled:false wired into active rule plan (commit 0d35c27)

NOT COMPLETED (requires dedicated focused session):
- CLI monolith split: ~1822-line index.ts has deep cross-dependencies between buildProgram and all run*Command functions. Multiple extraction attempts revealed that each function references core modules AND shared helpers defined in the same file. A safe split requires planning the dependency graph first and extracting in dependency order.
- Pack JSON semantic content: renderJson now accepts sections+files params but contextSections are only populated by MCP pack tool, not CLI pack command.
- MCP behavioral cancellation test: signal is propagated but no test starts a long operation, cancels it mid-flight, and verifies abort + server health.

Evidence: 54 files / 270 tests PASS · typecheck=0 · build=0 · self-scan --ci exit 0 · CI run 32733300227 10/10 green at fd95335'
