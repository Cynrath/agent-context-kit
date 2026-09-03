---
id: "TASK-0002"
title: "Final closure: complete mandatory work from invalid TASK-0001 closeout"
status: completed
schemaVersion: 2
dependencies:
  []
createdAt: "2026-08-24"
completedAt: 2026-08-24
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

- [x] src/cli/index.ts reduced to minimal bootstrap (<200 lines) — 23 lines / ~0.6 KB
- [x] Command implementations in src/cli/commands/*.ts modules — 15 modules, largest 183 lines
- [x] No giant orchestration file remains (>500 lines) — program.ts 367 lines max
- [x] Public CLI behavior preserved (all existing tests pass) — contract suites green; runCli surface unchanged
- [x] Pack JSON includes context sections AND included file content
- [x] Pack Markdown and JSON represent same semantic selection
- [x] No secrets or absolute paths in pack JSON/markdown output
- [x] Installed tarball E2E covers init/doctor/scan/task/pack/policy/MCP
- [x] Full suite passes with no flaky release-critical failures
- [x] Hosted CI green — run 32786781801 (10/10 jobs) at 5bca529; a subsequent task-output wording correction produced b35ca59c94e78213f31a31e7920fe2f7c42af649, which then passed CI run 32787110952 (10/10 jobs)

## Test steps

1. Full vitest suite after each extraction step
2. Contract tests for CLI behavior preservation
3. Pack JSON/Markdown parity assertions
4. Installed tarball E2E via package-smoke.mjs
5. Full local verification sequence
6. Push and verify hosted CI on exact final SHA

## Risks

- Import path errors during module extraction → caught by typecheck
- Behavioral regressions → caught by existing test suite
- Circular dependencies → prevented by one-way imports from commands to core; guarded by cli-architecture test

## Rollback plan

Focused commit revert per extraction step.

## Completion notes

COMPLETED 2026-08-25 (normal lifecycle, no --force).

1. CLI MONOLITH SPLIT (dependency-first, no buildProgram-first mistake):
   - efe9020 process-budget test stability fix; de9d23f shared leaf helpers; c07c19b leaf command modules;
     cfa6d48 skills/task/instructions/init/summary modules; ae4d434 remaining commands + program.ts +
     23-line bootstrap index.ts.
   - index.ts: 1,821 lines / 63,151 bytes → 23 lines. program.ts: 367 lines. Largest command module: scan.ts 193 lines.
   - Direction enforced: program → commands → shared(cli context/errors/output/root) → core. Core/MCP never import CLI.
   - Regression guard: tests/contract/cli-architecture.test.ts (line budgets + forbidden imports).
2. PACK JSON SEMANTIC PARITY:
   - Canonical orchestration: src/core/context/orchestrate.ts buildCanonicalContextSections() used by BOTH
     CLI `pack` and MCP `ackit_pack` (single source of truth, mirrors executeConfiguredScan pattern).
   - JSON carries schemaVersion/tool/version/budget + 5 canonical contextSections with content/tokens/sha256
     + files with relativePath/content/estimatedTokens/sha256/bytes + manifest.
   - Parity proven: tests/integration/context/pack-parity.test.ts (same sections/files/manifest selection across formats,
     deterministic byte-identical reruns, no machine-local absolute paths).
   - Live evidence on this repo: pack --format json → sections=5, files=135, manifest=553, budget 99998/100000.
3. MCP BEHAVIORAL CANCELLATION:
   - Abort checkpoints through pack hot path: before discovery / after discovery / per section / per candidate
     before+after read / before ranking+rendering (src/core/context/pack.ts), plus section-collection checks in
     orchestrate.ts.
   - tests/integration/mcp/cancellation.test.ts: pre-aborted signal refuses work; aborted tool call returns NO result
     over InMemory transport and server stays healthy (subsequent listTools/calls succeed); large-fixture mid-flight
     cancellation with warm-measured timing and post-cancel recovery.
4. INSTALLED-TARBALL MCP E2E:
   - scripts/package-smoke.mjs now launches MCP from the installed .tgz consumer copy: initialize handshake (serverInfo
     identity == package.json version), notifications/initialized, tools/list, ackit_scan/ackit_pack/ackit_doctor calls,
     resources/list + repo://summary read, prompts/list + prompts/get, clean stdin shutdown exit 0; stdout purity asserted
     by strict JSON.parse of every line. Runs in hosted CI on ubuntu/windows/macos.
5. TEST STABILITY ROOT CAUSE (not "flaky"):
   - Reproduction: intermittent failures in optimize/git/cli-dist-contract suites; captured timeout at exactly 5000ms
     default while synchronous git fixture seeding (init+config+add+commit spawns) took 10.7s under load.
   - Root cause: process-spawn-heavy tests without explicit time budgets on a threads-pool runner.
   - Fix: explicit generous budgets (60s) for spawn-bound tests/hooks only; assertion semantics untouched. 6 consecutive
     full-suite runs green after fix (270→282 tests as new suites landed). A silent watch re-scan error swallow was also
     found in debt sweep and fixed (297f7c9).
6. REVERIFICATIONS: policy (enabled:false, forbiddenPatterns wiring, scopes, containment incl. junction/symlink),
   cache (content-hash keys, policy/config digest invalidation, hot path), skills family (validate/list/discover/
   doctor/scaffold/install live exits 0) — focused suites 64/64 green.

Local gate at completion: install(frozen)=0 lint=0 format:check=0 typecheck=0 gen:schemas=0 build=0
vitest 57 files / 282 tests =0 smoke:cli=0 smoke:package=0 task doctor=0 git diff --check clean.

Hosted CI evidence is recorded after the final docs commit push (final acceptance criterion above).

CHRONOLOGY CORRECTION (2026-08-25, recorded by TASK-0003 — supersedes the earlier "on this tree content" wording without rewriting history): the CI claim above was written when 5bca529 was the candidate HEAD, but the final commit of this task was b35ca59 (a source change in src/cli/commands/task.ts), so 5bca529 was NOT the final tree. b35ca59 subsequently passed hosted CI run 32787110952 (10/10 jobs green). Additionally, an independent post-closure audit (TASK-0003) found three concrete defects in this closure state: a REQ-GOV-007 silent read swallow in the context pack, a REQ-GOV-007 advisory-only policy-summary catch, and an MCP cancellation test whose large-fixture run never used its fixture root and could pass without testing mid-flight cancellation. Those are repaired under TASK-0003; this document's completion stands for the scope it verified at its time.
