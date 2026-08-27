---
id: "TASK-0035"
title: "VS Code functional contract remediation — tree providers, Problems, current-file, optimize, diagnostics, state model, multi-root, watch"
status: completed
schemaVersion: 2
dependencies: []
createdAt: "2026-08-27"
completedAt: 2026-08-27
---

## Purpose

Fix the 8 verified defects where `extensions/vscode` manifest/README promised features that `src/extension.ts` did not actually implement. Implement real `TreeDataProvider`/`WebviewViewProvider` for `ackit.readiness`/`ackit.findings`/`ackit.graph`, real Problems integration, real `Instructions for Current File`, real `Optimize` and `Diagnostics`, plus a reusable workspace state/service layer, multi-root, and correct watch behavior — all via the shared SDK, offline-first, no shell-out.

ADR: `ADR-0021` (public SDK), `ADR-0023` (VSIX verification: activation smoke + Problems + current-file), `ADR-0024` (security hardening).

## Current-state evidence (2026-08-27, post-v0.2.1 audit)

- `extensions/vscode/package.json` `contributes.views.ackit` = 3 views (`readiness`, `findings`, `graph`) but `src/extension.ts` (68 lines, `v0.2.1`) registers **no** `TreeDataProvider` — only `createDiagnosticCollection` + `createFileSystemWatcher` for `onDidChange` only.
- `extensions/vscode/README.md` (31 lines, `v0.2.1`) claims Readiness tree, Problems `ACKITxxx`, “instructions for current file”, Tasks/policy/optimize views — not fully implemented.
- `ACKit: Optimize` in `v0.2.1` `src/extension.ts:41-43` = `vscode.window.showInformationMessage("run ackit optimize in terminal")` — no SDK.
- `ACKit: Diagnostics` in `v0.2.1` `src/extension.ts:44-48` = shows `graph.nodes.length` only, not real diagnostics.
- `package.json` `scripts.test` = `node ./out/test/runTest.js` but `out/test/runTest.js` + `src/test/**` do not exist.
- `src/extension.ts` uses `workspaceFolders?.[0]` only, no `getWorkspaceFolder(activeEditor)`; watcher only `onDidChange` (missing `onDidCreate`/`onDidDelete`), single root, no debounce coalescing per-root, no `AbortController` cancellation.
- No `services/ackitWorkspace.ts` layer — every tree node would recompute whole repo.

Verified via `cat extensions/vscode/src/extension.ts` (68 lines), `cat extensions/vscode/package.json` (views 3, commands 4), `ls extensions/vscode/src/test` (not found), `grep -R "TreeDataProvider" extensions/vscode/src` (0 hits).

## Goal

- All 3 manifest views (`ackit.readiness`, `ackit.findings`, `ackit.graph`) have real providers + the additional `ackit.tasks`/`ackit.policy`/`ackit.optimize` views (or README corrected if intentionally command-only).
- Problems correctly mapped, current-file instructions real, Optimize/Diagnostics real, state model reusable, multi-root, watch correct.

## In scope

- Create `extensions/vscode/src/services/ackitWorkspace.ts`:
  - `getRoots(): string[]` (all `workspaceFolders`), `getRootForActiveEditor(): string|undefined` (via `workspace.getWorkspaceFolder(activeEditor.document.uri)`), `getSnapshot(root?)`, `refreshAll()`, `refreshRoot(root)`, `onDidChange` event, `dispose`.
  - Cache per-root: `scan: ScanResult|null`, `readiness: ScoreReport|null`, `graph: InstructionGraph|null`, `diagnostics: {config, tasks, policy}|null`, `optimize: OptimizeSuggestion[]|null`, `error`, `updatedAt`.
  - `scanRepository`, `scoreRepository`, `buildInstructionGraph`, `buildContextPack`, `validateSkills`, `loadAckitConfig`, `analyzeOptimize` (new SDK) via shared core, not reimplemented.
  - Debounce 400ms coalesced, `AbortController` cancels in-flight, ignores `.git`/`node_modules`/`dist`/`.ackit`/etc. via `walk` limits, no network.
  - `FileSystemWatcher` for `onDidCreate` + `onDidChange` + `onDidDelete` (single debounced `scheduleRefresh`), `onDidChangeWorkspaceFolders` → `scheduleRefresh`, `window.onDidChangeActiveTextEditor` → `onDidChange("graph")`.

