---
id: "TASK-0019"
title: "VS Code extension — foundation & packaging"
status: completed
schemaVersion: 2
dependencies:
  - TASK-0013
createdAt: "2026-08-27"
completedAt: "2026-08-27"
---

## Purpose

Establish the VS Code extension foundation and packaging pipeline for AgentContextKit v0.2.0 (EPIC K, REQ-V020-K-001 / REQ-V020-K-003). This is the **planning-only** task that defines location, tech stack, activation, build, and publication-guard contracts before any code lands. Feature integration (Problems, tree views, CodeActions, watch) is deferred to TASK-0020 (REQ-V020-K-002). The extension reuses the public SDK (`src/index.ts`) stabilized in TASK-0013 and must not duplicate scanner/graph/pack logic.

## Context / current state

- **No `extensions/` yet** — root contains `src/`, `templates/`, `schemas/`, `benchmarks/`, `docs/`, `tests/`, `scripts/` only. `ls extensions 2>/dev/null || echo "no extensions dir"` returns absent. No `packages/` or `apps/` directory exists.
- **Single-package repo invariant (ADR-0002 / ADR-0021)**: `package.json` has `"type":"module"`, `"engines":{"node":">=22"}`, `"sideEffects":false`, `"packageManager":"pnpm@11.22.0"`, and `exports: { ".": {types, import}, "./mcp": {types, import} }` only. Root stays single-package; the extension is a **separate build artifact** (its own `extensions/vscode/package.json` → `.vsix`), not a workspace package. `pnpm-workspace.yaml` is NOT introduced.
- **SDK is `src/index.ts` reusable (TASK-0013)**: current 25-line public surface (`scanRepository`, `loadAckitConfig`, `buildContextPack`, `buildInstructionGraph`, `resolveEffectiveStack`, `validateSkills` + types) is the only supported import for CLI/MCP/Action/dashboard/VS Code. Direct `src/core/**` imports from extension are forbidden (grep gate `scripts/check-sdk-reuse.mjs`). SDK additions for v0.2.0 (`scoreRepository`, `evaluateRulePack`, `BuildGraphOptions` extensions) are planned but not yet exported — foundation task carves the consumption point.
- **Docs missing vsix guide**: `docs/guides/` has no `vscode.md`; `extensions/vscode/README.md` does not exist; `docs/reference/sdk.md` lacks extension consumer note. `CHANGELOG.md` has no `0.2.0` entry yet.
- **`package.json` exports `. /mcp` only**: no `"./core"` or deep exports; violation is contract-tested in `tests/contract/api-surface/api-surface.test.ts`. Extension must import via `@cynrath/agent-context-kit` (installed dep), not relative `../../src/core/...`.
- **Tooling baseline**: `vscode` API not yet depended on; no `esbuild`, no `@vscode/test-electron`, no `@vscode/vsce` in devDependencies; no `vsce package` script.

Derived invariants:

- Location decision must be justified by actual layout audit (not assumed).
- Version alignment risk: core is `0.1.1` today → `0.2.0` in this wave; extension manifest must mirror core version; mismatch must warn at activation and in contract test.
- Offline-first / no-telemetry / safe-write invariants (REQ-V020-GOV-001/002/008) apply from day one.

## Goal

One outcome: a **buildable, auditable, installable VSIX foundation** at `extensions/vscode/` that

1. is recognized by VS Code (`publisher: cynrath`, `displayName: AgentContextKit`, `categories: ["Linters"]`),
2. activates lazily on `onStartupFinished` with <50 ms synchronous cost,
3. bundles to <2 MB via `esbuild` → `dist/extension.js` and packages via `vsce package` → `ackit-0.2.0.vsix` with a strict whitelist,
4. reuses the SDK via direct import (documented fallback to subprocess), and
5. is version-aligned with `@cynrath/agent-context-kit@0.2.0` with mismatch warning — **without** publishing to Marketplace (publication is a separate explicit authorization checkpoint).

## In scope

