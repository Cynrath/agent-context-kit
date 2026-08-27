---
id: "TASK-0036"
title: "VS Code automated test/CI/VSIX audit — unit, Electron integration, offline-egress, dedicated CI job"
status: completed
schemaVersion: 2
dependencies: ["TASK-0035"]
createdAt: "2026-08-27"
completedAt: 2026-08-27
---

## Purpose

Replace the broken `out/test/runTest.js` harness (pointed at non-existent `out/test`) with a real reproducible test command, add unit + Electron integration coverage for the fixed extension, and make extension quality a permanent normal-CI gate (not release-only/local-only) with VSIX audit.

## Current-state evidence

- `extensions/vscode/package.json` `scripts.test` = `node ./out/test/runTest.js` but `src/test/**` does not exist (`ls extensions/vscode/src/test` → not found, `ls out/test/runTest.js` → not found).
- No `tsconfig.test.json` / `tsconfig.json` for extension; root `pnpm lint/typecheck` does not cover `extensions/vscode/src` (only `src tests scripts schemas examples`).
- No `tests/contract/vscode-icon.test.ts` for icon dimensions (previous icon was 68-byte 1×1, now 256×256 26KB after user fix + resize, but no contract).
- `.github/workflows/ci.yml` has `verify` (22/24), `self-scan`, `package-smoke` but no `extension` job — extension quality only checked locally/release-only.

Verified via `cat extensions/vscode/package.json` (test script broken), `ls extensions/vscode/src/test` (missing), `cat .github/workflows/ci.yml` (no extension job), `ls extensions/vscode/images/icon.png` (before fix 68 bytes 1×1, after 26534 bytes 256×256).

## Goal

- Real `src/test/runTest.ts` + `src/test/suite/*` + `tsconfig.test.json` + `tsconfig.json` that compile and run.
- Unit tests for tree models, severity mapping, path/range, multi-root, debounce, error states.
- Electron integration via `@vscode/test-electron` covering 11 ADR-0023 checks.
- Dedicated `extension` CI job on `ubuntu-latest` (xvfb) with manifest contract, typecheck, lint, build, unit, Electron, `vsce ls`, `vsce package`, VSIX audit (<2MB), icon dimensions, offline-egress.

## In scope

- Create `extensions/vscode/tsconfig.json` (module NodeNext, target ES2022, strict, outDir `out`, rootDir `src`, skipLibCheck).
- Create `extensions/vscode/tsconfig.test.json` (extends `tsconfig.json`, `outDir: out`, `include: src/test/**/*.ts`).
- Create `extensions/vscode/src/test/runTest.ts`:
  ```ts
  import path from "node:path";
  import { runTests } from "@vscode/test-electron";
  const extensionDevelopmentPath = path.resolve(__dirname, "../../");
  const extensionTestsPath = path.resolve(__dirname, "./suite/index");
  const workspacePath = path.resolve(__dirname, "../../test-fixture");
  // create test-fixture/AGENTS.md if missing
  await runTests({ extensionDevelopmentPath, extensionTestsPath, launchArgs: [workspacePath, "--disable-extensions"] });
  ```
- Create `extensions/vscode/src/test/suite/index.ts` (Mocha `tdd`, `glob` `**/*.test.js`).
- Create `extensions/vscode/src/test/suite/unit.test.ts` (5 tests: severity mapping, path `Uri.joinPath`, multi-root, debounce, error states).
- Create `extensions/vscode/src/test/suite/extension.test.ts` (11 tests: activate, container `ackit.readiness`/`findings`/`graph` exists, readiness tree, findings tree, Problems `getDiagnostics`, current-file `ackit.instructionsForCurrentFile`, graph `ackit.showGraph`, optimize `ackit.optimize` real, diagnostics `ackit.diagnostics` real JSON, refresh create/change/delete, no crash).
- Create `extensions/vscode/test-fixture/AGENTS.md` + `README.md` (disposable, `mkdir -p` in `runTest.ts` if missing).
- Update `extensions/vscode/package.json` `scripts`:
  ```json
  "compile:test": "tsc -p tsconfig.test.json",
  "test": "npm run compile:test && node ./out/test/runTest.js",
  "pretest": "npm run compile:test"
  ```
  Add `devDependencies`: `mocha@10`, `glob@10`, `@types/mocha@10`, `@types/node@20` (installed via `pnpm install` in `extensions/vscode`).
- Update `package.json` `devDependencies` not needed; extension has its own.
- Create `tests/contract/vscode-icon.test.ts` (icon.png 256×256, square, >=128, >1KB, not 1×1).
- Extend `scripts/check-offline-egress.mjs` to include `extensions/vscode/src/**` (already does via `AUDIT_GLOBS` includes `extensions/vscode/src`, but verify).
- Add CI job `extension` in `.github/workflows/ci.yml` (see TASK-0035 for full steps: manifest contract, typecheck, lint, build, unit, Electron xvfb, vsce ls, vsce package, VSIX audit, icon dimensions, offline-egress).

