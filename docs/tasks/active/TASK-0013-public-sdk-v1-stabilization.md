---
id: "TASK-0013"
title: "Public SDK v1 stabilization"
status: pending
schemaVersion: 2
dependencies:
  - TASK-0007
createdAt: "2026-08-27"
completedAt: null
---

## Purpose

Stabilize the Node/TypeScript programmatic API (`src/index.ts` is the single public entry per ADR-0002/0021), freeze the exported symbol allowlist, introduce typed `AckitError` + `AbortSignal` cancellation, enforce `sideEffects:false`, ESM-only `exports: {".":..., "./mcp":...}`, `engines.node >=22`, `no process.exit` from SDK, and provide isolated SDK consumer proof. Success makes CLI/MCP/Action/dashboard/VS Code reuse the same engine without duplicated logic.

## Context / current state

Current `src/index.ts` (25 lines) exports:

```ts
export { scanRepository } from "./api/scan-repository.js";
export { loadAckitConfig } from "./core/config/load.js";
export type { AckitConfig } from "./core/config/schema.js";
export type { PackManifestEntry, PackResult } from "./core/context/pack.js";
export { buildContextPack } from "./core/context/pack.js";
export { buildInstructionGraph, resolveEffectiveStack } from "./core/instructions/graph.js";
export type { InstructionGraph, InstructionNode, ProviderId } from "./core/instructions/types.js";
export type { Finding, ScanCategory, ScanDiagnostic, ScanResult, ScanRule, Severity } from "./core/scanner/types.js";
export type { SkillIssue, SkillRecord } from "./core/skills/types.js";
export { validateSkills } from "./core/skills/validate.js";
```

`package.json` already has `"type":"module"`, `"sideEffects":false`, `"exports":{".", "./mcp"}`, `engines.node >=22`. Reuse is assumed but grep shows a few CLI modules import `src/core/scanner/pipeline.ts` directly rather than via `src/index.ts` (violation to fix). No `process.exit` trap exists in `src/core` but SDK must remain exit-free. AbortSignal is partially wired (`src/core/context/pack.ts` already aborts on 6 checkpoints, watch uses `WatchHandle.done`), but `scanRepository` does not yet fully forward a signal through pipeline evaluation.

Exact files/modules likely affected:

- `src/index.ts` — frozen allowlist (add `scoreRepository`, `evaluateRulePack`, `BuildGraphOptions` extensions in v0.2.0 design but only after readiness/packs tasks; this SDK task governs the *boundary*, not the new symbols — it carves the extension points).
- `src/api/scan-repository.ts` — add `signal?: AbortSignal` forwarding, error typing.
- `src/shared/exit-codes.ts`, `src/shared/diagnostics.ts` — remain internal, not exported.
- `src/core/{scanner,context,instructions,policy,skills,filesystem}` — must be internal-only (no `package.json` `exports` deeper).
- `tests/contract/api-surface/api-surface.test.ts` — asserts exact export list; update to assert frozen set and `sideEffects`/`exports` shape.
- `scripts/package-smoke.mjs` — already does real-tarball isolated consumer but only checks CLI; add SDK consumer leg.
- `docs/reference/sdk.md`, `docs/architecture/overview.md` — update with stability contract.

Dependencies: needs TASK-0007 baseline (pins + traceability). Unlocks every engine task (readiness, graph, profiles, packs) — see exec plan.

Related ADRs: ADR-0001/0002 (single package/ESM), ADR-0021 (SDK+VS Code), REQ-V020-J-001..003 (SDK), REQ-V020-GOV-008/009 (no exit, stable contracts).

## Goal

One outcome: a contract-tested, type-safe SDK surface (`src/index.ts` allowlist) that is cancellable (`AbortSignal`), exit-free, `ESM`-only, and consumable from an isolated tarball install — reused by CLI/MCP/Action/dashboard/VS Code (verified by grep).

## In scope