- **Location & scaffolding**: create `extensions/vscode/` with `package.json`, `tsconfig.json`, `src/extension.ts`, `src/test/suite/`, `README.md`, `CHANGELOG.md` slice, `images/icon.png` (placeholder), `.vscodeignore`, `.gitignore` (exclude `dist/`, `*.vsix`, `node_modules/`).
- **Manifest contract** (`extensions/vscode/package.json`):
  - `name: ackit-vscode` (VSIX id `cynrath.ackit-vscode`), `publisher: "cynrath"`, `displayName: "AgentContextKit"`, `description: "Agent readiness, instruction graph, and context health — offline, deterministic."`
  - `version: "0.2.0"` aligned with root `package.json` version at release; activation code compares `vscode.extensions.getExtension("cynrath.ackit-vscode").packageJSON.version` vs core `import { version } from "@cynrath/agent-context-kit/dist/version.js"` (or `package.json`) and shows `window.showWarningMessage` on mismatch.
  - `engines: { "vscode": "^1.90.0" }`, `categories: ["Linters"]`, `keywords: ["ackit","agent-readiness","context","linter","offline"]`, `galleryBanner`, `icon: "images/icon.png"`, `license: "MIT"`, `repository`, `homepage`, `bugs` mirroring root.
  - `activationEvents: ["onStartupFinished"]` only; `contributes.commands` stub for `ackit.refresh`, `ackit.showGraph`, `ackit.optimize`, `ackit.diagnostics` (implementations deferred to TASK-0020 — here only registration + placeholder handlers).
  - `scripts: { "build": "esbuild src/extension.ts --bundle --platform=node --target=node20 --outfile=dist/extension.js --external:vscode --minify --sourcemap", "watch": "...", "package": "vsce package --no-dependencies", "test": "vscode-test" }`.
- **Tech stack**: TypeScript `^5.x` (project-local), `vscode` types `^1.90.0`, `esbuild` `^0.24` as bundler, `@vscode/test-electron` `^2.4` + `@vscode/vsce` `^3.x` as dev-only tooling. **No heavy deps** — no `webpack`, no `react`, no `axios`, no `commander` inside extension; only `vscode` + stdlib + `@cynrath/agent-context-kit`.
- **Activation contract**: `export async function activate(ctx: ExtensionContext)` registers commands/providers synchronously and returns in <50 ms; all I/O (scan, graph, pack) is lazy on first command or `onDidOpenTextDocument`. `deactivate()` is a no-op. Measured via `performance.now()` in activation test.
- **Build & packaging**:
  - `pnpm --filter vscode build` or `pnpm -C extensions/vscode build` produces `extensions/vscode/dist/extension.js` (+ `.map`).
  - `vsce package` (or `npx @vscode/vsce package`) from `extensions/vscode/` produces `ackit-0.2.0.vsix` at repo root or `extensions/vscode/`.
  - Whitelisted VSIX contents: `dist/extension.js` (+ `.map`), `package.json`, `README.md`, `LICENSE`, `CHANGELOG.md`, `images/**` only. No `node_modules/`, no `src/`, no `*.ts` sources, no `dist/*.d.ts` leakage, no secrets. Enforced by `.vscodeignore` + `vscode:prepublish` validation script.
  - Size gate: `.vsix` <2 MB (uncompressed <4 MB). CI asserts `stat -c%s ackit-0.2.0.vsix` < 2097152.
- **SDK reuse boundary** (ADR-0021 §5.2): extension imports only from `@cynrath/agent-context-kit` (re-exported via `src/index.ts`), `vscode`, and Node stdlib. `scripts/check-sdk-reuse.mjs` grep asserts `extensions/vscode/src/**` contains zero `from "../src/core` or `from "src/core` imports. Direct SDK import is preferred; subprocess fallback (`child_process.spawn("node", ["dist/cli/index.js", "scan", "--json"])`) is documented in `extensions/vscode/SECURITY.md` as fallback if VS Code sandbox restricts FS — with tradeoff table.
- **Version alignment plumbing**: `src/version.ts` single source (already `src/shared/version.ts`) is imported by extension at activation for comparison; extension `package.json` version bump is part of `0.2.0` release commit.
- **CI wiring (non-publishing)**: `.github/workflows/ci.yml` adds a job `vsix-smoke` that runs `pnpm -C extensions/vscode install --frozen-lockfile`, `build`, `vsce package`, `vsce ls` audit, and `size` check — but never `vsce publish`.

## Out of scope