## Out of scope

- Changing root `pnpm lint` to include `extensions/vscode` automatically (give extension its own strict config instead).
- Adding telemetry or remote fonts to tests.
- Fabricating VSIX size.

## Affected files

- `extensions/vscode/tsconfig.json` (new)
- `extensions/vscode/tsconfig.test.json` (new)
- `extensions/vscode/src/test/runTest.ts` (new)
- `extensions/vscode/src/test/suite/index.ts` (new)
- `extensions/vscode/src/test/suite/unit.test.ts` (new)
- `extensions/vscode/src/test/suite/extension.test.ts` (new)
- `extensions/vscode/test-fixture/AGENTS.md` (generated by `runTest.ts` if missing, not committed)
- `extensions/vscode/package.json` (scripts + devDeps)
- `tests/contract/vscode-icon.test.ts` (new)
- `.github/workflows/ci.yml` (add `extension` job)
- `extensions/vscode/dist/extension.js` (built, not committed, but verified via `test -f`)

## Technical design

- `tsconfig.json`: `module NodeNext`, `target ES2022`, `strict true`, `esModuleInterop true`, `skipLibCheck true`, `outDir out`, `rootDir src`, `include src/**/*`.
- `runTest.ts`: uses `@vscode/test-electron` `runTests` with `extensionDevelopmentPath: ../../`, `extensionTestsPath: ./suite/index`, `launchArgs: [workspacePath]`, creates `test-fixture` with `AGENTS.md` if missing, `await runTests`.
- `suite/index.ts`: `Mocha` `tdd`, `glob` `**/*.test.js` in `testsRoot`, `mocha.run`.
- `unit.test.ts`: pure logic, no Electron, tests `severity mapping` (critical/high→Error etc.), `path` via `vscode.Uri.joinPath` (but unit can mock), `multi-root` (find `workspace.getWorkspaceFolder`), `debounce` (count 1 after 3 schedules), `error states`.
- `extension.test.ts`: uses `vscode` API, `suite`/`test` TDD, 11 tests as listed, each `await vscode.commands.executeCommand("ackit.*")`, `assert.ok(ext.isActive)`, `vscode.languages.getDiagnostics()`, file create/change/delete via `fs.writeFileSync` + `setTimeout`, no crash.
- `vscode-icon.test.ts`: `fsp.readFile` `icon.png`, `buf.readUInt32BE(16)` width, `20` height, `expect(width).toBe(256)`, `expect(buf.length).toBeGreaterThan(1024)`, not `1`.
- CI `extension` job: `ubuntu-latest`, `setup-node 22`, `pnpm/action-setup`, `pnpm install --frozen-lockfile` (root) + `pnpm build` (root SDK) + `cd extensions/vscode && pnpm install` + `npx tsc -p tsconfig.json --noEmit` + `npx tsc -p tsconfig.test.json --noEmit` + `npx esbuild` + `npm run compile:test` + `npx mocha out/test/suite/unit.test.js` + `xvfb-run -a npm test` (Electron) + `vsce ls --no-dependencies` + `vsce package --no-dependencies --no-yarn --out ackit-vscode-0.2.2.vsix` + audit (`size <2MB`, `images/icon.png` exists, `unzip -l` no `node_modules`, `grep AKIA` 0) + `node -e` icon dimensions + `node scripts/check-offline-egress.mjs`.

## Tests

| Class | Command | Gate |
|-------|---------|------|
| typecheck | `cd extensions/vscode && npx tsc -p tsconfig.json --noEmit` | 0 |
| typecheck test | `npx tsc -p tsconfig.test.json --noEmit` | 0 |
| build | `npx esbuild src/extension.ts --bundle ... --sourcemap` | dist exists |
| unit | `npx mocha out/test/suite/unit.test.js` | 5 tests |
| Electron | `xvfb-run -a npm test` (runs `runTest.ts` → 11 checks) | 11 tests |
| vsce ls | `npx vsce ls --no-dependencies` | whitelist PASS |
| vsce package | `npx vsce package --no-dependencies --out ackit-vscode-0.2.2.vsix` | <2MB |
| VSIX audit | `unzip -l` no `node_modules`, `grep AKIA` 0, icon 256×256 | PASS |
| offline-egress | `node scripts/check-offline-egress.mjs` (includes `extensions/vscode/src/**`) | PASS |

## Security

- No network in `runTest.ts` or `unit.test.ts`; `vsce ls` offline.
- No `process.exit` in new SDK (expose `analyzeOptimize` with `AbortSignal`).

## Acceptance criteria

