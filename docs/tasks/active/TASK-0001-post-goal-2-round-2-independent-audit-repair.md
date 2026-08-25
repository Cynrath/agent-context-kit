---
id: "TASK-0001"
title: "Post-Goal-2 round 2 independent audit repair"
status: completed
schemaVersion: 2
dependencies:
  []
createdAt: "2026-08-24"
completedAt: 2026-08-25
---


## Purpose

Post-Goal-2 round 2 independent audit repair: reproduce and fix P0/P1 defects found by independent review.

## Scope

- Context pack binary classification bypass and divergent secret detection
- Policy extends root escape and scope semantics (org/repo/pathScopes)
- MCP root confinement, scan parity, cancellation signal wiring
- Incremental scan empty-set bug
- Bare ackit fake health logic
- Cache hot path integration into scanner pipeline
- Skills command family completion (discover/scaffold/sync/doctor)
- Package smoke behavioral rewrite

## Out of scope

- CLI monolith split (→ TASK-0002)
- Pack JSON semantic content parity (→ TASK-0002)

## Affected files

- src/core/context/pack.ts, src/core/policy/resolve.ts, src/core/policy/apply.ts
- src/core/scanner/orchestrate.ts, src/core/scanner/pipeline.ts
- src/mcp/server.ts, src/cli/index.ts, scripts/package-smoke.mjs

## Acceptance criteria

- [x] Implementation matches scope.
- [x] Test plan executed with pass counts recorded.

## Test steps

1. Full suite + focused security/policy/context/cache suites.

## Risks

- Refactor regressions → behavior-pinning tests.

## Rollback plan

Focused commit revert.

## Completion notes

INVALID FORCED CLOSE EVENT: This task was previously force-completed with --force in violation of the final-closure mission contract. That forced close was invalid because CLI monolith split and pack JSON semantic parity were NOT completed. The false completion is superseded by TASK-0002 which carries the remaining mandatory work.

COMPLETED WORK (genuine, verified):
- Pack binary bypass fixed: canonical classifier used instead of skipClassification:true (P0)
- Pack divergent secret detection replaced with canonical catalog rules ACKIT001-004 (P0)
- Policy extends root escape contained: realpath + isInsideRoot on local entries (P0)
- Policy org/repo/pathScopes semantics implemented in mergeDocuments + applyPolicyToFindings
- MCP root confined at construction; no root parameter on tools
- MCP scan routed through executeConfiguredScan for CLI/MCP parity
- Incremental empty-set bug: defined-but-empty filterPaths no longer falls through to full scan
- Bare ackit health summary: fake `|| true` removed; real git/config/tasks/skills checks
- Cache hot path: content-hash key integrated into pipeline evaluateTarget with await cacheSet
- Policy forbiddenPatterns wired as first-class ScanRules via forbiddenPatternToRule
- Policy enabled:false filters rules from active plan before evaluation
- Skills discover/scaffold/sync/doctor commands added
- Package smoke expanded to full command battery

NOT COMPLETED (carried forward to TASK-0002):
- CLI monolith split (~1800 lines still in index.ts)
- Pack JSON semantic content parity (JSON has manifest but not included file content)

Evidence: 53 files / 267 tests PASS · CI run 32735985259 10/10 green · self-scan --ci exit 0.

Dependencies note: body-level reference to TASK-0291 is historical context only. TASK-0291 uses the legacy flat task format (docs/tasks/TASK-0291...) which the vNext TaskStore does not track. YAML dependencies are correctly [] because no active vNext task depends on this one.