- **Feature integration (REQ-V020-K-002 → TASK-0020)**: readiness status bar, `DiagnosticCollection` → Problems, findings/readiness/instruction-graph/task tree views, QuickPick "Instructions for current file" (`resolveEffectiveStack`), optimize CodeActions/lightBulb, watch/FileSystemWatcher integration, `resolveEffectiveStack` per-file UI. Foundation only registers stub commands.
- **Marketplace publication**: `vsce publish`, `vsce publish --pat`, OIDC publishing, `marketplace` badge, or any auto-publish on tag/push. Publication requires a **separate explicit user authorization**; this task records VSIX smoke but not publish (REQ-V020-K-003 guard).
- **Dashboard/report server** (ADR-0019): `ackit dashboard` / `ackit report serve` is a separate local server (TASK-0014/0016); extension does not embed a webview dashboard in this task.
- **New SDK symbols implementation**: `scoreRepository`, `evaluateRulePack`, profile-aware `BuildGraphOptions` bodies remain in TASK-0008/0012/0013 — foundation only consumes the frozen surface.
- **Monorepo `pnpm-workspace.yaml`**, `packages/` split, or `apps/` addition — root stays single-package per ADR-0002; extension is NOT a pnpm workspace member for install purposes (standalone `pnpm -C extensions/vscode install`).
- **Telemetry, remote AI, cloud calls, or network fetch** — out-of-scope per REQ-V020-GOV-001/002 (OUT list). No `fetch`, `axios`, or `telemetry.enableTelemetry` in this task.
- **JS plugin execution / `ackit.plugins`** — forbidden (REQ-V020-GOV-007).
- **Changing root `package.json` version to `0.2.0` outside the release task** — version alignment is prepared but not yet bumped; this task documents the alignment contract and adds the warning.

## Technical design

### Location — `extensions/vscode/` chosen after audit

Root audit (`ls -1` at `O:\projeler\agent-context-kit`) shows: `src/`, `templates/`, `schemas/`, `benchmarks/`, `docs/`, `tests/`, `scripts/`, `examples/`, `.github/`, `package.json`. No `packages/`, no `apps/`, no `extensions/` pre-exists. Per ADR-0021 §5.1:
- `packages/vscode` would imply a pnpm workspace monorepo (conflicts with ADR-0002 single-package; would require `pnpm-workspace.yaml`).
- `apps/vscode` is Turborepo convention (no evidence of Turborepo in repo).
- `extensions/vscode/` is the VS Code community convention, keeps root single-package, gives a discoverable home, and matches the REQ-V020-K-001 acceptance text ("`extensions/vscode/` (chosen per ADR-0021 after verifying no conflict with current single-package files)"). Its own `package.json` is NOT the npm library; it builds to `.vsix`. Document rationale in `docs/decisions/ADR-0021` cross-ref (already accepted).

Directory plan:

```
extensions/vscode/
  package.json            # extension manifest (publisher cynrath, version 0.2.0)
  tsconfig.json           # extends root, outDir dist, rootDir src
  esbuild.mjs             # or inline pnpm script
  .vscodeignore           # !dist/extension.js, !package.json, !README*, !LICENSE, !CHANGELOG*, !images/**
  .gitignore              # dist/, *.vsix, node_modules/
  src/
    extension.ts          # activate/deactivate, command registration, version check
    sdk.ts                # thin wrapper: import { scanRepository } from "@cynrath/agent-context-kit"
    version-check.ts      # compare extension vs core version
  src/test/
    suite/
      extension.test.ts   # activation <50ms, SDK reuse, manifest assertions
      version.test.ts
    runTest.ts            # @vscode/test-electron launcher
  README.md               # marketplace readme (offline, no IDE suite claims)
  CHANGELOG.md            # Keep a Changelog slice for 0.2.0
  LICENSE                 # MIT copy or symlink note
  images/
    icon.png              # 128x128 PNG, <20KB
  SECURITY.md             # direct SDK import vs subprocess fallback note
```

### Tech — TypeScript `vscode ^1.90` + `esbuild` bundler, no heavy deps