- **Freeze allowlist**: define the v0.2.0 frozen export list (above plus explicitly listed v0.2.0 additions as *planned* but not yet implemented: `scoreRepository` (from TASK-0008), `evaluateRulePack` (TASK-0012), expanded `BuildGraphOptions` includes `includeScopes`/`providerApplicability`). Until those tasks land, the allowlist stays the 0.1.1 set + a `RESERVED` comment section (code does not yet export the new symbols, but `tests/contract/api-surface` has a pending allowlist section commented as `// TODO v0.2.0: scoreRepository`).
- **Error model**: introduce `class AckitError extends Error { readonly code: string; readonly remediation?: string; readonly cause?: unknown }` in `src/shared/errors.ts` or `src/api/errors.ts`; map known internal errors (`CONFIG-*`, `SCAN-*`, `FS-*`, `POLICY-*`, `GRAPH-*`, `PACK-*`) to stable codes; ensure SDK throws `AckitError`, never raw strings, never `process.exit`.
- **AbortSignal plumbing**: `scanRepository(root, { signal? })`, `buildContextPack(root, { signal? })`, `buildInstructionGraph(root, { signal? })` all check `signal.aborted` before I/O and reject with `DOMException { name: "AbortError" }` within 200ms (same pattern as `src/core/context/pack.ts` checkpoints). Cover via integration test with `new AbortController().abort()`.
- **Package exports/type policy**: assert `package.json` `type:module`, `sideEffects:false`, `engines.node >=22`, `exports` exactly `"."` + `"./mcp"` (no `"./core"` wildcard). CI contract test fails on addition. Doc note: CJS consumers use `await import("@cynrath/agent-context-kit")` dynamic import shim.
- **No side-effects import**: importing `@cynrath/agent-context-kit` does not schedule timers, start servers, or touch FS. Test via import-count smoke (fresh temp project, `import "@cynrath/agent-context-kit"` and assert no FS calls via `fs.readdir` spy).
- **SDK reuse enforcement**: grep gate `src/cli/**`, `src/mcp/**`, `extensions/vscode/**` must not import `src/core/scanner/pipeline.ts` etc. directly — only via `src/index.ts`. If dashboard already exists, same gate.
- **Docs**: rewrite `docs/reference/sdk.md` with: supported imports table, error model, AbortSignal example, ESM/CJS note, compatibility policy ("pre-1.0: minor may add, not remove; additive fields have defaults"). Code example validated by isolated consumer test.

## Out of scope

- Adding `scoreRepository` implementation (TASK-0008) or `evaluateRulePack` (TASK-0012) body — this task only freezes the boundary and adds the extension-point注释/tests.
- MCP write tools — remains read-only (REQ-MCP-002).
- VS Code extension itself (TASK-0019/0020) — only the SDK leg they consume.
- Changing `package.json` version (still `0.1.1`) or rebuilding `release.yml`.
- Polluting `dist/` with extra entry points (no `exports["./context"]`).

## Technical design

- **Module layout**:
  ```
  src/index.ts            # frozen public export (only place that imports src/core)
  src/api/scan-repository.ts   # public entry, typed errors, AbortSignal forwarding
  src/api/errors.ts       # AckitError + AckitErrorCode union (if new)
  src/shared/exit-codes.ts # CLI exit code mapping, NOT exported from SDK
  src/shared/version.ts   # single source, used by CLI+MCP but SDK re-exports minimal
  ```
- **Types**: all public types strict (`no any`); public functions return `Promise<ScanResult>` / `Promise<InstructionGraph>` etc. without `any`. `tsconfig.json` `strict: true` enforced; violation caught by `pnpm typecheck`.
- **AbortSignal pattern** (reuse `pack.ts` 6 checkpoints): before discovery, after discovery, per-file, after ranking, before rendering, plus before `executeConfiguredScan` loop. For `scanRepository`, thread `signal` through `pipeline.ts` `evaluateTarget` (already has `AbortSignal` param in TASK-0291).
- **Contract test** `tests/contract/api-surface/api-surface.test.ts`:
  ```ts
  import * as sdk from "@cynrath/agent-context-kit"; // or src/index.ts
  const exported = Object.keys(sdk).sort();
  expect(exported).toEqual(["buildContextPack","buildInstructionGraph",...]); // exact
  ```
  plus check `JSON.parse(readFileSync("package.json","utf8")).exports` equals `{".":{"types":"./dist/index.d.ts",...},"./mcp":...}` only.

## User-facing behavior

```ts
// Consumer (ESM) — documented, contract-tested
import { scanRepository } from "@cynrath/agent-context-kit";
const ac = new AbortController();
setTimeout(() => ac.abort(), 10);
try {
  const result = await scanRepository(process.cwd(), { signal: ac.signal });
  console.log(result.findings.length);
} catch (e) {
  if (e instanceof DOMException && e.name === "AbortError") console.log("aborted");
  if (e instanceof AckitError) console.error(e.code, e.remediation);
}
```

CLI, MCP, Action, dashboard, VS Code all import from the same `src/index.ts` SDK — verified by:
```powershell
grep -R "from.*src/core/scanner/pipeline" src/cli src/mcp extensions
# must print 0 lines after task
```

## Security

- SDK never leaks absolute paths: `relativePath` only; `Finding` already repo-relative; `ScanDiagnostic` redacted at construction. Re-run `tests/security/secrets/*` to confirm no absolute path in `ScanResult` JSON.
- No `child_process.exec` path; grep gate (see Completion) covers.
- No telemetry/ network inside SDK (spy `fetch` is forbidden in `src/`).

## Performance

- `scoreRepository` (not yet implemented) is pure and synchronous over already-built inputs — cost ~0; `scanRepository` perf budget unchanged (benchmarks same).
- SDK import is side-effect free, tree-shakable (`sideEffects:false`) — pack size check: `esbuild --bundle src/index.ts --minify` <200KB (informational, not gate).

