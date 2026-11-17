---
id: "TASK-0107"
title: "Isolate package smoke builds from parallel CLI contracts"
status: active
schemaVersion: 2
dependencies:
  - "TASK-0105"
createdAt: "2026-11-17"
completedAt: null
---


## Purpose

Eliminate shared-build writes from parallel packaging tests. In PR #45 at
`2e8e0ae`, Linux/Node 24 job `134218923233` passed build/CLI smoke but later
failed invalid-usage exit-code verification because `dist/core/policy/tiers.js`
was read during another test's prepack rebuild and temporarily lacked exports.
Two current tarball callers execute lifecycle-enabled `pnpm pack` in the source
checkout, rewriting shared dist/schemas while sibling CLI contracts read them.

## Scope

- Export a minimal current source build into a private temporary project,
  frozen-install its pinned root dependencies, and run real lifecycle-enabled
  pack there. Share that isolated pack boundary between package smoke and the
  tarball allowlist test; keep installed CLI/MCP/lifecycle assertions intact.
- Add a regression assertion that real packing preserves source-checkout
  built-module and schema timestamps; reproduce its failure before the fix.
- Preserve parallel tests, all CLI assertions and real prepack build/schema
  generation. Use the existing redacted consumer process boundary.

## Explicit authorization

The current goal authorizes scoped bug/CI/test fixes, ordinary commits/pushes
and protected PR/master integration. This task performs no publication,
workflow dispatch/rerun, tag, permission, credential or deployment action.

## Out of scope

- Runtime/public API/version changes; serializing the suite; skipping prepack,
  weakening CLI exit-code expectations, retries that hide the race; republish,
  tag movement, workflow dispatch/rerun, deployment or unrelated refactoring.

## Affected files

- `scripts/package-smoke.mjs`
- New `scripts/isolated-package.mjs` and its narrow `.d.mts` signature
- `tests/e2e/tarball/tarball-smoke.test.ts`
- This task and TASK-0103's CI/publication checkpoint.

## Required tests

- Old-path root-mutation regression must fail, then pass with isolation.
- Real allowlist/installed-package smoke plus parallel built-CLI contracts.
- Full affected root suite, lint/format/strict typecheck/build, frozen lock,
  schema no-drift, offline/ACKit gates and required exact-head PR CI.

## Acceptance criteria

- [x] Lifecycle-enabled packing preserves the checkout's built modules/schemas.
- [x] Actual tarball allowlist, installed CLI/task/MCP and parallel CLI checks pass.
- [x] No lifecycle/quality assertion is skipped, serialized or weakened.
- [~] Full local gates and required exact-head PR CI pass with recorded evidence.

## Test steps

1. Record the completed hosted failure, inspect both writers and built-CLI
   readers, and commit this complete plan before implementation.
2. Assert built-module/schema timestamps remain unchanged through real pack;
   show the old source-checkout prepack violates that assertion.
3. Export current tracked/unignored build inputs into a new private temp
   project (no ignored dist/node_modules), frozen-install, and perform real
   prepack/pack there. Require bounded, redacted child-process failures.
4. Run focused parallel packaging/CLI tests, then full affected checks and
   exact-head hosted matrix; leave previous failures visible, never rerun them.

## Security and compatibility

No runtime network/API, production data, dependency-version or permission change.
Only test/setup tooling uses the existing package registry, as before. Exports
must stay inside their private fixture, use real path bounds and refuse escaping
symlinks. Pack must still build/schema-generate and exercise actual tarballs.

## Risks

- Cold isolated installs add setup work; use the existing pinned dependency
  graph/cache rather than sharing mutable build output. Do not invent timing
  performance claims or silently ignore setup failures.
- Validate fixture cleanup boundaries; preserve all user files and primary
  dependency directories. No source checkout build file may be rewritten.

## Rollback plan

Forward protected PR restoring the previous tooling if necessary while keeping
the failing CI gate honest. No immutable release/package/tag is changed.

## Completion notes

Implementation and local checks are verified; the corrected head still awaits
required PR CI. TASK-0103 stays pending this correction and protected bookkeeping
merge. Public release 0.5.5 and its immutable artifacts remain unchanged.

- Plan `4d0aa26` preceded implementation. A regression assertion around the old
  actual pack reproduced writes to both `dist/core/policy/tiers.js` and
  `schemas/ackit.schema.json` (timestamps changed). The original CLI failure
  and old-path mutation proof remain recorded; no run was rerun or hidden.
- Both pack callers now export current source inputs into private projects,
  validate export/realpath bounds, frozen-install with the manifest's pinned
  pnpm, and run the real prepack build/schema hooks there. Existing tarball
  allowlist, CLI/task/MCP assertions remain. Each caller now asserts checkout
  module/schema timestamps are unchanged; parallel CLI/package tests 6/6 PASS.
- `pnpm exec` does not set npm_execpath, so an initial focused invocation hit
  the helper's explicit pinned-runner guard. The supported `pnpm test` script
  provides it and the corrected focused invocation passed. No guard was removed.
- The first default full local run had two checkpoint 60s timeouts under load;
  focused checkpoint/handoff checks then passed 20/20. On this 12-logical-CPU
  host, `pnpm test --maxWorkers=8` ran the entire suite: 126 files PASS,
  778 PASS / 3 existing Windows privilege skips (781 total), 126.44s.
  The existing test timeout and all assertions remained in force. Hosted CI
  continues to run the default full-suite command on its normal matrix.
- Lint, format, strict typecheck, build, schema no-drift, text hygiene, task
  doctor and static offline gate PASS. Required exact-head CI is the remaining
  completion evidence; no new live publish/dispatch/rerun is part of this task.