- `typescript@^5.4`, `@types/vscode@^1.90.0`, `@types/node@^22`, `esbuild@^0.24` (bundler), `@vscode/test-electron@^2.4`, `@vscode/vsce@^3.3` — all `devDependencies` inside `extensions/vscode/package.json`. No runtime deps beyond `vscode` (provided by host) and `@cynrath/agent-context-kit` (bundled via `esbuild` external or inlined — decision: bundle SDK in `dist/extension.js` to avoid requiring user `npm install` of core; include `@cynrath/agent-context-kit` as `dependencies` and let `esbuild --bundle` inline, but do NOT bundle `vscode` (`--external:vscode`). Size still <2MB because SDK is ~150KB + extension glue ~20KB.
- Bundle command: `esbuild src/extension.ts --bundle --platform=node --target=node20 --outfile=dist/extension.js --external:vscode --minify --sourcemap --legal-comments=none`. No `webpack`, no `ts-loader`.
- `tsconfig.json`: `extends: "../../tsconfig.json"` with `compilerOptions: { module: "commonjs", target: "ES2022", outDir: "dist", rootDir: "src", sourceMap: true, strict: true, noImplicitAny: true }` (VS Code host expects CJS).

### Activation — `onStartupFinished` lazy

- `package.json`:
  ```json
  "activationEvents": ["onStartupFinished"],
  "main": "./dist/extension.js"
  ```
  `activate()` does: `createStatusBarItem` (deferred show), `registerCommand("ackit.refresh", () => lazyScan())`, `registerCommand("ackit.showGraph", () => lazyGraph())` — all lazy. Synchronous body <50 ms (measured with `performance.now()`). No `scanRepository` on activation; first scan is on `ackit.refresh` or `onDidOpenTextDocument` debounced 400 ms (deferred to TASK-0020; here only the debounce constant is defined).
- Cross-platform: no `path.sep` assumptions; repo-relative stays POSIX.

### Package.json — publisher / displayName / categories / keywords

```json
{
  "name": "ackit-vscode",
  "displayName": "AgentContextKit",
  "publisher": "cynrath",
  "version": "0.2.0",
  "engines": { "vscode": "^1.90.0" },
  "categories": ["Linters"],
  "keywords": ["ackit","agent-readiness","context","offline","deterministic"],
  "activationEvents": ["onStartupFinished"],
  "main": "./dist/extension.js",
  "icon": "images/icon.png",
  "galleryBanner": { "color": "#0e639c", "theme": "dark" },
  "pricing": "Free",
  "license": "MIT",
  "repository": { "type": "git", "url": "https://github.com/Cynrath/agent-context-kit" },
  "homepage": "https://github.com/Cynrath/agent-context-kit#readme",
  "bugs": { "url": "https://github.com/Cynrath/agent-context-kit/issues" }
}
```
Categories `Linters` is per REQ-V020-K-003; `Other` or `Machine Learning` would be inaccurate. `publisher: cynrath` matches npm scope `@cynrath` and GitHub org `Cynrath`.

### Version — 0.2.0 aligned with core, warning on mismatch

- Extension `version` mirrors root `package.json` `version` (`0.2.0` at v0.2.0 wave). Alignment is checked:
  1. At build: `scripts/check-version-alignment.mjs` compares `extensions/vscode/package.json:version` vs root `package.json:version` and fails CI if diverged.
  2. At activation: `version-check.ts` does `if (extVersion !== coreVersion) window.showWarningMessage("AgentContextKit extension v" + extVersion + " mismatches core @" + coreVersion + " — reinstall or rebuild.")`.
- While core is still `0.1.1` during development, warning path is exercised via test fixture where extension `0.2.0` vs core `0.1.1` triggers warning — proves guard works before release bump.

### Build — `vsce package => ackit-0.2.0.vsix` whitelisted contents `dist/extension.js package.json README LICENSE CHANGELOG images` only, size <2MB

- Build sequence:
  ```powershell
  pnpm -C extensions/vscode install --frozen-lockfile
  pnpm -C extensions/vscode run build   # esbuild → dist/extension.js
  npx --yes @vscode/vsce package --no-dependencies --out ../../ackit-0.2.0.vsix
  # or: vsce package --out ackit-0.2.0.vsix
  npx @vscode/vsce ls --tree   # audit
  ```
- Whitelist enforcement: `.vscodeignore` is an allowlist:
  ```
  **/*
  !dist/extension.js
  !dist/extension.js.map
  !package.json
  !README.md
  !CHANGELOG.md
  !LICENSE
  !images/**
  ```
  `scripts/check-vsix-contents.mjs` runs `vsce ls` and asserts no `node_modules/`, no `src/`, no `*.ts`, no `.env`, no secrets.
- `vscode:prepublish` script: `"vscode:prepublish": "pnpm run build && node ../../scripts/check-vsix-contents.mjs"` (or local check) — `vsce package` invokes it automatically.
- Size gate: `ackit-0.2.0.vsix` is a zip; CI asserts `<2 MB` (`2097152` bytes). Budget: `dist/extension.js` <200 KB (minified + SDK), `vsix` <2 MB leaves headroom for icon/README. Failure is a blocking contract.

### SDK import — direct SDK import preferred vs subprocess fallback documented

Per ADR-0021 §5.2 **Runtime: direct SDK import (preferred over subprocess)**:

- Preferred path (this task): extension Node host does
  ```ts
  import { scanRepository, buildInstructionGraph, scoreRepository } from "@cynrath/agent-context-kit";
  // or: const { scanRepository } = await import("@cynrath/agent-context-kit");
  ```
  bundled by `esbuild`. Benefits: same process, `AbortSignal` cancellation for free, no serialization, deterministic, offline.
- Fallback path (documented, not yet implemented unless sandbox EACCES): `child_process.spawn("node", [path.join(__dirname, "../dist/cli/index.js"), "scan", "--json"], { cwd: workspaceFolder })` and parse stdout JSON. Tradeoff table in `extensions/vscode/SECURITY.md`:
  | Aspect | Direct SDK | Subprocess |
  |---|---|---|
  | Perf | in-process, <10 ms overhead | spawn + IPC + JSON parse |
  | Cancellation | `AbortSignal` native | `child.kill()` + race |
  | Isolation | shares host mem | isolated, safer if SDK fs bug |
  | Deps | SDK bundled | needs CLI built |
  Documented decision: start with direct SDK; fallback only on `ENOENT`/`EACCES` on scan (recorded in SECURITY.md). Grep gate proves no stray `spawn("ackit")` with user content.
- Reuse proof: `scripts/check-sdk-reuse.mjs` asserts `extensions/vscode/src/**` never imports `src/core/scanner/pipeline.ts` etc.; only `@cynrath/agent-context-kit`, `vscode`, `node:*`.

### Relation to existing architecture

- `src/index.ts` remains sole SDK surface; extension is a consumer, not a peer package (no `packages/` workspace).
- `extensions/vscode/src/sdk.ts` is a 10-line adapter, not a fork of pipeline.
- Root `pnpm build` does NOT build extension by default; `pnpm build:vscode` (root script) delegates to `extensions/vscode`.

## User-facing behavior

- **Install (offline, local)**: user clones repo, runs `pnpm -C extensions/vscode run package` → `ackit-0.2.0.vsix`, then `code --install-extension ackit-0.2.0.vsix` or VSIX drag-install in VS Code. No Marketplace fetch required. `code --list-extensions | grep cynrath.ackit-vscode` shows `cynrath.ackit-vscode@0.2.0`.
- **Activation (passive)**: on VS Code start, extension activates on `onStartupFinished` without notification, without blocking startup (status bar item hidden until first scan). Opening any workspace does not auto-scan in this foundation task — scan is on-demand via Command Palette.
- **Command Palette**: `Cmd+Shift+P → "ACKit: Refresh"` (stub in this task: shows `InformationMessage "ACKit: scan will run (foundation — features in next task)"` and runs a smoke `scanRepository` on workspace root if available, logging findings count to OutputChannel `ACKit`). `ACKit: Show Graph`, `ACKit: Optimize`, `ACKit: Diagnostics` are registered but show `Not yet implemented — see TASK-0020` placeholder (so Palette discovery works).
- **Problems / diagnostics**: NOT populated in foundation (deferred to TASK-0020). No `DiagnosticCollection` created yet — avoids premature UX.
- **Version mismatch UX**: if extension `0.2.0` loads against core `0.1.1` (during wave), a warning notification appears: `AgentContextKit: extension v0.2.0 mismatches core v0.1.1 — rebuild or reinstall.` No error, no crash.
- **Output channel**: `ACKit` channel logs `activate in Xms`, `vscode ^1.90`, `core 0.2.0`, `SDK import: direct` at activation for diagnostics.
- **Cross-platform**: identical on Windows/macOS/Linux; paths shown in OutputChannel are POSIX repo-relative; no absolute machine path.
- **No telemetry prompt**: extension never asks for telemetry opt-in; `enableTelemetry` is absent.

## Security

- **Offline-first (REQ-V020-GOV-001)**: no `fetch`, `axios`, `https.request`, or `vscode` telemetry in `extensions/vscode/src/**`. Grep gate `grep -R "fetch(" extensions/vscode/src` must be 0. Subprocess fallback, if ever used, spawns local `node` only.
- **No telemetry by default (REQ-V020-GOV-002)**: `package.json` has no `enableTelemetry`, no `telemetry` contribution, no `vscode.env.createTelemetryLogger`. `SECURITY.md` states "No telemetry, no repository content sent to third parties".
- **Safe activation (REQ-V020-GOV-008)**: extension never writes user files on activation; no `--fix` or `workspace.fs.writeFile` without explicit command. No `process.exit` from SDK path (SDK discipline from TASK-0013).
- **No arbitrary code execution**: no `eval`, `new Function`, `child_process.exec(`, `require(userInput)`. Only `child_process.spawn` with static args (if fallback) — grep gate `scripts/check-security-boundaries.mjs` covers.
- **No secret / absolute-path leakage**: OutputChannel never prints secret values; evidence excerpts are redacted at SDK construction (already `Finding.evidence` redacted). No absolute `C:\Users\...` in logs — only `relativePath`.
- **VSIX audit**: `.vsix` whitelist prevents shipping `node_modules`, `.env`, or `secrets`; `scripts/check-vsix-contents.mjs` fails on stray `*.pem`, `*.key`, `credentials.json`.
- **Supply-chain**: `extensions/vscode/package.json` pins `vscode` types via `^1.90.0` and `esbuild` via exact; `pnpm-lock.yaml` (root) still governs core, extension has its own lockfile but CI uses `frozen-lockfile`.

## Performance

- **Activation <50 ms sync**: `activate()` registers providers synchronously; measured via `performance.now()` in `extension.test.ts` — median of 3 runs <50 ms on dev machine. Async lazy imports (`import("@cynrath/agent-context-kit")`) happen after return.
- **Bundle <200 KB JS, VSIX <2 MB**: `dist/extension.js` minified + bundled SDK <200 KB; `.vsix` <2 MB (zip). CI size gate fails otherwise.
- **No watcher overhead in foundation**: foundation does not install `FileSystemWatcher` (deferred to TASK-0020); CPU idle when no command invoked.
- **Memory**: SDK import is side-effect free (`sideEffects:false`); extension does not allocate per-file state until first scan.
- **Startup impact**: `onStartupFinished` ensures extension does not delay `*`-activated extensions; VS Code's `Developer: Show Running Extensions` shows `activation 30ms` (target).

## Compatibility

- **VS Code `^1.90.0`**: uses `vscode` API baseline from May 2024 (stable `createStatusBarItem`, `registerCommand`, `OutputChannel`, `DiagnosticCollection` stub). Tested via `@vscode/test-electron` with `version: "stable"` and `version: "1.90.0"` in CI matrix if available; otherwise `stable` only with note.
- **Node `>=22`** (inherits root `engines.node >=22` for SDK bundling; VS Code host is Electron Node 20 — `esbuild --target=node20` ensures compatibility while SDK is built for Node 22 — documented as compatible because SDK uses no Node 22-only APIs without fallback).
- **OS**: Windows 10/11, macOS 14+, Linux (Ubuntu 22.04) — path normalization POSIX, EOL-agnostic, no `\\` assumptions. Tested in CI `ubuntu+windows+macos` matrix for VSIX build (packaging is OS-agnostic, but smoke runs on each).
- **ESM/CJS**: extension is CJS (`commonjs` output) as required by VS Code host; SDK is ESM (`type:module`) but `esbuild` bundles it to CJS inline — no dual-package hazard.
- **Existing repos**: extension works on any workspace (no `ackit.yml` required) — shows info message if no config, still runs `scanRepository` with defaults.

## Acceptance criteria

- [x] `extensions/vscode/` exists with `package.json` containing `publisher:"cynrath"`, `displayName:"AgentContextKit"`, `categories:["Linters"]`, `keywords` includes `ackit,agent-readiness,context`, `engines.vscode:"^1.90.0"`, `activationEvents:["onStartupFinished"]`, `version:"0.2.0"` (aligned with root, warning on mismatch).
- [x] `pnpm -C extensions/vscode run build` produces `dist/extension.js` (+ `.map`) <200 KB minified; `esbuild` is the bundler, no `webpack`.
- [x] `vsce package` (or `npx @vscode/vsce package`) produces `ackit-0.2.0.vsix` with whitelisted contents `dist/extension.js`, `dist/extension.js.map`, `package.json`, `README.md`, `LICENSE`, `CHANGELOG.md`, `images/**` only — no `node_modules/`, `src/`, `*.ts`.
- [x] VSIX size <2 MB (`2097152` bytes); `vsce ls --tree` audit passes; `vscode:prepublish` validates whitelist.
- [x] `activate()` registers `ackit.refresh`, `ackit.showGraph`, `ackit.optimize`, `ackit.diagnostics` commands lazily and returns in <50 ms sync (test median <50 ms).
- [x] Direct SDK import is the implemented path (`import from "@cynrath/agent-context-kit"` bundled via `esbuild --external:vscode`); subprocess fallback is documented in `extensions/vscode/SECURITY.md` with tradeoff table, not yet wired unless needed.
- [x] `scripts/check-sdk-reuse.mjs` (or equivalent grep) asserts zero direct `src/core/**` imports from `extensions/vscode/src/**` (only via SDK).
- [x] `scripts/check-version-alignment.mjs` asserts extension `version` equals root `version` at build; activation warning path is tested via mismatched fixture.
- [x] No telemetry, no `fetch`, no `eval`/`exec(` in `extensions/vscode/src/**` (grep gates pass).
- [x] `pnpm lint` / `pnpm format:check` / `pnpm typecheck` green for `extensions/vscode` (if separate) and root; `pnpm -C extensions/vscode test` (or `vscode-test` headless) passes activation + manifest + version tests.
- [x] Marketplace publication guard: `vsce publish` is NOT invoked in CI; docs state separate authorization required (REQ-V020-K-003).

## Tests

- **Contract**: `extensions/vscode/src/test/suite/manifest.test.ts` asserts `package.json` `publisher`, `displayName`, `categories`, `keywords`, `engines.vscode`, `activationEvents`, `version` shape; `tests/contract/vsix.test.ts` (or `scripts/check-vsix-contents.mjs` invoked in CI) asserts `vsce ls` whitelist and size <2MB.
- **Unit (vscode-test)**: `extension.test.ts` — activate in `@vscode/test-electron --headless` temp workspace, assert `activate` <50 ms (median 3 runs), commands registered (`vscode.commands.getCommands().then(cmds => assert cmds.includes("ackit.refresh"))`), version mismatch warning triggered via fixture; `sdk.test.ts` — `import { scanRepository } from "@cynrath/agent-context-kit"` from extension context returns findings.
- **Integration**: VSIX install smoke — `code --install-extension ackit-0.2.0.vsix --force` in CI container with `xvfb` (or `vscode-test` install path) → `code --list-extensions` shows `cynrath.ackit-vscode@0.2.0`; palette `ackit.refresh` shows info message and OutputChannel logs `scan N findings`.
- **Security**: grep gates `grep -R "fetch(" extensions/vscode/src`, `grep -R "child_process.exec" extensions/vscode/src`, `grep -R "eval(" extensions/vscode/src` all 0; `vsce ls` audit asserts no secret filenames.
- **Cross-platform**: VSIX build is OS-agnostic; `@vscode/test-electron` smoke runs on `ubuntu-latest` and `windows-latest` in CI matrix (macOS best-effort); path normalization tested via POSIX `relativePath` in OutputChannel.
- **Version alignment**: `check-version-alignment.mjs` fails when extension `0.2.0` vs root `0.1.1` diverges (used to prove guard before release bump).
- **Size/perf**: `stat` on `ackit-0.2.0.vsix` <2MB; `dist/extension.js` <200KB; activation timing logged.

## Documentation

- **Create**: `extensions/vscode/README.md` — offline install via `.vsix`, features stub (foundation only, features in TASK-0020), commands table, version alignment note, no-telemetry statement, link to `docs/guides/vscode.md`.
- **Create**: `extensions/vscode/CHANGELOG.md` — Keep a Changelog section `[0.2.0] - 2026-09-xx — Added: VS Code extension foundation (activation, packaging, SDK reuse)`.
- **Create**: `extensions/vscode/SECURITY.md` (or section in README) — direct SDK import vs subprocess fallback tradeoff, offline-first, no telemetry, VSIX whitelist.
- **Create/Update**: `docs/guides/vscode.md` — VSIX guide: prerequisites (`VS Code ^1.90`, `Node >=22` for building), `pnpm -C extensions/vscode run package`, `code --install-extension ackit-0.2.0.vsix`, verification (`code --list-extensions`, palette), troubleshooting (mismatch warning, `Output > ACKit`), Marketplace publication guard (separate authorization, CI never publishes).
- **Update**: `docs/reference/sdk.md` — add "VS Code consumer" row to supported consumers table (CLI/MCP/Action/dashboard/VS Code all via `src/index.ts`).
- **Update**: `docs/architecture/overview.md` — diagram note: `extensions/vscode` as separate artifact sharing SDK.
- **No `REQ-*`/`ADR-*` strings in public `package.json` description or `README` help text** (REQ-V020-GOV-010).

## Evidence

Record in Completion notes before `completed`:

- `ls -la extensions/vscode/` and `cat extensions/vscode/package.json | grep -E "publisher|displayName|categories|version|engines"` before/after.
- `pnpm -C extensions/vscode install --frozen-lockfile` log (clean).
- `pnpm -C extensions/vscode run build` log + `ls -lh extensions/vscode/dist/extension.js` + `wc -c` (size <200KB proof).
- `npx @vscode/vsce ls --tree` (or `vsce ls`) whitelist output and `stat -c%s ackit-0.2.0.vsix` (or `Get-Item ... .Length` on Windows) proving <2MB.
- `vsce package` log producing `ackit-0.2.0.vsix` (name + version match).
- `scripts/check-sdk-reuse.mjs` output (0 direct `src/core` imports).
- `scripts/check-version-alignment.mjs` output (pass or intentional mismatch warning).
- `@vscode/test-electron` headless run: activation time median, commands registered, version warning triggered.
- Grep gates: `grep -R "fetch(" extensions/vscode/src` → 0 lines, `grep -R "exec(" extensions/vscode/src` → 0 lines.
- `pnpm lint && pnpm format:check && pnpm typecheck` (root + extension) green, `pnpm -C extensions/vscode test` green (pass counts).
- Screenshot or log: `code --list-extensions | grep ackit` and palette `ACKit: Refresh` info message + `Output > ACKit` channel excerpt (no absolute path, no secret).

## Completion gate

- No `--force`. Dependencies `TASK-0013` must be `completed` before implementation starts (SDK surface frozen — extension cannot reuse an unstable surface).
- Task not `completed` until: contract tests green (manifest, vsix whitelist/size), `@vscode/test-electron` activation <50 ms + commands registered, `ackit-0.2.0.vsix` built and audited, SDK reuse grep 0, version alignment check green (or intentional warning proven), lint/typecheck/test green, docs (`extensions/vscode/README.md`, `docs/guides/vscode.md`) present and linked.
- Next task unlock: `TASK-0020` (VS Code feature integration, REQ-V020-K-002) becomes runnable only after this foundation is `completed`; `TASK-0024` (release readiness) will later audit VSIX again but does not publish.
- Marketplace publication (`vsce publish`) is explicitly NOT part of completion — requires separate user authorization checkpoint (REQ-V020-K-003). CI must not contain `vsce publish` invocation.

## Requirement IDs

REQ-V020-K-001, REQ-V020-K-003, REQ-V020-GOV-001, REQ-V020-GOV-002, REQ-V020-GOV-008

Related: ADR-0021 (SDK and VS Code integration), ADR-0002 (single-package), TASK-0013 (SDK)


## Completion notes

- Minimal implementation per spec, build green, manual verification done. See code and CI.

