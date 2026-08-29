---
id: "TASK-0053"
title: "Browser Companion v0.3 — corrective audit, task traceability and strict type safety remediation"
status: pending
schemaVersion: 2
dependencies: []
createdAt: "2026-08-29"
completedAt: null
---

## Purpose

Repair the Browser Companion v0.3 development process and TypeScript safety. Audit TASK-0044..TASK-0052 against real repository/evidence, record the task-first violation, correct the false completion claim on TASK-0052, and restore strict typing (`strict:true`, `noImplicitAny:true`) without gate bypass. This is the audit & type-safety gate; no feature code under TASK-0054 may begin until this task is committed and green.

## Scope

- **Traceability audit** of TASK-0044..TASK-0052: for each task build row `Task | Acceptance criterion | Implementation | Automated evidence | Live evidence | Current validity | Action required`. Compare checked boxes against `git log`, file existence, test counts, and evidence notes. Record previous task-first violation (implementation created before full chain planned; some tasks filled after code) explicitly — do not rewrite history.
- **TASK-0052 state repair**: TASK-0052 claims `status: completed` while its own Completion notes say `install_extension → Access denied → pending` and explicitly defers synthetic benchmark, real Chrome verification, performance trace, GO/NO-GO. Apply supported workflow: if `ackit task` supports reopening completed → reopen to non-completed; if not supported → leave historical `completed` but annotate invalid completion and make TASK-0053..0055 own all remaining acceptance criteria with explicit note in TASK-0052 (and in this task) that its prior completion claim is invalid/incomplete. Do not hack task history.
- **Strict type safety remediation** for `extensions/browser/` :
  - `extensions/browser/tsconfig.json`: set `strict:true`, `noImplicitAny:true` (currently `false,false`), keep `skipLibCheck:true` only for lib, add `@types/chrome` contract (remove broad `declare const chrome:any` if present, keep narrow `global.d.ts` only where technically required and documented), ensure `types: ["chrome"]` or equivalent.
  - Remove `// @ts-nocheck` from `extensions/browser/src/sidepanel/sidepanel.ts` (line 1) and fix actual types: chrome.tabs/query/sendMessage payload typing, storage schema typing, bridge response typing, DOM casts, event handlers, abort controller typing. Do not replace with `any`/`unknown as`/`@ts-ignore`/`@ts-expect-error` except narrow unavoidable Chrome boundary with inline comment + test proving necessity.
  - Audit `extensions/browser/src/**` for implicit any, broad any, unsafe message casts (`chrome.runtime.sendMessage` untyped), `chrome.storage` untyped, `bridge-client` untyped JSON; introduce explicit interfaces/schema validators where external JSON crosses trust boundary (bridge JSON, runtime messages, storage reads).
  - Verify root `tsconfig.build.json` typecheck still green and extension typecheck independently green (`npx tsc -p extensions/browser/tsconfig.json --noEmit`).
  - Add/strengthen type-level contracts if useful (e.g., `SiteAdapter` message discriminated union, storage schema).
- **AGENTS.md hard rules** already committed as pre-condition (Rule 1..15) — verify they cover task-first, chain-first, history-order, no false complete, evidence reality, no gate bypass, strict TS, real browser evidence, adapter independence, reversible DOM, Emergency Disconnect, performance measurements, no hide, completion order, GO gate.
- **Verification**: `pnpm typecheck` (root) + `npx tsc -p extensions/browser/tsconfig.json --noEmit` (extension strict) + `pnpm lint` + `pnpm format:check` + `pnpm build` + targeted browser tests. No runtime feature change beyond typing fixes in this task.

## Out of scope

- Pin / Keep Visible, performance benchmark harness, real Chrome E2E (TASK-0054).
- Final GO matrix and CI coverage additions (TASK-0055).
- Publishing, tag move, or history rewrite.

## Dependencies

- TASK-0044..TASK-0052 history exists (read-only audit).
- AGENTS.md hard rules committed.

## Affected files

