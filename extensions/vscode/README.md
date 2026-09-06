# ACKit Toolkit for VS Code

Offline-first agent readiness for your repository — directly inside VS Code.

- **Publisher:** `Cynrath` (`Cynrath.ackit-vscode`)
- **Version:** `0.5.1` (Marketplace stable; source checkouts build `0.5.1`)
- **Engine:** `VS Code ^1.90.0`
- **Activation:** `onStartupFinished` (debounced, lazy refresh)
- **Category:** `Linters`
- **Offline:** No network, no telemetry, no remote fonts — all analysis via shared ACKit SDK

## Views (Activity Bar → ACKit)

All views are backed by the shared deterministic SDK (`scanRepository`, `scoreRepository`, `buildInstructionGraph`, `analyzeOptimize`, etc.), not shell-outs. Data is cached per workspace root and refreshed debounced on file create/change/delete.

- **Readiness** (`ackit.readiness`) — Overall `88/100` + 6 categories (Instructions, Security, Context Efficiency, Tasks, Skills, Policy) with weighted renormalization, N/A handling, and expandable deductions. Uses real `scoreRepository` inputs, tooltip evidence, refresh on change.
- **Findings** (`ackit.findings`) — Grouped by severity (`critical`/`high`/`medium`/`low`), rule ID, path, message. Click to open file at exact line/column. Uses real `scanRepository` findings.
- **Instruction Graph** (`ackit.graph`) — Nodes `instr:codex:AGENTS.md`, `instr:claude:CLAUDE.md`, etc., with provider, precedence, provenance, shadowing. Uses `buildInstructionGraph` + `resolveEffectiveStack`.
- **Tasks** (`ackit.tasks`) — Tasks/policy/optimize summaries (see Diagnostics for details). If you prefer commands only, use `ACKit: Diagnostics`.
- **Policy** (`ackit.policy`) — Policy chain/digest (see Diagnostics).
- **Optimize** (`ackit.optimize`) — 8-class taxonomy, severity, token-waste estimates, evidence paths, remediation. Via `analyzeOptimize` (SDK), preview diff, no silent writes.

## Problems Integration

Findings are mirrored to VS Code **Problems** (`ACKITxxx`) with correct severity mapping:

- `critical`/`high` → Error
- `medium` → Warning
- `low` → Information
- `info` → Hint

Safe path handling via `vscode.Uri.joinPath` + `isInsideRoot` check, invalid `line`/`column` clamped to `0`, repository-level findings skipped gracefully, `DiagnosticCollection` cleared atomically on refresh.

## Commands

- `ACKit: Refresh` — Refresh all workspaces (debounced, cancellable)
- `ACKit: Show Readiness` — QuickPick categories
- `ACKit: Show Graph` — QuickPick nodes or open file
- `ACKit: Instructions for Current File` — Uses active editor, `workspace.getWorkspaceFolder`, `buildInstructionGraph` + `resolveEffectiveStack` (provider `codex`), shows ordered effective stack with `why` + `provenance`, handles not-in-workspace gracefully
- `ACKit: Optimize` — Real `analyzeOptimize` via SDK, QuickPick with `severity`/`category`/`waste`, detail view with `Remediation` + `Preview Diff` (no silent writes, respects `fixable` + `dryRun`)
- `ACKit: Diagnostics` — Real `loadAckitConfig` + `TaskStore` + `policy` summary as JSON (config health, tasks, policy, no auto-upload)

All commands support multi-root: `getRootForActiveEditor()` → active editor's folder, else first workspace, `getRoots()` for all, watcher per root, refresh per root.

## Watch & Activation

- Watcher: `onDidCreate` + `onDidChange` + `onDidDelete` (one debounced `400ms` coalesced refresh, `AbortController` cancels in-flight)
- Ignores: `.git`, `node_modules`, `dist`, `.ackit`, `coverage`, `artifacts` (via `walk` limits)
- Activation: `onStartupFinished` (non-blocking, `setTimeout(refreshAll, 800)`), lazy first access also works (`onView`/`onCommand` would also be valid; current keeps startup light)

## Multi-Root

- `getRoots()` → all `workspaceFolders`
- `getRootForActiveEditor()` → `workspace.getWorkspaceFolder(activeEditor.document.uri)` else first root
- `service.onDidChange` per root, `vsce` tests cover `workspaceFolders?.[0]` anti-pattern

## Offline-First Guarantee

- No `fetch` remote, no `http`/`https` client, no telemetry SDK, no remote fonts/scripts, no external upload — verified via `scripts/check-offline-egress.mjs` (includes `extensions/vscode/src/**`) and `tests/contract/vscode-icon.test.ts` + `offline-egress` contract
- VS Code host's own Microsoft networking is not ACKit code (host behavior, not product egress)

## Requirements

- VS Code `^1.90.0`
- Node `>=22` (extension host only, no network)

## Links

- Repo: https://github.com/Cynrath/agent-context-kit
- Docs: https://cynrath.github.io/agent-context-kit/
- Guides: https://cynrath.github.io/agent-context-kit/vscode/
- Marketplace: https://marketplace.visualstudio.com/items?itemName=Cynrath.ackit-vscode
- Changelog: `CHANGELOG.md` (see CHANGELOG for the version history)

## Screenshots

Run `ACKit: Refresh` in a fixture workspace (see `src/test/runTest.ts` test-fixture) — Readiness shows `Overall 88/100`, Findings grouped, Problems populated, Graph shows `AGENTS.md` nodes.

Offline-first, deterministic, no telemetry.
