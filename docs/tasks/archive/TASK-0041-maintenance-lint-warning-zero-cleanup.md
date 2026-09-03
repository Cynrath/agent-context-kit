---
id: "TASK-0041"
title: "maintenance: lint warning zero-cleanup"
status: completed
schemaVersion: 2
dependencies: []
createdAt: "2026-08-28"
completedAt: "2026-08-28"
---

## Purpose

Eliminate all 49 lint warnings to achieve 0 errors / 0 warnings without broad suppressions, preserving runtime behavior and offline-first security guarantees. v0.2.2 tag/release frozen.

## Scope

- Fix 13× `noNonNullAssertion` in: `src/cli/commands/instructions.ts:121`, `src/core/instructions/analysis/graph-v2.ts:52,53,110,111`, `src/core/instructions/graph.ts:671,672,805,806`, `src/core/profiles/built-ins.ts:26`, `src/core/readiness/deductions/index.ts:35,40`, `src/core/readiness/deductions/policy.ts:42`
- Fix 1× `noUnusedVariables` in `src/cli/profile.ts:33` (`collectScanTargets` unused)
- Fix 11× `noTemplateCurlyInString` in `tests/contract/ci-pinning.test.ts` (strings containing `${...}` intended as literal checks)
- Fix 24× `noTsIgnore` in `tests/security/offline-runtime.test.ts` (replace with typed helpers or narrow `@ts-expect-error` with justification, preserving egress interception)
- Preserve MCP stdio smoke deterministic fix (TASK-0040) intact

## Out of scope

- create v0.2.3 / move tag / publish npm / marketplace
- change product architecture / features / public behavior
- add telemetry / network calls
- force-push / rebase / disable tests / weaken CI
- broad Biome ignores or global rule disable

## Current evidence

- `pnpm lint` = 0 errors / 49 warnings (baseline captured 2026-08-28)
- Categories: noNonNullAssertion 13, noUnusedVariables 1, noTemplateCurlyInString 11, noTsIgnore 24
- `biome.json` has `recommended:true`, no global disables
- `v0.2.2` tag `af739cf` → `35087e7` unchanged, npm `0.2.2`
- TASK-0040 deterministic wait (id-specific) intact

## Acceptance criteria

- [x] `pnpm lint` reports 0 errors / 0 warnings (max-diagnostics 200)
- [x] No file-level `biome-ignore` or global rule disable
- [x] Non-null assertions replaced with safe control flow (guard/continue/throw) preserving behavior
- [x] Unused variable resolved via removal or real usage (investigate disconnected path)
- [x] `@ts-ignore` replaced with properly typed abstraction or narrow `@ts-expect-error` (single-line, test-only, with comment, compiler actually errors)
- [x] `noTemplateCurlyInString` fixed without breaking contract tests (literal `${...}` intent preserved)
- [x] `tests/security/offline-runtime.test.ts` still intercepts all egress primitives (fetch, http/s, net, tls, dgram, dns, WebSocket, EventSource) and loopback exception narrow
- [x] `pnpm typecheck && pnpm build && pnpm test && node scripts/check-offline-egress.mjs` PASS
- [x] MCP stdio smoke still deterministic (5× passes if touched)

## Test steps

1. `pnpm lint --max-diagnostics=200` → 0/0
2. `pnpm format:check && pnpm typecheck && pnpm build`
3. `pnpm test` → all pass
4. `node scripts/check-offline-egress.mjs` → PASS
5. If MCP infra touched: 5× `pnpm test tests/integration/mcp/stdio-smoke.test.ts` PASS

## Risks

- Safe-flow rewrite could change behavior if guard incorrect → mitigate by preserving thrown/continue semantics and running full test suite
- Typed helper for monkey-patch could weaken interception → verify offline-runtime still blocks all primitives

## Rollback plan

Revert single commit `chore(quality): eliminate remaining lint warnings` via `git revert`; lint returns to 49 warnings, no tag/release move.

## Completion notes

2026-08-28 — lint baseline 49 warnings (noNonNullAssertion 13, noUnusedVariables 1, noTemplateCurlyInString 11, noTsIgnore 24) → final 0 errors / 0 warnings via `biome check` JSON (210 files, warnings 0). Fixes: `instructions.ts` guard `if (!id) continue`, `profile.ts` removed unused destructuring and reused collectScanTargets via single import, `graph-v2.ts`/`graph.ts` guards `if (!first||!second) continue` and `if (!a||!b) continue`, `built-ins.ts` fallback invariant throw, `deductions/index.ts` `first` guard, `policy.ts` `if (!f) return`. `ci-pinning.test.ts` 11× → concatenation via `"$" + "{VAR}"` avoids `${` in source without suppression; tests still pass (19 tests). `offline-runtime.test.ts` 24× → typed helper `patchObject(target, key, value)` via `(target as Record<PropertyKey, unknown>)[key]=value` eliminates `@ts-ignore`; restores via same helper; still intercepts fetch/http/https/net/Socket/tls/dgram/dns/WebSocket/EventSource and loopback narrow (verified). Local gates: `pnpm format:check` PASS, `pnpm typecheck` PASS, `pnpm build` PASS, `pnpm test` 67 files 361 tests PASS (including stdio-smoke 2/2, ci-pinning 19/19, offline-runtime 13/13), `pnpm gen:schemas` PASS, `pnpm smoke:cli` PASS, `pnpm run smoke:package` PASS (tgz 0.2.2), `node scripts/check-offline-egress.mjs` PASS (139 files), `node dist/cli/index.js config check|doctor|task doctor|skills validate|instructions|scan --ci` PASS, `git diff --check` PASS, extension manifest PASS, typecheck PASS, build PASS (1.0 MB), vsce ls/package PASS (640 KB), icon 256×256 PASS, offline-egress extension audit PASS, MCP stdio 5× PASS (635–705 ms each). No biome-ignore, no global disable. Commit `chore(quality): eliminate remaining lint warnings` pending push.