- Update `extensions/vscode/src/extension.ts` (feature-complete):
  - `ReadinessProvider` (`ackit.readiness`): `vscode.TreeDataProvider`, uses `scoreRepository` inputs, shows `Overall 88/100` + 6 categories + expandable deductions, `tooltip`/`description`, `ThemeIcon` pass/warning, refresh on `service.onDidChange`, loading/error/empty states, `ACKit: Show Readiness` + `ACKit: Refresh`.
  - `FindingsProvider` (`ackit.findings`): real `scan.findings`, optional severity grouping, `ruleId`/`relativePath`/`message`, `tooltip`, `command: ackit.openFinding` to open file at `line`/`column` (clamped), `ackit.findings` view.
  - `Problems` integration: `vscode.languages.createDiagnosticCollection("ackit")`, `refreshDiagnostics()` maps `severity` → `DiagnosticSeverity` (critical/high→Error, medium→Warning, low→Information, else Hint), `vscode.Uri.joinPath` + `isInsideRoot` safe path, `line`/`column` `Math.max(0, (line??1)-1)`, skips `relativePath` `"\0"` or outside root, atomic `clear` + `set` per `Uri`, no crash on repository-level findings.
  - `GraphProvider` (`ackit.graph`): `buildInstructionGraph` nodes, `ackit.graph` view, `ACKit: Instructions for Current File` uses `buildInstructionGraph` + `resolveEffectiveStack` (provider `codex`, `forPath` from active editor's `path.relative(root, file).split(sep).join(posix.sep)`), checks `workspace.getWorkspaceFolder`, shows ordered `chain` + `perNode.why`/`provenance`, `provider`/`scope`/`conflicts`/`shadowing`, QuickPick + `showTextDocument`.
  - `TasksProvider` (`ackit.tasks`), `PolicyProvider` (`ackit.policy`), `OptimizeProvider` (`ackit.optimize`): real `optimize` via `analyzeOptimize` (SDK), shows `severity`/`category`/`message`/`tokenWasteEstimate`/`evidencePaths`/`remediation`, `plan.diff` preview via `openTextDocument({content: diff, language: "diff"})`, no silent writes, respects `fixable`+`dryRun`.
  - `Diagnostics` (`ACKit: Diagnostics`): real `loadAckitConfig` + `TaskStore` + policy summary as JSON (`config health`, `tasks`, `policy`), opens `json` doc, no node-count placeholder, no auto-upload.
  - Watch: `onDidCreate`/`onDidChange`/`onDidDelete` single debounced, per-root, `AbortController`, lazy `setTimeout(refreshAll, 800)` after `onStartupFinished` (non-blocking).

- Architecture rule: `VS Code UI → public ACKit SDK → shared deterministic core`. If `analyzeOptimize` not in SDK, expose minimal stable `analyzeOptimize(root, {signal, maxTokens, profile})` with typed errors, `AbortSignal` <200ms, no `process.exit`, backwards compat, contract test update, docs.

- `extensions/vscode/package.json` `contributes.views` + `contributes.commands` updated to match implemented UI (add `ackit.tasks`, `ackit.policy`, `ackit.optimize` views + `ackit.showReadiness`, `ackit.openFinding`, `ackit.instructionsForCurrentFile`).

## Out of scope

- Reimplementing scanner/readiness/graph in extension (must use SDK).
- Shelling out to `ackit` binary for Optimize/Diagnostics unless ADR explicitly permits.
- Adding telemetry, remote LLM, cloud, vector DB.
- Deleting advertised functionality from docs without architecture review (fix docs only if B is chosen in §10).

## Affected files

- `extensions/vscode/src/services/ackitWorkspace.ts` (new)
- `extensions/vscode/src/extension.ts` (rewrite, ~400 lines, 6 providers, 7 commands, Problems, watch)
- `src/index.ts` (expose `analyzeOptimize` + `OptimizeSuggestion`/`AnalyzeOptions` with `signal`)
- `src/core/context/optimize.ts` (`AnalyzeOptions.signal`, `AbortError` checks, `buildInstructionGraph` with `signal`)
- `extensions/vscode/package.json` (add `ackit.tasks`/`ackit.policy`/`ackit.optimize` views, `ackit.showReadiness`/`ackit.openFinding`/`ackit.instructionsForCurrentFile` commands)
- `extensions/vscode/README.md` (updated in TASK-0037, but this task's functional claims depend on it)

## Technical design

- `ackitWorkspace.ts`: `Map<string, Snapshot>`, `EventEmitter<string>`, `FileSystemWatcher("**/*")` with 3 events, `debounce 400ms`, `AbortController` per `refreshRoot`, `scanRepository({canonicalPath: root}, {signal})` etc., `scoreRepository` with `graph`+`pack`+`scan`+`skills`+`policy`+`tasks`, `analyzeOptimize({canonicalPath: root}, {signal})`.
- `extension.ts`: `ReadinessProvider` reads `snapshot.readiness` (`overall`, `categories[]`), `FindingsProvider` groups by `severity`, `GraphProvider` lists `graph.nodes`, `OptimizeProvider` lists `snapshot.optimize`, `TasksProvider`/`PolicyProvider` show diagnostics summary, `refreshDiagnostics` maps severity correctly and uses `path.isAbsolute` + `isInsideRoot` + `vscode.Uri.file` + `vscode.Uri.joinPath` lock, `ackit.instructionsForCurrentFile` uses `resolveEffectiveStack(graph, "codex", forPath, {detailed:true})`.
- SDK: `src/index.ts` `export { analyzeOptimize } from "./core/context/optimize.js"` + types, `tests/contract/api-surface` allowlist adds `analyzeOptimize`.

## Tests

- Unit: `extensions/vscode/src/test/suite/unit.test.ts` (tree models, severity mapping, path/range, multi-root selection, debounce, error states) — TDD `suite`/`test`.
- Integration: `extensions/vscode/src/test/suite/extension.test.ts` (11 checks: activate, container, readiness, findings, Problems, current-file, graph, optimize, diagnostics, refresh create/change/delete, no crash) via `@vscode/test-electron` + disposable fixture (`test-fixture/AGENTS.md`).
- Harness: `extensions/vscode/src/test/runTest.ts` (`runTests` with `extensionDevelopmentPath`, `extensionTestsPath`, `launchArgs: [workspacePath, "--disable-extensions"]`), `tsconfig.test.json` (`outDir: out`, `rootDir: src`), `package.json` `scripts.test: npm run compile:test && node ./out/test/runTest.js`.

## Security

- No network: `scripts/check-offline-egress.mjs` already includes `extensions/vscode/src/**` (reject `fetch` remote, `http` client, telemetry, remote fonts).
- No `process.exit`, typed `AckitError`, `AbortSignal` for new SDK.
- `vscode.Uri.joinPath` + `isInsideRoot` prevents traversal.

## Acceptance criteria

- [x] `services/ackitWorkspace.ts` exists, handles multi-root, debounce, cancellation, disposal, offline
- [x] `ackit.readiness` provider real (Overall + 6 categories + deductions, no fake score, N/A preserved)
- [x] `ackit.findings` provider real (grouped, ruleId/path, click opens file, Problems severity mapped correctly, safe path, no crash)
- [x] `ackit.graph` provider real + `ACKit: Instructions for Current File` via `buildInstructionGraph`+`resolveEffectiveStack` (active editor, workspace check, ordered stack, provenance)
- [x] `ACKit: Optimize` real via `analyzeOptimize` SDK (severity/priority, token-waste, evidence, remediation, preview diff, dry-run, no silent writes)
- [x] `ACKit: Diagnostics` real (config/tasks/policy/environment, JSON, no node-count, no auto-upload)
- [x] `ackit.tasks`/`ackit.policy`/`ackit.optimize` views or README corrected to distinguish views vs commands (no false view claims)
- [x] Watch `onDidCreate`+`onDidChange`+`onDidDelete` single debounced, ignores `dist`/`.ackit`, cancels stale, lazy `onStartupFinished` not blocking
- [x] Multi-root: `getRootForActiveEditor()` uses `getWorkspaceFolder`, per-root snapshots, watcher per root, tests cover `workspaceFolders?.[0]` anti-pattern
- [x] `package.json` views/commands match implemented UI, no shell-out unless ADR permits, SDK coupling correct

## Risks

- `scoreRepository` requires pack/skills/policy — use minimal valid inputs as in `dashboard/server.ts` (pack 50000, empty policy, taskHealth).
- `resolveEffectiveStack` needs `ProviderId` — use `"codex"` for current-file, handle `detailed:true` shape.
- `analyzeOptimize` previously not exported — expose minimal stable API, update contract test.

## Rollback plan

Revert `src/extension.ts` + `src/index.ts` + `src/core/context/optimize.ts` + `services/ackitWorkspace.ts` via `git revert`; extension reverts to terminal-message behavior but manifest still claims features — README must then be corrected to B.

## Completion notes

2026-08-27 — functional contract remediated + CI root-causes fixed.

**Service:** `extensions/vscode/src/services/ackitWorkspace.ts` 166 lines — `getRoots()`, `getRootForActiveEditor()` via `workspace.getWorkspaceFolder(activeEditor.document.uri)`, `Map<string,WorkspaceSnapshot>`, `EventEmitter<string>`, `FileSystemWatcher "**/*"` for `onDidCreate`/`onDidChange`/`onDidDelete` single debounced 400 ms `scheduleRefresh()`, `AbortController` per `refreshRoot`, `onDidChangeWorkspaceFolders` + `onDidChangeActiveTextEditor` → `graph`, `scanRepository/scoreRepository/buildInstructionGraph/buildContextPack/validateSkills/loadAckitConfig/analyzeOptimize` via shared SDK, cache per-root `scan/readiness/graph/diagnostics/optimize/error/updatedAt`, lazy `setTimeout(refreshAll,800)` non-blocking, `dispose()` clears timer + abort.

**Providers (extension.ts 425 lines, 6 providers, 7 commands):**
- `ReadinessProvider` (`ackit.readiness`): `vscode.TreeDataProvider`, `scoreRepository` inputs, `Overall 88/100` + 6 categories (`instructions/security/contextEfficiency/taskHygiene/skills/policy`) expandable deductions (10), `ThemeIcon` pass/warning, `tooltip`/`description`, `service.onDidChange` refresh, loading/error/empty states, `ACKit: Show Readiness` + `Refresh`.
- `FindingsProvider` (`ackit.findings`): `scan.findings` grouped by severity (`critical/high/medium/low/info`), `ruleId`/`relativePath`/`message`, `tooltip`, `command ackit.openFinding` opens file at clamped `line/col`.
- `Problems`: `vscode.languages.createDiagnosticCollection("ackit")`, `refreshDiagnostics()` maps `critical/high→Error, medium→Warning, low→Information, else Hint`, `path.isAbsolute` + `isInsideRoot` + `vscode.Uri.file` + `Uri.joinPath` safe, `Math.max(0,(line??1)-1)`, skips `\0` or outside root, atomic `clear`+`set` per `Uri`, no crash repository-level.
- `GraphProvider` (`ackit.graph`): `buildInstructionGraph` nodes (100), `provider`/`precedence`/`provenance`, `ackit.showGraph` QuickPick.
- `Instructions for Current File` (`ackit.instructionsForCurrentFile`): active editor `getWorkspaceFolder`, `path.relative(root,file).split(sep).join(posix.sep)`, `buildInstructionGraph` + `resolveEffectiveStack(graph,"codex",forPath,{detailed:true})`, ordered `chain` + `perNode.why/provenance`, `provider/scope`, QuickPick.
- `TasksProvider`/`PolicyProvider`/`OptimizeProvider` (`ackit.tasks/policy/optimize`): `analyzeOptimize` via SDK shows `severity/category/message/tokenWasteEstimate/evidencePaths/remediation`, `plan.diff` preview via `openTextDocument({content:diff,language:"diff"})`, no silent writes, `fixable`+`dryRun`.
- `Diagnostics` (`ackit.diagnostics`): `loadAckitConfig` + tasks/policy JSON, `openTextDocument({content:JSON,language:"json"})`, no node-count placeholder, no auto-upload.
- Watch: single debounced coalesced, ignores via walk limits, cancels stale, lazy `onStartupFinished`.
- Multi-root: `getRootForActiveEditor()` prefers active editor folder, `getRoots()` all `workspaceFolders`, per-root snapshots, watcher per root, unit.test.ts multi-root selection test.

**SDK coupling:** `src/index.ts` exports `analyzeOptimize` + `AnalyzeOptions`/`OptimizeSuggestion` (sorted via biome), `src/core/context/optimize.ts` `AnalyzeOptions.signal` + `AbortError` checks + safe `last.id` without non-null assertion (fixed `suggestions[suggestions.length-1]!.id` → guarded `last`).

**Package:** `extensions/vscode/package.json` 6 views (`readiness/findings/graph/tasks/policy/optimize`) + 7 commands (`refresh/showGraph/showReadiness/openFinding/instructionsForCurrentFile/optimize/diagnostics`), `activationEvents onStartupFinished`, `publisher Cynrath`, `displayName ACKit Toolkit`, `icon images/icon.png`, `main dist/extension.js`.

**CI root-cause fixes (follow-up to 640e733):**
- `pnpm lint` 1 error (`src/index.ts` organizeImports) + `src/core/context/optimize.ts:304` non-null assertion — fixed via `biome check --write` + guarded `last` block; now `pnpm lint` 0 errors, 49 warnings (pre-existing 50→49, new changes clean).
- Extension typecheck: `vscode/@cynrath/agent-context-kit/@vscode/test-electron/mocha/glob/@types/node+mocha` unresolved due to `pnpm-workspace.yaml` missing `packages` + `tsconfig.json` lacking `types` + CI `pnpm install` order (typecheck before install, `npm install` nested). Fixed via `pnpm-workspace.yaml` `packages: [".","extensions/*"]` + `allowBuilds: esbuild: true`, `extensions/vscode/package.json` `workspace:*` (from `file:../..`), `tsconfig.json` `types: [node,vscode]` `lib: [ES2022,DOM]` + `tsconfig.test.json` `types: [node,vscode,mocha]` `lib: [ES2022,DOM]`, CI `extension` job `pnpm install --frozen-lockfile` (workspace) before `typecheck` via `pnpm --filter ackit-vscode exec tsc`, `esbuild` via filter, `vsce` via filter, `png` preserved. Now `pnpm --filter ackit-vscode exec tsc -p tsconfig.json --noEmit` PASS, `tsconfig.test.json` PASS (previously 68 errors).
- `extensions/vscode/src/test/suite/extension.test.ts` `.catch` on `Thenable` → `try {await} catch {try {await} catch{}}` to satisfy `Thenable` vs `Promise`.
- `tests/contract/ci-pinning.test.ts` `publish` substring false-positive on `publisher` — changed to `/\bpublish\b\s*:/` + `vsce publish` check.
- `tests/contract/readme-parity.test.ts` stale `v0.2.1` expectation → dynamic `pkg.version` (0.2.2) + stale `0.2.1` not present check.

**Evidence:** `pnpm lint` 0 errors, `pnpm typecheck` 0, `pnpm --filter ackit-vscode exec tsc` 0/0, `pnpm build` 0.2.2, `pnpm test` 67 files 361 tests PASS (including `ci-pinning` 19/19, `readme-parity` 4/4, `vscode-icon` 2/2), `vsce package --no-dependencies` `ackit-vscode-0.2.2.vsix` 640323 bytes 12 files `dist/extension.js` 1.0 MB, `icon.png` 256×256 26534 bytes, `offline-egress` 139 files PASS.
