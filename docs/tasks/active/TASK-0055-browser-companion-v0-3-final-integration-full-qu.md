---
id: "TASK-0055"
title: "Browser Companion v0.3 — final integration, full quality matrix and GO-NO-GO"
status: active
schemaVersion: 2
dependencies: ["TASK-0053", "TASK-0054"]
createdAt: "2026-08-29"
completedAt: null
---

## Purpose

Own the final Browser Companion v0.3 integration gate before GO. This task cannot complete until TASK-0053 and TASK-0054 plus all prior Browser Companion child tasks are genuinely complete. Produce the deterministic quality matrix, CI coverage fix, and explicit GO/NO-GO with SHA + run IDs.

## Scope

- **Dependency gate**: verify TASK-0044..TASK-0054 are all genuinely `completed` (no missing acceptance evidence, no pending/deferred/TODO, no disabled quality gates, no failed live verification). If any child still NO-GO, this task stays non-completed.
- **Full deterministic quality matrix** (run and record exact results):
  ```
  pnpm lint
  pnpm format:check
  pnpm typecheck (root)
  pnpm build
  pnpm test (full vitest suite — note counts per suite)
  node scripts/check-offline-egress.mjs (offline invariant)
  MCP stdio smoke (if applicable)
  pnpm run smoke:package / smoke:cli (where relevant)
  node dist/cli/index.js scan --ci
  node dist/cli/index.js doctor
  node dist/cli/index.js task doctor
  node dist/cli/index.js skills validate
  extensions/browser: npx tsc -p extensions/browser/tsconfig.json --noEmit (strict)
  extensions/browser: node scripts/build.mjs (manifest bundles)
  tests/browser/manifest-contract.test.ts
  tests/browser/adapter-contract.test.ts (+ pin)
  tests/browser/no-auto-submit.test.ts
  tests/security/browser-bridge.test.ts
  tests/browser/performance-benchmark.test.ts
  git diff --check
  ```
- **CI coverage**: inspect `.github/workflows/ci.yml` and ensure Browser Companion is covered where appropriate without bloating unrelated jobs. At minimum CI protects: extension typecheck, extension build, manifest contract, browser unit/contract tests, bridge security tests. Performance benchmark stays deterministic enough for CI or is separated with regression threshold strategy. Document workflow/ job IDs inspected. Do not make Chrome DevTools MCP a mandatory GitHub Actions dependency unless robust architecture exists.
- **Final audit** greps:
  ```
  TODO|FIXME|HACK|pending|deferred|next round|not verified
  // @ts-nocheck|@ts-ignore|@ts-expect-error
  strict: false|noImplicitAny: false
  ```
  Evaluate every hit; legitimate doc mentions stay with justification, unresolved work is NO-GO.
- **Git/artifact hygiene**: `git status`, `git diff --check`, `git log` no accidental files/secrets/build output, `.gitignore` for `extensions/browser/dist/`.
- **PR + CI evidence**: push corrected branch normally (no force-push), create/update PR against `master`, wait for exact final SHA's required checks, record `branch`, `final SHA`, `PR number`, `CI workflow run IDs`, `job results` in Completion notes.
- **GO/NO-GO decision**: return exactly `GO` or `NO-GO` with concrete blockers. `GO` only if implementation, tasks, live Chrome validation, performance evidence, type safety, and CI are all genuinely complete per Rule 15.

## Out of scope

- Publish/tag/release actions (user-authorized only).
- New features beyond TASK-0054 scope.

## Dependencies

- TASK-0053 audit + strict remediation completed.
- TASK-0054 real Chrome E2E + pin + benchmark completed.

## Affected files

- `.github/workflows/ci.yml` (if Browser Companion gates added)
- `docs/tasks/active/TASK-0055*` (this file)
- `docs/benchmarks/browser-companion-v0.3-performance.md` (evidence)
- PR description + branch history

## Acceptance criteria

- [ ] All child tasks verified completed with evidence; no hidden deferrals.
- [ ] Quality matrix executed and every gate PASS with counts/IDs recorded (lint, format:check, typecheck root+extension, build, vitest full suite, offline-egress, ackit doctors, scans, manifest/adapter/no-auto-submit/bridge/benchmark tests, git diff --check).
- [ ] CI workflow inspected; Browser Companion gates present where appropriate; final SHA's CI run green (or blockers listed).
- [ ] Grep audit for TODO/FIXME/HACK/pending/deferred/ts-nocheck/ts-ignore/strict:false completed; remaining hits justified.
- [ ] `git status` clean except expected untracked; no secrets/build output committed; `git diff --check` clean.
- [ ] PR against `master` exists for final SHA; run IDs and job results recorded.
- [ ] Explicit GO/NO-GO returned with blockers if NO-GO; no vague `mostly complete`.

## Test steps

1. Run matrix exactly as listed and paste results into Completion notes.
2. `rg -n "TODO|FIXME|HACK|next round|ts-nocheck|strict: false" --glob '!*.md'` + docs case-by-case.
3. `git status` + `git log --oneline -15` + `git diff --check`.
4. Open `.github/workflows/ci.yml` → confirm browser gates added.
5. Push + open PR → capture SHA + run IDs via `gh` or Actions UI.
6. Record decision GO or NO-GO.

## Security considerations

- CI must not weaken offline-egress allowlist; any new http request is reviewed.
- No secret paths/tokens in evidence/PR description.

## Risks

- CI adding browser build may increase runner time → keep jobs scoped, share `pnpm install` cache.
- MCP not in CI → correctly not gate CI, but live evidence must still exist locally under TASK-0054.

## Rollback plan

Revert CI workflow change + this task doc in one commit if GO not achieved.

## Completion notes

(pending — to be filled with matrix results, SHA, run IDs, audit hits, and final GO/NO-GO)