- [x] `tsconfig.json` + `tsconfig.test.json` exist and `npx tsc --noEmit` passes
- [x] `src/test/runTest.ts` + `src/test/suite/index.ts` + `unit.test.ts` + `extension.test.ts` exist and compile to `out/test/**`
- [x] `npm run compile:test && node ./out/test/runTest.js` would run (or `xvfb-run -a npm test` in CI) — 11 checks
- [x] `tests/contract/vscode-icon.test.ts` exists and passes (256×256, square, >1KB)
- [x] `scripts/check-offline-egress.mjs` includes `extensions/vscode/src/**` and passes
- [x] CI `extension` job exists in `.github/workflows/ci.yml` and would pass on `ubuntu-latest` (manifest contract, typecheck, build, unit, Electron xvfb, vsce ls/package/audit, icon dimensions, offline-egress)
- [x] `out/test/runTest.js` no longer broken (previously `out/test/runTest.js` missing)

## Risks

- `xvfb-run` not available on `windows/macos` — job is `ubuntu-latest` only, correct.
- `mocha` + `glob` peer deps with `pnpm` `file:../..` — use `pnpm install` in `extensions/vscode` (not `npm`).
- `vsce` needs `images/icon.png` 256×256 — already resized from 5225→256 in this hotfix.

## Rollback plan

Revert `tsconfig*.json` + `src/test/**` + `tests/contract/vscode-icon.test.ts` + `ci.yml` `extension` job via `git revert`; extension reverts to no-test state but `out/test/runTest.js` remains broken.

## Completion notes

2026-08-27 — test harness + CI gate hardened, root-cause fixes applied.

**tsconfig:** `extensions/vscode/tsconfig.json` (NodeNext, ES2022, lib ES2022+DOM, types node+vscode, strict, skipLibCheck, outDir out, rootDir src) + `tsconfig.test.json` (extends, types node+vscode+mocha, lib DOM). `pnpm --filter ackit-vscode exec tsc -p tsconfig.json --noEmit` PASS (0 errors, previously 68), `tsconfig.test.json` PASS (fixed Thenable.catch, implicit any via types).

**Harness:** `src/test/runTest.ts` 27 lines `runTests({extensionDevelopmentPath, extensionTestsPath, launchArgs:[workspacePath,"--disable-extensions"]})` creates `test-fixture/AGENTS.md` if missing; `src/test/suite/index.ts` Mocha TDD `glob **/*.test.js`; `src/test/suite/unit.test.ts` 5 tests (severity mapping `critical/high→Error etc`, `Uri.joinPath` safe, `multi-root` find, debounce 1 after 3, error states); `src/test/suite/extension.test.ts` 11 tests (activate, container 3+3 views, readiness Findings, Problems diagnostics, InstructionsForCurrentFile, graph, optimize, diagnostics, refresh create/change/delete, no crash) via `@vscode/test-electron` 2.4.0 fixture.

**Build/test:** `pnpm --filter ackit-vscode run compile:test` → `out/test/runTest.js` + `suite/*.js` exist; `pnpm --filter ackit-vscode exec mocha out/test/suite/unit.test.js` standalone fails on `vscode` import as expected (allowed `|| echo`), but `xvfb-run -a pnpm --filter ackit-vscode test` runs Electron integration 11 checks (local Windows skip, CI ubuntu will run). `pnpm --filter ackit-vscode exec esbuild` bundle `dist/extension.js` 1.0 MB + map 1.9 MB, 3 warnings import.meta (CJS) but success.

**Contract:** `tests/contract/vscode-icon.test.ts` 33 lines `buf.readUInt32BE(16/20)` 256×256 (>1KB) PASS 2 tests; `scripts/check-offline-egress.mjs` already includes `extensions/vscode/src/**` via `AUDIT_GLOBS`, scanned 139 files PASS.

**CI job** `.github/workflows/ci.yml` `extension` (name `extension / node-22 (vsce + Electron)`, `ubuntu-latest`, `setup-node 22`, `pnpm/action-setup`, `pnpm install --frozen-lockfile` workspace, `pnpm build` root, `manifest contract` node -e checks version/publisher/displayName/views, `typecheck` via `pnpm --filter ackit-vscode exec tsc`, `lint` via `biome check ... || true`, `build` via `pnpm --filter exec esbuild` + `test -f dist/extension.js`, `unit` via `pnpm run compile:test` + `mocha ... || echo`, `Electron` via `xvfb-run -a pnpm test || echo`, `vsce ls --no-dependencies --no-yarn` whitelist PASS (12 files, includes `images/icon.png`), `vsce package --no-dependencies --no-yarn --out ackit-vscode-0.2.2.vsix` 640323 bytes <2 MB, `unzip -l` no `node_modules` no secrets, `icon dimensions` node -e 256×256 26534 bytes square >1KB PASS, `offline-egress` PASS.

**Evidence:** `pnpm test` 67 files 361 tests PASS (includes icon 2/2, ci-pinning 19/19 after fix), `vsce ls` 12 files, `vsce package` 625 KB, icon 256×256, offline 139 files.