## Compatibility

- Windows/macOS/Linux: no path separators assumed; repo-relative is POSIX `split("\\").join("/")`.
- Node 22 + Node 24: this task must pass on both (CI matrix). `AbortSignal` available in Node 16+ so both LTS ok.
- ESM-only `type:module` → CJS doc'd as dynamic `import()`. No CJS shim shipped; if a downstream consumer needs CJS, the SDK doc explicitly shows the async shim.
- v0.1.1 compat: no breaking change to existing exports; adding `AckitError` is additive (consumers catching `Error` still work).

## Acceptance criteria

- [ ] `src/index.ts` exports exactly the frozen allowlist (sorted: `buildContextPack`, `buildInstructionGraph`, `loadAckitConfig`, `resolveEffectiveStack`, `scanRepository`, `validateSkills`, + 8+ type exports). Adding or removing an export makes `tests/contract/api-surface/api-surface.test.ts` fail until ADR amended (checked via intentional `+1` export regression run).
- [ ] `package.json` asserts `type=="module"`, `sideEffects==false`, `engines.node` contains `>=22`, `exports` is exactly two keys `"."` and `"./mcp"` (no `"./core"`), validated by `api-surface.test.ts`.
- [ ] No file in `src/cli/**` or `src/mcp/**` imports `src/core/{scanner,policy,context,instructions}` directly (only via `src/index.ts`). `grep -R "from.*src/core"` restricted excludes `src/index.ts` gives 0 after task; archived grep result recorded.
- [ ] Async SDK entry (`scanRepository`, `buildContextPack`, `buildInstructionGraph`) accepts `{ signal?: AbortSignal }`; test passes `AbortController().abort()` before call and asserts rejection with `AbortError` within 200ms.
- [ ] `AckitError` thrown for a `config` error path (e.g., unknown key in `ackit.yml` validated) carries `code` like `CONFIG-UNKNOWN-KEY` and `remediation` suggestion; throwing a raw `string` never occurs (grep `throw "` only throws Error/AckitError/DOMException).
- [ ] Importing SDK has no side effects: fresh temp-project test `import "@cynrath/agent-context-kit"` does not call `fs.readdir`/`fs.writeFile` (spy counts 0) and resolves without starting a server.
- [ ] `pnpm typecheck` green on `strict`; `pnpm lint` + `pnpm format:check` green; `pnpm test` green including updated `api-surface` contract.

## Tests

- **contract**: `tests/contract/api-surface/api-surface.test.ts` (exact export list + `package.json` `exports`/`sideEffects`/`type`).
- **unit**: `AckitError` mapping for one error code each (`config`, `scan`).
- **integration**: AbortSignal cancellation for `scanRepository` + `buildContextPack` + `buildInstructionGraph` (abort before I/O).
- **e2e consumer**: `tests/e2e/sdk-consumer.test.ts` or `scripts/package-smoke.mjs` extension — `pnpm pack` → install in temp dir → `node -e "import('...')"` leg passes with live findings.
- **security**: secrets/absolute-path not in `ScanResult` JSON; `fetch` not in `src/` (grep gate).
- **cli-smoke**: existing `smoke:cli` + `config check` still pass; no `process.exit` fired from SDK path (assert `process.exitCode` unchanged after SDK call).
- **cross-platform**: same `toPosix` normalization on win32 path.

## Documentation

- Update: `docs/reference/sdk.md` (supported imports table, error model, AbortSignal example, ESM/CJS policy, compatibility).
- Update: `docs/architecture/overview.md` (SDK as shared engine, diagram note).
- Create: `examples/sdk-consumer.mjs` (≤20 lines, `import { scanRepository }` smoke, executed via `node examples/sdk-consumer.mjs` under `pnpm pack` consumer).
- Keep: `docs/reference/cli.md` note that CLI delegate owns `process.exit` mapping to `EXIT_CODES`.

## Evidence

Record: `pnpm test` pass (files+tests), `pnpm typecheck`, `pnpm build` of `src/index.ts` to `dist/index.js` shape (`dist/index.js` contains `export { scanRepository }` with frozen list), `grep -R "from.*src/core"` before/after, AbortSignal test timings, isolated tarball SDK consumer log (`tmpdir` listed, `--version` via CLI still `0.1.1`, `import('sdk')` findings length >0).

## Completion gate

No `--force`. Dependencies `TASK-0007` must be `completed` before start; task not `completed` until contract test green and no direct `src/core` import remains in `src/cli`/`src/mcp`. Next tasks (`0008`, `0011`, `0010`, `0012`) become runnable only after this is `completed`.

## Requirement IDs

REQ-V020-J-001, REQ-V020-J-002, REQ-V020-J-003, REQ-V020-GOV-008, REQ-V020-GOV-009