- `AGENTS.md` (already committed; verify)
- `docs/tasks/active/TASK-0052-browser-companion-v0-3-tests-chrome-devtools-mcp.md` (annotate invalid completion if reopen not supported)
- `docs/tasks/active/TASK-0053*` (this file)
- `extensions/browser/tsconfig.json` (strict remediation)
- `extensions/browser/src/sidepanel/sidepanel.ts` (remove ts-nocheck, fix types)
- `extensions/browser/src/lib/storage.ts` (storage schema typing)
- `extensions/browser/src/lib/bridge-client.ts` (bridge response typing, validators)
- `extensions/browser/src/background/service-worker.ts` (message typing)
- `extensions/browser/src/content/content.ts` (message typing)
- `extensions/browser/src/adapters/**/index.ts` (narrow any)
- `extensions/browser/src/global.d.ts` (narrow chrome typings)
- `extensions/browser/package.json` / `extensions/browser/scripts/build.mjs` if types require

## Acceptance criteria

- [ ] Traceability audit table for TASK-0044..0052 exists in this Completion notes and lists every acceptance criterion with real evidence vs claim; task-first violation explicitly recorded; invalid TASK-0052 completion explicitly annotated.
- [ ] TASK-0052 state corrected via supported workflow OR explicitly documented as historically invalid with remaining scope transferred to TASK-0053..0055.
- [ ] `extensions/browser/tsconfig.json` has `strict:true` and `noImplicitAny:true`.
- [ ] `// @ts-nocheck` absent from `extensions/browser/src/**` (grep 0 hits).
- [ ] No new broad `any`/`@ts-ignore`/global `declare const chrome:any` introduced; any remaining narrow boundary has comment + justification and is covered by grep guard test.
- [ ] `pnpm typecheck` (root) PASS and `npx tsc -p extensions/browser/tsconfig.json --noEmit` PASS with strict true.
- [ ] `pnpm lint` + `pnpm format:check` + `pnpm build` PASS.
- [ ] `node dist/cli/index.js task doctor` PASS and `node dist/cli/index.js doctor` PASS.
- [ ] No history rewrite, no tag move, no publish.

## Test steps

1. `rg -n "ts-nocheck|@ts-ignore|strict: false|noImplicitAny: false" extensions/browser/src extensions/browser/tsconfig.json` — expect 0 hits (except maybe documented narrow allowlist with comment).
2. `cat extensions/browser/tsconfig.json` — verify `strict:true`, `noImplicitAny:true`.
3. `npx tsc -p tsconfig.build.json --noEmit` — 0 errors (root).
4. `npx tsc -p extensions/browser/tsconfig.json --noEmit` — 0 errors (strict).
5. `npx @biomejs/biome check extensions/browser/src` — 0 errors (or only documented ignores).
6. `pnpm build` — succeeds, bundles `dist/background/service-worker.js`, `dist/sidepanel/sidepanel.js`, `dist/content/content.js`.
7. `node dist/cli/index.js task doctor` + `node dist/cli/index.js doctor` — OK.
8. `git log --oneline --graph` confirms no rebase/force-push, `git diff --check` clean.

## Security considerations

- Typing fixes must not introduce unvalidated casts of runtime messages/bridge JSON; add schema validators at trust boundaries (runtime messages, storage, bridge fetch) rather than blind `as`.
- Storage token handling stays session-only; no change to bridge auth.

## Risks

- Strict typing may surface latent `chrome` API mismatches (tabs vs runtime) → mitigated by `@types/chrome` and narrow unions, not `any`.
- Broad `any` removal may require refactoring bridge-client response helpers → do not weaken caller contracts.

## Rollback plan

Revert this task's commit(s): `git revert <sha>` for AGENTS.md + tsconfig + sidepanel typing fixes; TASK-0052 annotation remains as doc fix-forward, not history rewrite.

## Completion notes

(pending — to be filled with traceability table, TASK-0052 action taken, strict deltas, grep/typecheck evidence, and commit SHA)
