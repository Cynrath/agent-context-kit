---
id: "TASK-0020"
title: "VS Code extension — feature integration"
status: pending
schemaVersion: 2
dependencies:
  - TASK-0019
createdAt: "2026-08-27"
completedAt: null
---

## Purpose

Implement full feature integration for the official VS Code extension (`extensions/vscode/`) on top of the TASK-0019 foundation — wiring readiness, diagnostics, instruction graph, tasks, policy/packs, optimize CodeActions, command palette, and file watcher through the frozen SDK surface from `src/index.ts`. This is the second of the two EPIC K tasks (foundation → features) and the sole owner of REQ-V020-K-002.

## Context / current state

**Foundation from TASK-0019 (prerequisite, must be completed):**

- `extensions/vscode/` scaffolded with its own `package.json` (`name: ackit-vscode`, `publisher: cynrath`, `displayName: AgentContextKit`, `version: 0.2.0` mirroring core, `engines.vscode >=1.90`), `README.md`, `CHANGELOG.md` slice, `LICENSE`, `images/icon.png` placeholder, `src/extension.ts` with lazy `activate()` (`activationEvents: ["onStartupFinished"]`, <50ms), `esbuild` bundling to `dist/extension.js` (<100KB), `vsce package` → `ackit-0.2.0.vsix` whitelisted contents (`extension/dist/**`, `package.json`, `README.md`, `LICENSE`, `CHANGELOG.md`, `images/**`), size <2MB, version-alignment warning at activation, no telemetry, no remote AI.
- `package.json` contributions declared minimally (one view container `ackit` or `ackitExplorer`, one status bar not yet wired, 2–3 commands stubbed) — feature behavior not yet implemented.
- SDK boundary frozen per ADR-0021 + TASK-0018 (TASK-0013 in new numbering): `src/index.ts` is the ONLY supported import surface. Exports: `scanRepository`, `loadAckitConfig`, `buildContextPack`, `buildInstructionGraph`, `resolveEffectiveStack`, `validateSkills`, `scoreRepository` (TASK-0008), `evaluateRulePack` (TASK-0011/0012), plus types. `package.json` has `type: module`, `sideEffects: false`, `exports: {".", "./mcp"}`, `engines.node >=22`.

**Engines available (consumed, not reimplemented):**

- Readiness engine (TASK-0008): `scoreRepository(root, opts?) → Promise<ScoreReport>` — pure, deterministic, 0–100 overall + 6 categories (Instructions 25, Security 25, Context 20, Task 10, Skills 10, Policy 10), `deductions[]` with `evidence.relativePath`, `severity → points` mapping. Will be used for status bar + Readiness tree view. Not yet wired to extension.
- Graph v2 (TASK-0011): `buildInstructionGraph(root) → InstructionGraph` + `resolveEffectiveStack(graph, filePath) → EffectiveStack` (`includeScopes`/`excludeScopes`/`providerApplicability`/`provenance`/`shadowedBy`/`duplicateOf`/`orderIndex`). Scope resolution: depth → precedence → id tie-break, POSIX repo-relative, realpath before match, size limits with `INSTR-LIMIT-*`. Not yet exposed in extension UI.
- Scanner/Policy (TASK-0008/0012): `scanRepository(root, opts?) → ScanResult { findings: Finding[], diagnostics: ScanDiagnostic[], exitCodeSuggestion }` where `Finding { ruleId, severity, category, message, relativePath, line/column, fingerprint, evidence (redacted), remediation, documentationKey, suppressed }`. Rule packs via `evaluateRulePack`. No Problems integration yet.
- Core watch semantics (`src/core/watch/watch.ts`, TASK-0015): debounce/coalescing 400ms default, incremental scan+cache, ignored dirs (`.git, node_modules, dist, .ackit, coverage, artifacts` + user excludes), `WatchHandle.done` graceful shutdown, cross-platform polling. Extension must reuse semantics, not invent a divergent watcher.

**What is explicitly NOT yet present (this task's delta):**

- No `vscode.DiagnosticCollection` / Problems integration — findings not surfaced as diagnostics, no `ACKITxxx` codes in Problems panel.
- No TreeViews — no `Readiness` categories view, no `Findings by severity` view, no `Instruction graph` view, no `Tasks` view, no `Policy/packs` view.
- No `QuickPick` "Instructions for current file" — `resolveEffectiveStack` not called over `window.activeTextEditor.document`.
- No `CodeActionProvider` / lightBulb optimize recommendations.
- No full Command Palette surface — only stubs for `ACKit: Refresh` etc. — `Show Graph`, `Optimize`, `Diagnostics`, `Toggle Watch` not implemented.
- No `FileSystemWatcher` → debounced refresh wiring (reusing core 400ms).
- No SDK-reuse proof gate (`grep extensions/vscode/src only imports @cynrath/agent-context-kit / vscode / stdlib`).

**Constraints carried forward:**

- ADR-0021 decision: direct SDK import (in same Node host) is preferred; subprocess `child_process.spawn("ackit")` is fallback only if VS Code sandbox restricts FS. Document why one path chosen in `extensions/vscode/SECURITY.md` / `README.md`.
- Offline-first, deterministic, no telemetry (REQ-V020-GOV-002), no absolute path / secret leakage (REQ-V020-GOV-004), no `process.exit` from SDK (REQ-V020-GOV-008).
- Single-package repo invariant: no `pnpm-workspace.yaml`, extension is a separate build artifact sharing SDK but not introducing workspace.
- Cross-platform: Windows/macOS/Linux, drive/space/Unicode/mixed EOL.

Related ADRs: ADR-0021 (SDK+VS Code), ADR-0002 (single package), ADR-0006 (instruction graph), ADR-0007 (exit codes), ADR-0015..0024 (v0.2.0).
Related Requirements: REQ-V020-K-002 (feature integration), REQ-V020-GOV-002/004/008 (telemetry/secret/process), REQ-V020-K-001/003 (foundation/marketplace context), REQ-V020-A-001..006 (readiness), REQ-V020-D-001..003 (graph v2).

## Goal

One outcome: opening a fixture workspace in VS Code (Win/Mac/Linux) and running palette `ACKit: Refresh` populates Problems with `ACKITxxx` diagnostics (redacted evidence), shows readiness `$(shield) 82` in the status bar and category breakdown in a Readiness tree view, lists findings by severity, shows "Instructions for current file" (`resolveEffectiveStack` over active editor path) in a QuickPick ordered by precedence, and exposes the full Command Palette (`Refresh`/`Show Graph`/`Optimize`/`Diagnostics`/`Toggle Watch`) plus debounced file watcher — all via direct SDK imports only, with zero duplication of scanner/graph/score logic.

## In scope

- **Readiness status bar** — `vscode.StatusBarItem` alignment `Left`, priority `100`, text `$(shield) <score>` (or `$(shield) --` while loading / `$(shield) N/A` when N/A), tooltip shows overall + per-category breakdown + `inputsHash` short, `command: ackit.showReadiness`, background `StatusBarItem.background` red when score < `ackit.yml readiness.failBelow` (if configured). Click opens Readiness tree view or `Show Graph`? Decision: click → focus Readiness view. Update on `ackit.refresh` and watcher rescan. Reuses `scoreRepository`.
- **Problems via DiagnosticCollection** — single `vscode.DiagnosticCollection` named `ackit` created at activation, cleared on `deactivate` + on rescan start. Each `Finding` → one `vscode.Diagnostic` with `range` from `finding.line/column` (0-based, fallback `0,0`), `message: [ACKITxxx] <finding.message> — <remediation?>`, `severity` mapping: `error`↔critical/high, `warning`↔medium, `information`↔low, `hint`↔info, `code: { value: finding.ruleId` (expected `ACKITxxx` shape `ACKIT\\d{3,4}`), `target: vscode.Uri.parse("https://.../rules/"+ruleId)` if `documentationKey` present}, `source: "ackit"`, `relatedInformation` with `evidence.relativePath` (repo-relative, never absolute). Evidence excerpt redacted (reuse scanner redaction — `[REDACTED]` already in `Finding.evidence`). No secret values in `Diagnostic.message`.
- **Tree views (5 required, all in `ackit` view container `id: ackitExplorer`):**
  1. `ackit.readinessView` — `Readiness` — categories (Instructions, Context Efficiency, Task Hygiene, Security, Skills, Policy) with icon per status (pass/warn/fail/n/a), label `$(check) Instructions — 85 (weight 25)`, collapsible deductions under each (`severity` icon + `reason` + `evidence.relativePath`).
  2. `ackit.findingsView` — `Findings by severity` — top nodes `Critical (2)`, `High (5)`, ... each expands to findings (label `ACKIT001 src/foo.ts:12 — <msg>`, command `vscode.open` to location).
  3. `ackit.graphView` — `Instruction graph` — roots: providers (codex/claude/copilot/gemini/generic + AGENTS.md etc.), each node expandable showing scope, precedence, `shadowedBy`/`duplicateOf` badges, command `ackit.showEffectiveStackForActiveFile`.
  4. `ackit.tasksView` — `Tasks` — `docs/tasks/active|archive` summary (active count, blocked count), each task file as node with status icon, command open file.
  5. `ackit.policyView` — `Policy/packs` — rule packs loaded (`ackit.yml policy.rulePacks`), each pack → rules, with `severityOverride` and `locked` badges; diagnostics per `POL-PACK-COLLISION|LIMIT|NETWORK-REFUSED`.
  All providers implement `vscode.TreeDataProvider<T>` with `onDidChangeTreeData` fired after each scan/graph/score recomputation. Empty state: `No findings — workspace clean` / `No instructions found` / `No tasks`.
- **QuickPick "Instructions for current file"** — command `ackit.showEffectiveStackForActiveFile` (palette title `ACKit: Instructions for current file`) → if `window.activeTextEditor` absent → info message `No active file`; else `resolveEffectiveStack(graph, posixRelativePath)` where `posixRelativePath = path.relative(workspaceRoot, editor.document.fileName).split("\\").join("/")` → QuickPick items ordered by precedence (graph `orderIndex` already depth→precedence→id), `label: $(file) <relativePath>`, `description: <provider> · precedence <n>`, `detail: <includeScopes|excludeScopes|provenance>`, picking an item opens that instruction file at `0,0`. Also used as inline tree under `graphView`'s "Effective for active file" virtual node that auto-updates on `onDidChangeActiveTextEditor`.
- **Optimize CodeActions** — `vscode.CodeActionProvider` for `ackit` selector (`*`, or `markdown, yaml, md` for instruction files). For each optimize finding (from `optimize` engine via SDK or reusing readiness deductions that map to `tokenWasteEstimate`/`remediation`), provide `CodeActionKind.QuickFix` with `title: "ACKit: <remediation>"`, `isPreferred: false`, `diagnostics: [related URI]`, `command: ackit.applyOptimizeFix` (or `WorkspaceEdit` inserting managed-block hint). LightBulb appears on lines with `Finding.evidence.line`. No auto-apply without user gesture; preview via `vscode.diff` if edit. Read-only by default — respects GOV-006 (managed surfaces only).
- **Command Palette (5+ commands, all `category: ACKit`):**
  - `ackit.refresh` — `ACKit: Refresh` — re-runs `scanRepository` + `buildInstructionGraph` + `scoreRepository` in parallel (with shared `AbortController`, cancellable), repopulates diagnostics + tree views + status bar, shows notification `ACKit: refreshed — 12 findings, score 84`.
  - `ackit.showGraph` — `ACKit: Show Graph` — opens a `WebviewPanel` (`viewType: ackit.graphPanel`) rendering instruction graph as local HTML (reuse dashboard minimal vanilla rendering if available, else tree dump). No remote assets, CSP `default-src 'none'; script-src 'nonce-*'`.
  - `ackit.optimize` — `ACKit: Optimize` — runs optimize engine (if SDK exposes) or reuses `scoreRepository` deductions that are optimization-relevant, shows QuickPick of findings (`$(lightBulb) <category> — <reason>`) with `Optimize: Fix (preview diff)` action.
  - `ackit.showDiagnostics` — `ACKit: Diagnostics` — mirrors `ackit diagnostics` CLI: shows `OutputChannel` `ACKit` with `version, Node/platform, config trace, instruction counts, cache stats, timings` (from SDK `diagnostics` helper or from last scan metadata).
  - `ackit.toggleWatch` — `ACKit: Toggle Watch` — toggles `FileSystemWatcher` debounced refresh on/off, status bar shows `$(eye) Watching` when active.
  - Plus `ackit.showEffectiveStackForActiveFile` already defined (also in palette).
  Contributions in `package.json` `contributes.commands` with `enablement: workspaceFolderCount > 0` where relevant.
- **Watcher: FileSystemWatcher debounced 400ms, reusing core watch semantics** — `vscode.workspace.createFileSystemWatcher("**/*", false, false, false)` (or ignore-driven pattern list) → `onDidCreate|onDidChange|onDidDelete` → debounced 400ms coalescing (single `setTimeout` reset on each event, shared with `src/core/watch/watch.ts` default). Ignored paths: `.git, node_modules, dist, .ackit, coverage, artifacts, out, .vscode` + `ackit.yml excludes` + `files.watcherExclude` respected by checking `vscode.workspace.getConfiguration("files").get("watcherExclude")`. Coalesced callback runs `ackit.refresh` (incremental if SDK supports cache, else full scan — document which). Graceful: `deactivate()` disposes watcher. No outside-root traversal (validate `workspaceRoot` containment before rescan).
- **SDK reuse proof** — extension `src/**` imports ONLY `from "@cynrath/agent-context-kit"` / `from "vscode"` / stdlib (`node:path`, `node:fs/promises`, `node:util`). Enforced by grep gate script `scripts/check-sdk-reuse.mjs` (also used in TASK-0018): `grep -R "from.*src/core" extensions/vscode/src` must be 0, `grep -R "from.*@cynrath" extensions/vscode/src` ≥1. CI contract test fails on violation. No duplication of `pipeline.ts`, `graph.ts`, `score.ts` logic into extension bundle.

## Out of scope

- `vsce publish` / Marketplace publication — separate authorization checkpoint per REQ-V020-K-003 and TASK-0024; this task only `vsce package` + VSIX audit, no publish.
- Adding new SDK exports or changing `src/index.ts` allowlist — frozen by TASK-0018; this task only consumes `scanRepository`/`scoreRepository`/`buildInstructionGraph`/`resolveEffectiveStack`/`evaluateRulePack` already exported.
- MCP write tools, dashboard/report server UI beyond the `Show Graph` webview panel (full dashboard is `TASK-0019` dashboard track), GitHub Action changes.
- Custom provider/profile editing UI, rule-pack authoring UI — rule packs remain `ackit.yml` driven, read-only in tree view.
- Telemetry, remote AI, network fetch, vector DB, arbitrary plugin JS execution — all `OUT` per REQ-V020-GOV-007/OUT-001.
- CJS shim for extension (extension host is ESM-capable Node ≥22; bundling via `esbuild` resolves SDK as ESM).
- Version bump of `package.json` to `0.2.0` already done in TASK-0019; this task does not change version unless fixing alignment warning logic.
- Support for multi-root workspaces beyond first folder — first `workspaceFolders[0]` is used; multi-root noted as future, shows warning `Multi-root: using first folder`.

## Technical design

**Module layout under `extensions/vscode/`:**

```
extensions/vscode/
  package.json                 # + contributes.views/commands/menus, publisher/cynrath, version 0.2.0
  tsconfig.json                # strict, module: commonjs (VS Code host) or es2022 + bundler, outDir dist
  esbuild.mjs                  # bundles src/extension.ts → dist/extension.js <100KB, external: vscode
  src/
    extension.ts               # activate(context), register commands/providers/watcher, version alignment check
    sdk.ts                     # thin wrapper: getWorkspaceRoot(), runScan(opts:{signal}), runGraph(), runScore(), diagnostics
    providers/
      readinessStatusBar.ts    # StatusBarItem $(shield), update(scoreReport), dispose
      diagnostics.ts           # DiagnosticCollection ackit, findings→diagnostics mapper ACKITxxx, range/severity/code
      treeReadiness.ts         # TreeDataProvider<ReadinessNode>
      treeFindings.ts          # TreeDataProvider<FindingNode> grouped by severity
      treeGraph.ts             # TreeDataProvider<GraphNode> + effective-stack virtual node
      treeTasks.ts             # TreeDataProvider<TaskNode>
      treePolicy.ts            # TreeDataProvider<PolicyNode>
      codeActions.ts           # CodeActionProvider for optimize, kind QuickFix, lightBulb
    commands/
      refresh.ts               # ackit.refresh handler (parallel scan/graph/score + refresh TVs + progress notification)
      showGraph.ts             # ackit.showGraph webview panel (nonce CSP, local graph JSON → HTML)
      optimize.ts              # ackit.optimize QuickPick + CodeAction trigger
      showDiagnostics.ts       # ackit.showDiagnostics OutputChannel + diagnostics JSON
      toggleWatch.ts           # ackit.toggleWatch state + watcher enable/disable
      effectiveStack.ts        # ackit.showEffectiveStackForActiveFile QuickPick via resolveEffectiveStack
    watcher.ts                 # createFileSystemWatcher + 400ms debounce, onDidCreate/Change/Delete → scheduleRefresh
  src/test/
    suite/
      extension.test.ts        # @vscode/test-electron activation + command existence
      diagnostics.test.ts      # findings→diagnostics mapping, ACKITxxx code shape, redaction
      tree.test.ts             # readiness/findings/graph providers return expected nodes for fixture
      effectiveStack.test.ts   # resolveEffectiveStack over active editor path ordering
      watcher.test.ts          # debounce coalescing: 3 rapid events → 1 refresh
      sdk-reuse.test.ts        # grep gate: only allowed imports
  README.md, CHANGELOG.md, LICENSE, SECURITY.md, images/icon.png, .vscodeignore
```

**Activation & lifecycle (`src/extension.ts`):**

```ts
export async function activate(ctx: vscode.ExtensionContext) {
  const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!root) return; // no folder open → register commands but no scan
  checkVersionAlignment(context); // core pkg vs extension pkg → warning notification if mismatch
  const diag = vscode.languages.createDiagnosticCollection("ackit");
  ctx.subscriptions.push(diag, statusBar, watcher, ...providers, ...commands);
  // lazy: do not scan on startup unless ackit.autoRefreshOnStartup (default false)
  // first scan triggered on ackit.refresh or onDidChangeActiveTextEditor if file open
}
export function deactivate() { watcher.dispose(); diag.clear(); diag.dispose(); statusBar.dispose(); controller.abort(); }
```

Activation `activationEvents: ["onStartupFinished"]`, `main: "./dist/extension.js"`, `engines.vscode: "^1.90.0"`. Bundling `esbuild --bundle --external:vscode --platform=node --target=node22 --minify --sourcemap`.

**Readiness status bar (`readinessStatusBar.ts`):**

- `const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100); item.command = "ackit.showReadiness"`.
- On `ScoreReport` result: `overall` integer 0–100, categories each `score` or `null` for N/A. Text: `overall==null ? "$(shield) N/A" : "$(shield) "+overall` (N/A when all categories n/a — unlikely due to Security always present). Tooltip: `mdString` with `Overall 82\nInstructions 90 · Security 78 · …` + `inputsHash.slice(0,7)`.
- Color: `item.backgroundColor = overall < failBelow ? new vscode.ThemeColor("statusBarItem.errorBackground") : undefined` where `failBelow` from `ackit.yml readiness.failBelow` via `loadAckitConfig` → `readiness.weights`/`failBelow` (fallback not colored).
- Shown when `workspaceFolderCount>0`, hidden otherwise. Updates after each `scoreRepository` run.

**Problems via DiagnosticCollection (`diagnostics.ts`):**

```ts
function findingsToDiagnostics(findings: Finding[], root: string): vscode.Diagnostic[] {
  return findings.filter(f=>!f.suppressed).map(f=>{
    const line = Math.max(0,(f.line??1)-1), col = Math.max(0,(f.column??1)-1);
    const range = new vscode.Range(line,col, line, col+ (f.evidence?.excerpt?.length ?? 0));
    const sev = f.severity==="critical"||f.severity==="high"? vscode.DiagnosticSeverity.Error
              : f.severity==="medium"? vscode.DiagnosticSeverity.Warning
              : f.severity==="low"? vscode.DiagnosticSeverity.Information : vscode.DiagnosticSeverity.Hint;
    const msg = `[${f.ruleId}] ${f.message}` + (f.remediation? ` — ${f.remediation}`:"");
    // redaction is already in f.evidence.excerpt / f.message by scanner; assert no secret shape
    const d = new vscode.Diagnostic(range, msg, sev);
    d.code = { value: f.ruleId, target: f.documentationKey? vscode.Uri.parse(`https://cynrath.github.io/agent-context-kit/rules/${f.ruleId}`): undefined };
    d.source = "ackit";
    if (f.evidence?.relativePath) d.relatedInformation = [new vscode.DiagnosticRelatedInformation(
      new vscode.Location(vscode.Uri.file(path.join(root,f.evidence.relativePath)), new vscode.Range(0,0,0,0)),
      `evidence: ${f.evidence.relativePath}`)];
    return d;
  });
}
```

Collection keyed as `ackit` (Problems panel filters by source `ackit`). Codes must match `ACKIT\d{3,4}` (contract test asserts via `^ACKIT\d{3,4}$`). No absolute paths in `message` — validated by security test with fake secret fixture (ensure `message` contains `[REDACTED]` not raw token).

**Tree views (all `TreeDataProvider` pattern):**

- Shared base: `class AckitTreeProvider<T> implements vscode.TreeDataProvider<T> { _onDidChange = new EventEmitter<T|undefined>(); onDidChangeTreeData = _onDidChange.event; refresh(){ _onDidChange.fire(undefined);} getChildren(el?:T):ProviderResult<T[]>; getTreeItem(el:T):TreeItem }`.
- `treeReadiness`: children of root = categories from last `ScoreReport`; each category node `collapsibleState: Collapsed` if deductions non-empty, `description: score + "/100"`, `tooltip: reason`; leaf = `Deduction` with `severityIcon` (`$(error)` critical, `$(warning)` high/medium, `$(info)` low), `label: [SEVERITY] reason`, `description: relativePath`.
- `treeFindings`: top-level by severity buckets (use `Finding.severity` enum `critical|high|medium|low|info` mapped from scanner). Each bucket `TreeItemCollapsibleState.Expanded` if count>0 else `None`. Leaves: `label: ${ruleId} ${relativePath}:${line} — ${message.slice(0,80)}`, `command: { command:"vscode.open", arguments:[Uri.file(join(root,relativePath)), {selection: Range}]}`.
- `treeGraph`: top nodes = `InstructionGraph.providers` or `graph.nodes` grouped by `provider`; second level = nodes sorted by `orderIndex`; leaves show `applyTo`, `precedence`, badges `$(eye-closed) shadowed` if `shadowedBy`, `$(copy) duplicate` if `duplicateOf`. Plus virtual node `Effective for: <activeFile>` (auto-updates on `onDidChangeActiveTextEditor` → `resolveEffectiveStack`).
- `treeTasks`: reads `docs/tasks/active/*.md` frontmatter (`task doctor` schema) via SDK or simple `fs.readdir` + parse; groups `Active`/`Blocked`/`Completed (archive)`.
- `treePolicy`: reads `loadAckitConfig` → `policy.rulePacks` → `evaluateRulePack` results; shows pack id, rule count, `locked`/`overrides`.
- All views contributed in `package.json`:
```json
"contributes": {
  "viewsContainers": {"activitybar":[{"id":"ackitExplorer","title":"ACKit","icon":"$(shield)"}]},
  "views": {"ackitExplorer":[
    {"id":"ackit.readinessView","name":"Readiness","when":"workspaceFolderCount > 0"},
    {"id":"ackit.findingsView","name":"Findings by severity","when":"workspaceFolderCount > 0"},
    {"id":"ackit.graphView","name":"Instruction graph","when":"workspaceFolderCount > 0"},
    {"id":"ackit.tasksView","name":"Tasks","when":"workspaceFolderCount > 0"},
    {"id":"ackit.policyView","name":"Policy/packs","when":"workspaceFolderCount > 0"}
  ]}
}
```

**QuickPick Instructions for current file (`effectiveStack.ts`):**

```ts
export async function showEffectiveStack() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) { vscode.window.showInformationMessage("ACKit: no active file"); return; }
  const root = getWorkspaceRoot();
  const rel = path.relative(root, editor.document.uri.fsPath).split(path.sep).join(path.posix.sep);
  const graph = await buildInstructionGraph(root); // cached if already built
  const stack = resolveEffectiveStack(graph, rel); // pure, deterministic
  const items = stack.nodes.map(n=>({
    label: `$(file) ${n.relativePath}`,
    description: `${n.provider} · precedence ${n.precedence}`,
    detail: `scope:${n.scopeRoot} applyTo:${n.applyTo??"*"} ${n.shadowedBy?"shadowed":""} ${n.duplicateOf?"dup:"+n.duplicateOf:""}`.trim(),
    node: n
  }));
  const pick = await vscode.window.showQuickPick(items, { placeHolder: `Instructions applying to ${rel} (${items.length}) — ordered by precedence`, matchOnDescription:true });
  if (pick) { const doc = await vscode.workspace.openTextDocument(path.join(root, pick.node.relativePath)); await vscode.window.showTextDocument(doc); }
}
```

Ordering is guaranteed by `resolveEffectiveStack`'s `depth→precedence→id` tie-break (verified by contract test). Empty stack → info message `No instructions apply to <rel> (check includeScopes/excludeScopes)`.

**Optimize CodeActions (`codeActions.ts`):**

- `class AckitCodeActionProvider implements vscode.CodeActionProvider { provideCodeActions(doc,range,ctx,token):ProviderResult<CodeAction[]> }`
- For each finding whose `evidence.relativePath == posixRelative(doc)` and `line` within `range` or document, create `const a = new vscode.CodeAction("ACKit: "+finding.remediation.slice(0,80), vscode.CodeActionKind.QuickFix); a.diagnostics = [diagnostic]; a.isPreferred=false; a.command = { command:"ackit.applyOptimizeFix", title:"Preview fix", arguments:[finding]};` Optionally `a.edit = new WorkspaceEdit()` for managed-block fixes only (e.g., duplicate instruction removal).
- Registered via `vscode.languages.registerCodeActionsProvider({scheme:"file"}, provider, {providedCodeActionKinds:[CodeActionKind.QuickFix]})`.
- Preview diff via `vscode.commands.executeCommand("vscode.diff", beforeUri, afterUri, title)` if edit exists.

**Command Palette (`commands/*.ts`):**

Registered via `vscode.commands.registerCommand("ackit.refresh", async ()=>{ await refreshAll(progress) })` where `refreshAll` does:
```ts
await vscode.window.withProgress({location:ProgressLocation.Notification,title:"ACKit: refreshing…", cancellable:true}, async (prog, token)=>{
  const ac = new AbortController(); token.onCancellationRequested(()=>ac.abort());
  const [scan, graph, score] = await Promise.all([
    scanRepository(root, { signal: ac.signal }),
    buildInstructionGraph(root, { signal: ac.signal }),
    scoreRepository(root, { signal: ac.signal }).catch(()=>null) // score may N/A
  ]);
  updateDiagnostics(diag, scan.findings, root);
  updateStatusBar(statusBar, score);
  treeProviders.forEach(p=>p.setData({scan,graph,score}) && p.refresh());
});
```

Other commands: `showGraph` creates `WebviewPanel` with `enableScripts:false` unless nonce needed, CSP `default-src 'none'; style-src 'nonce-...'`, content from `graph.nodes` table; `optimize` runs scan/optimize then `showQuickPick`; `showDiagnostics` writes to `OutputChannel("ACKit")`; `toggleWatch` flips `watcherEnabled` boolean and shows `$(eye) Watching` in status bar or notification.

**Watcher (`watcher.ts`, debounced 400ms reusing core semantics):**

```ts
let timer: NodeJS.Timeout | undefined;
let enabled = vscode.workspace.getConfiguration("ackit").get<boolean>("watch", false);
const watcher = vscode.workspace.createFileSystemWatcher("**/*", false, false, false);
function scheduleRefresh(){ if(!enabled) return; if(timer) clearTimeout(timer); timer = setTimeout(()=>{ vscode.commands.executeCommand("ackit.refresh"); }, 400); }
watcher.onDidCreate(scheduleRefresh); watcher.onDidChange(scheduleRefresh); watcher.onDidDelete(scheduleRefresh);
// ignore check inside scheduleRefresh before firing: skip if uri.fsPath contains .git/node_modules/dist/.ackit/coverage/artifacts/.vscode
```

Respects `files.watcherExclude` by loading `vscode.workspace.getConfiguration("files").get("watcherExclude")` pattern map and testing via `picomatch` (reuse SDK's `ignore` helper) — skip if matched. Disposed on `deactivate`. No outside-root: `uri.fsPath.startsWith(root)` check; otherwise ignore.

**SDK reuse proof (gate):**

Script `scripts/check-sdk-reuse.mjs` (also used in TASK-0018) does:
```js
const files = globSync("extensions/vscode/src/**/*.{ts,mjs,js}");
const bad = files.filter(f=> readFileSync(f,"utf8").match(/from\s+["']\.\.\/.*src\/core\//) || readFileSync(f,"utf8").match(/from\s+["'].*\/src\/core/));
if (bad.length) { console.error("SDK reuse violation: direct src/core import in extension:", bad); process.exit(1); }
const allowedRe = /from\s+["'](@cynrath\/agent-context-kit|vscode|node:)/;
const illegal = files.flatMap(f=> readFileSync(f,"utf8").split("\n").filter(l=> l.includes("from ") && !allowedRe.test(l) && !l.includes('"vscode/')));
if (illegal.length) process.exit(1);
```

Contract test `extensions/vscode/src/test/suite/sdk-reuse.test.ts` runs the same grep inline (or shells out to script) and asserts exit 0. This is the "SDK reuse proof" evidence recorded in Completion notes.

**Error handling & exit codes:**

- SDK throws `AckitError` with `code` (`CONFIG-*`, `SCAN-*`, `GRAPH-*`, `POLICY-*`); extension catches and shows `vscode.window.showErrorMessage("[ACKIT "+code+"] "+message+" — "+remediation)`; never calls `process.exit`.
- If `scoreRepository` not yet available (TASK-0008 not landed in time for planning run), extension degrades: status bar shows `$(shield) --` and Readiness view shows `Score engine unavailable — complete TASK-0008`; still shows diagnostics/graph/tasks. This fallback is removed once TASK-0008 completes (verified by `try { await import("@cynrath/agent-context-kit").then(m=>m.scoreRepository)} catch {}`).

## User-facing behavior

- Install: `code --install-extension ackit-0.2.0.vsix` (or `vsce package && code --install-extension ackit-*.vsix`). No post-install network.
- On open workspace with `ackit.yml`, extension activates in <50ms (verified by measuring `activate()` duration in test). No scan on open unless `ackit.autoRefreshOnStartup` true or user runs `ACKit: Refresh`.
- `Cmd/Ctrl+Shift+P` → `ACKit: Refresh` → notification `ACKit: refreshed — 3 findings, score 78` within seconds (depends on repo size), Problems panel shows `ACKIT001` etc. with `ACKITxxx` filter, clicking a finding opens file at line/col.
- Status bar left shows `$(shield) 78` (or `N/A`, `--`); hover shows category breakdown; click focuses Readiness view.
- Activity bar `ACKit` icon shows 5 views: Readiness (categories + deductions), Findings by severity (critical/high/...), Instruction graph (provider → nodes → effective for active file), Tasks (active/blocked), Policy/packs (packs→rules). Empty states are friendly, not error banners.
- Opening `src/foo/bar.ts` → `ackit.graphView`'s virtual node `Effective for: src/foo/bar.ts (2)` updates live; palette `ACKit: Instructions for current file` QuickPick lists 2 nodes ordered by precedence; picking one opens that instruction file.
- On instruction files with optimization findings, a lightBulb appears; `Quick Fix` → `ACKit: Remove duplicate AGENTS guidance` → either `WorkspaceEdit` (managed block) or diff preview; never overwrites unmanaged user content without explicit intent flag / confirmation (`GOV-006` preview).
- Command palette also: `ACKit: Show Graph` (webview), `ACKit: Optimize` (QuickPick of optimize findings), `ACKit: Diagnostics` (OutputChannel + `ACKit` channel shows version/node/config trace/timings), `ACKit: Toggle Watch` (toggles debounced auto-refresh, status bar `$(eye) Watching` when on).
- File save in workspace triggers debounced (400ms) refresh if `Toggle Watch` enabled; 3 rapid saves coalesce to 1 rescan (debounce guarantee).
- Settings: `ackit.watch` (bool, default false), `ackit.autoRefreshOnStartup` (bool, default false), `ackit.failBelow` (number, default 0 — status bar red threshold), `ackit.exclude` (glob array merged with `ackit.yml`).
- All notifications use `vscode.window.showInformationMessage` / `showWarningMessage` with `Remediation` link if `AckitError.remediation` present.
- No telemetry, no external links beyond optional `documentationKey` URI in diagnostic `code.target`.

## Security

Per REQ-V020-GOV-002/004, REQ-V020-L-001 surface coverage, and `docs/security/THREAT_MODEL.md` delta for VS Code:

- **No telemetry / no network**: extension `package.json` has no `telemetry` config; code contains zero `fetch`, `http.request`, `axios`, `telemetry.send`; grep gate `scripts/check-security-boundaries.mjs` asserts no `fetch(` in `extensions/vscode/src`. Verified by `grep -R "fetch(" extensions/vscode/src` =0.
- **No absolute-path leakage**: `Diagnostic.message`, `TreeItem.label`, `QuickPick.detail`, webview HTML all use repo-relative POSIX paths only; `path.relative(root, file)` is sanitized, `root` never printed; `evidence.excerpt` is redacted `[REDACTED]` for secret shapes (`ACKIT001..005`). Security test: fixture repo with fake `AKIA…`, `ghp_…`, `/home/user/.aws/credentials` absolute path → Problems shows `[REDACTED]` and `src/secret.txt`, never `/home/user`.
- **No secret storage**: diagnostics are in-memory only; no `globalState`/`workspaceState` persistence of findings; cache (if any) reuses core cache which is content-hashed and does not store raw secrets (reuse scanner secret redaction).
- **XSS in webview**: `ackit.showGraph` webview HTML escapes every `relativePath`/`message` via `escapeHtml` (`&`, `<`, `>`, `"`, `'`) and uses `textContent` policy; CSP `default-src 'none'`; no `innerHTML` with user content; `style-src` nonce only.
- **No arbitrary plugin execution**: extension does not `eval`, `new Function`, `require(userInput)`, `child_process.exec` with repo content; only SDK pure functions; rule packs are declarative YAML (no JS).
- **No `process.exit`**: extension never calls `process.exit`; SDK contract `no process.exit` reused; diagnostic flow returns `AckitError` with code.
- **FileSystemWatcher outside-root guard**: `uri.fsPath` validated `startsWith(root)` + `realpathSync` containment before rescan; symlink escape denied via `src/core/filesystem` engine (reuse).
- **Permissions least-privilege**: `package.json` does not request `*` activation; only `workspaceContains:**/*` implicit via `onStartupFinished`; no `contributes.configuration` secrets.
- **Dependency audit**: `extensions/vscode/package.json` deps = only `vscode` types + `esbuild` dev; no runtime deps that pull `fetch`/`axios`; `npm audit` clean; VSIX whitelist prevents stray `node_modules`.

## Performance

- `activate()` <50ms (no scan/graph/pack on activation — all lazy on first command/fileOpen). Measured in `@vscode/test-electron` via `performance.now()` around `activate()`.
- First `ackit.refresh` cold scan on small fixture (100 files) <2s, medium (1k) <5s on CI ubuntu; subsequent incremental (1-file change) via cache or watcher uses incremental semantics <500ms (reuse TASK-0015 cache hit ratio).
- Tree view render for 10k findings: paginated/virtualized — top-level shows counts, leaves lazy-loaded per severity bucket open; initial `getChildren()` returns ≤5 buckets, not 10k items; opening a bucket pages 100 at a time (or shows `Show next 100…`).
- Watcher debounce 400ms: 3 rapid saves → exactly 1 rescan (coalescing test via fake `FileSystemWatcher` emitter + `setTimeout` spy).
- Bundle size: `dist/extension.js` <100KB gz-checked (esbuild minify, `vscode` external); VSIX <2MB (whitelist). CI checks `vsce ls` output and `du -h ackit-*.vsix`.
- Memory: extension host memory delta after 5 sequential `ackit.refresh` on large fixture <50MB (no leak — providers dispose previous tree data).
- Cross-platform: file path normalization POSIX everywhere; `path.posix` for quickPick/detail; Windows drive letter stripped before `relative`.

## Compatibility

- VS Code `>=1.90.0` (engines field); tested on `stable` + `insiders` via `@vscode/test-electron` (headless Linux CI, macOS/Windows smoke manual checklist; CI matrix ubuntu+windows+macos×node22/24 includes `vscode-test` run).
- Node `>=22` (extension host Node 22/24); ESM `type:module` in root not used by extension host (extension built as CJS `commonjs` for host compat via esbuild `format:cjs` or `iife` — documented; SDK import is CJS-compatible via bundled SDK ESM interop).
- Workspace types: single folder (primary), multi-root (uses first folder + warning), no-folder (commands disabled via `when: workspaceFolderCount > 0`, diagnostics empty).
- File system: Windows drive (`C:\repo\...`), space/Unicode paths, mixed EOL, symlink/junction — all normalized to POSIX repo-relative before `resolveEffectiveStack`; `realpathSync` before containment on watcher events.
- Backward compat: extension `version` mirrors core `0.2.0`; mismatch → warning but not crash; older `ackit.yml` `schemaVersion` handled by `loadAckitConfig` migration (error with `remediation`).
- No CJS/ESM conflict: extension bundles SDK via esbuild `external: vscode` only; SDK `sideEffects:false` allows tree-shake; no `require(userInput)`.

## Acceptance criteria

- [ ] Readiness status bar exists: `vscode.StatusBarItem` left 100 `$(shield) <score>` (or `N/A`/`--`), tooltip with per-category breakdown + `inputsHash`, background error when `< failBelow`, click focuses Readiness view, updates after `ackit.refresh` and watcher rescan — verified by opening fixture workspace, running `ACKit: Refresh`, status bar text matches `scoreReport.overall` snapshot.
- [ ] Problems integration: `vscode.languages.createDiagnosticCollection("ackit")` holds one `Diagnostic` per non-suppressed `Finding` with `code.value = ruleId` matching `^ACKIT\d{3,4}$`, `source: "ackit"`, correct `range` from `line/column`, `severity` mapping (critical/high→Error etc.), `relatedInformation` with repo-relative evidence, evidence redacted (`[REDACTED]` not raw secret) — opening fixture with ≥1 `ACKIT` finding, palette `ACKit: Refresh` → Problems panel filter `ackit` shows count = findings length.
- [ ] Tree views: 5 views in `ackitExplorer` container (`ackit.readinessView`, `ackit.findingsView`, `ackit.graphView`, `ackit.tasksView`, `ackit.policyView`) all implemented as `TreeDataProvider`, registered, `when: workspaceFolderCount > 0`, refresh after scan/graph/score, empty states friendly — VS Code test asserts `vscode.extensions.getExtension("cynrath.ackit-vscode")` contributes `views` count 5 and `getChildren()` returns expected nodes for fixture.
- [ ] QuickPick "Instructions for current file" = `resolveEffectiveStack` over active editor path: command `ackit.showEffectiveStackForActiveFile` (palette `ACKit: Instructions for current file`) shows QuickPick items ordered by `orderIndex` (depth→precedence→id), `label: $(file) <relativePath>`, `description: <provider> · precedence <n>`, picking opens instruction file; also virtual node in graph view auto-updates on `onDidChangeActiveTextEditor` — opening `src/foo/bar.ts` in 4-level nesting fixture shows effective stack length 2 in both QuickPick and tree.
- [ ] Optimize CodeActions: `CodeActionProvider` registered for `file` scheme, provides `QuickFix` with `title: ACKit: <remediation>` + `diagnostics` + `isPreferred:false` + `command` or `WorkspaceEdit` (managed surfaces only) on lines with findings; lightBulb appears; `vscode.diff` preview for edits — verified by `provideCodeActions` unit returning ≥1 action for fixture instruction with duplicate.
- [ ] Command Palette: `contributes.commands` lists `ackit.refresh` (`ACKit: Refresh`), `ackit.showGraph` (`ACKit: Show Graph` webview with CSP, no remote assets), `ackit.optimize` (`ACKit: Optimize` QuickPick), `ackit.showDiagnostics` (`ACKit: Diagnostics` OutputChannel), `ackit.toggleWatch` (`ACKit: Toggle Watch` flips `$(eye) Watching`), plus `ackit.showEffectiveStackForActiveFile` — all with `category: ACKit`, `enablement: workspaceFolderCount>0` where relevant, verified by command existence in `package.json` and runtime `vscode.commands.getCommands()`.
- [ ] Watcher: `vscode.workspace.createFileSystemWatcher` created at activation, events debounced 400ms coalescing (single timeout reset), ignored paths (`.git, node_modules, dist, .ackit, coverage, artifacts, .vscode` + `ackit.yml excludes` + `files.watcherExclude` via `picomatch`), reuses core watch semantics, disposed on `deactivate`, no outside-root traversal — integration test: emit 3 rapid `onDidChange` → `ackit.refresh` called once (spy count 1) after 400ms, ignored dir change does not trigger.
- [ ] SDK reuse proof: `grep -R "from.*src/core" extensions/vscode/src` is 0, only imports are `@cynrath/agent-context-kit`/`vscode`/`node:` stdlib — enforced by `scripts/check-sdk-reuse.mjs` exiting 0 and contract test `sdk-reuse.test.ts` green; no scanner/graph/score logic duplicated in `extensions/vscode/src` (bundle inspection `grep -R "pipeline" dist/extension.js` only via SDK chunk).
- [ ] Direct SDK import decision documented: `extensions/vscode/SECURITY.md` or `README.md` section "Runtime: direct SDK import (vs subprocess fallback)" records why `import { scanRepository } from "@cynrath/agent-context-kit"` chosen over `child_process.spawn("ackit")`, with fallback condition (`ENOENT` / sandbox restrict) and trade-off table — doc exists and is linked from `extensions/vscode/README.md`.
- [ ] Security: no `fetch`/`eval`/`exec(userInput)` in `extensions/vscode/src` (grep gate 0), secret shapes in diagnostics/webview are `[REDACTED]` not raw tokens, webview HTML escaped + CSP `default-src 'none'`, watcher containment validated, `process.exit` not called (grep `process.exit` in extension src =0).
- [ ] Performance & packaging: `activate()` <50ms measured, `dist/extension.js` <100KB, VSIX `<2MB`, `vsce ls` whitelist only (`extension/dist/**`, `package.json`, `README.md`, `LICENSE`, `CHANGELOG.md`, `images/**`), no stray `node_modules` — `vsce package` + `vsce ls` audit recorded.

## Tests

- **Contract:**
  - `extensions/vscode/package.json` manifest audit: `publisher=="cynrath"`, `engines.vscode=="^1.90.0"`, `version=="0.2.0"` (mirrors root `package.json`), `activationEvents==["onStartupFinished"]`, `contributes.views` count 5, `contributes.commands` includes `ackit.refresh|showGraph|optimize|showDiagnostics|toggleWatch|showEffectiveStackForActiveFile`, VSIX `vsce ls` whitelist — snapshot.
  - SDK reuse gate contract: `scripts/check-sdk-reuse.mjs` + `sdk-reuse.test.ts` asserts only allowed imports.
  - Diagnostic code shape contract: `ACKIT\d{3,4}` regex over all `finding.ruleId` in test fixture.
- **Unit:**
  - `findingsToDiagnostics` mapper: severity mapping, range conversion, code target, source, relatedInformation, redaction.
  - `TreeDataProvider.getChildren` for each of 5 views on fixture data (readiness with N/A, findings grouped by severity, graph with shadow/duplicate badges, tasks active/blocked, policy with locked).
  - `resolveEffectiveStack` ordering: 4-level nesting + overlapping globs + include/exclude → exact sequence length 2 for `src/foo/bar.ts` (reuse graph v2 fixture).
  - `CodeActionProvider.provideCodeActions`: returns QuickFix with correct title/diagnostics for fixture.
  - `watcher` debounce helper: isolated timer test (3 emits within 400ms → 1 call).
  - `readinessStatusBar.update`: text/tooltip/background logic for `overall`, `N/A`, `--`, `failBelow`.
  - `escapeHtml` + CSP for webview.
- **Integration (@vscode/test-electron, headless):**
  - Activation smoke: `activate()` registers 6 commands, 5 tree views, 1 diagnostic collection, 1 status bar, 1 watcher; `deactivate()` disposes all.
  - `ackit.refresh` → diagnostic collection count = fixture findings length, status bar text = `$(shield) <overall>`, tree views populated.
  - `ackit.showEffectiveStackForActiveFile` with `window.activeTextEditor` mocked to `src/foo/bar.ts` → QuickPick items ordered by precedence (assert labels).
  - Watcher integration: create temp file change in fixture workspace → after 400ms + scan duration, diagnostics updated.
  - Version alignment warning: install extension with core version mismatch (stub root package.json read) → `showWarningMessage` called.
- **Security:**
  - Redaction proof: fixture with 5 secret shapes (`AKIA...`, `ghp_...`, `-----BEGIN PRIVATE KEY-----`, generic `password=...`, connection string) → Problems diagnostics messages contain `[REDACTED]` not raw, `grep` of `dist/extension.js` for raw secret fixtures is 0.
  - Webview XSS: payload `"><img onerror=alert(1)>` in finding message → rendered as `&gt;&lt;img` in webview HTML, no postMessage execution.
  - Grep gates: `fetch(`, `eval(`, `child_process.exec(`, `require(userInput)`, `process.exit` in `extensions/vscode/src` all 0.
- **Cross-platform:**
  - POSIX normalization: Windows-style `C:\repo\src\foo\bar.ts` → `src/foo/bar.ts` before `resolveEffectiveStack` (win32 path test).
  - Watcher on Windows drive/space/Unicode fixture paths correctly relative.
- **Manual smoke checklist (recorded in Completion notes):**
  1. `pnpm --filter vscode build` or `npm run build:vscode` → `dist/extension.js` exists <100KB.
  2. `vsce package` → `ackit-0.2.0.vsix` <2MB, `vsce ls` whitelist only.
  3. Open fixture workspace, `F1 → ACKit: Refresh` → Problems shows ≥1 ACKIT finding, status bar `$(shield)`.
  4. Open `src/foo/bar.ts` → `ACKit: Instructions for current file` QuickPick length 2, tree graph virtual node matches.
  5. Edit instruction file trigger lightBulb → `Quick Fix` visible.
  6. `ACKit: Show Graph` webview opens, no console errors, CSP enforced.
  7. `ACKit: Toggle Watch` → save file → debounced refresh after 400ms.

## Documentation

- **Update:** `extensions/vscode/README.md` — install (`code --install-extension ackit-0.2.0.vsix`), feature list (status bar, Problems, 5 tree views, QuickPick, CodeActions, 6 commands, watcher), settings (`ackit.watch`, `ackit.autoRefreshOnStartup`, `ackit.failBelow`), SDK reuse note (direct import vs subprocess, link to SECURITY.md), version alignment note, manual smoke checklist.
- **Update:** `extensions/vscode/CHANGELOG.md` — `0.2.0` entry `Added: Problems ACKITxxx, readiness $(shield), tree views (Readiness/Findings/Graph/Tasks/Policy), CodeActions, effective-stack QuickPick, watcher 400ms, commands`.
- **Update:** `extensions/vscode/SECURITY.md` — Runtime decision table (SDK import preferred vs subprocess fallback `ENOENT`), no telemetry, redaction in Problems/webview, CSP, watcher containment, dependency audit (no `fetch`).
- **Update:** `docs/guides/vscode.md` (or `docs/reference/vscode.md` if guide location is `guides/`) — user guide with screenshots placeholders, command table, tree view descriptions, troubleshooting (multi-root warning, version mismatch, watcher toggle), cross-platform notes.
- **Update:** `docs/architecture/overview.md` — VS Code layer diagram: `extensions/vscode/src → @cynrath/agent-context-kit SDK → src/core/*` (no duplicate engine), watcher reuse note.
- **Keep:** `docs/reference/sdk.md` already documents SDK surface; add VS Code consumer example `import { scanRepository, scoreRepository, buildInstructionGraph, resolveEffectiveStack } from "@cynrath/agent-context-kit"` in extension host.

## Evidence

Record in Completion notes (typed, not placeholder):

- `pnpm test` pass (`extensions/vscode` suite via `@vscode/test-electron` + root suite), `pnpm typecheck` green, `pnpm lint` + `pnpm format:check` green.
- `pnpm build` → `extensions/vscode/dist/extension.js` size (`du -h`), `vsce package` → `ackit-0.2.0.vsix` size + `vsce ls` output (whitelist only).
- Grep gates: `grep -R "from.*src/core" extensions/vscode/src` → 0 lines, `grep -R "fetch(" extensions/vscode/src` →0, `grep -R "process.exit" extensions/vscode/src` →0, `scripts/check-sdk-reuse.mjs` exit 0 output.
- `@vscode/test-electron` headless run log: activation <50ms, `ackit.refresh` diagnostics count, effective-stack QuickPick length 2 ordered.
- Watcher debounce test log: 3 rapid emits → 1 refresh after 400ms.
- Redaction proof: fixture secret → Problems diagnostic message contains `[REDACTED]`, not raw token (show one Finding JSON before/after).
- Version alignment check: `extensions/vscode/package.json version` equals root `package.json version` (`0.2.0`) or warning path tested.
- Manual smoke checklist with pass marks for 7 items (fixture workspace path listed repo-relative, not absolute).
- `git status --porcelain` clean except tracked files, `vsce package` artifact not committed.

## Completion gate

- **Dependency:** `TASK-0019` must be `completed` (verified via `node dist/cli/index.js task show TASK-0019` or `docs/tasks/active/TASK-0019` status `completed` + commit SHA recorded). Do not start until foundation VSIX scaffold exists.
- **Engines:** `TASK-0008` (`scoreRepository`) and `TASK-0011` (`resolveEffectiveStack` / graph v2) must be at least `completed` or degraded path documented — but preferred: both `completed` before marking this `completed` (record which SHAs provided `scoreRepository`/`buildInstructionGraph`).
- **Hard gates:** all Acceptance criteria checked with evidence links, `extensions/vscode/src` grep reuse gate green, `@vscode/test-electron` suite green on ubuntu (and windows/macos smoke if CI matrix provides), `vsce package` + `vsce ls` whitelist audit green, `pnpm lint`/`typecheck`/`build` green, no uncommitted `.vsix` or `dist/` in git.
- **No `--force`:** task not `completed` until 5 tree views, Problems `ACKITxxx`, status bar `$(shield)`, QuickPick ordered, CodeActions, 6 commands, 400ms watcher all implemented and test-covered.
- **`task doctor` clean:** `node dist/cli/index.js task doctor` shows `TASK-0020` with `dependencies [TASK-0019] satisfied`, `schemaVersion 2`, `status completed` only after verification.
- **Next task:** `TASK-0021` (security hardening) becomes runnable only after this; do not start `TASK-0021` until this Completion notes recorded and committed with `docs(v0.2.0): complete TASK-0020 vs code extension feature integration` (Conventional Commit, no AI authorship line) and push to `rebuild/ackit-vnext` is allowed (fast-forward).

## Requirement IDs

REQ-V020-K-002, REQ-V020-GOV-002, REQ-V020-GOV-004, REQ-V020-GOV-008

## Risks

- VS Code API surface (`TreeDataProvider`, `DiagnosticCollection`, `CodeActionProvider`, `FileSystemWatcher`) may change between `1.90` and latest — mitigate by pinning `@vscode/test-electron` to `stable` + testing on `insiders` in CI.
- `scoreRepository` or `buildInstructionGraph` not yet landed when this task starts → use degraded fallback (`$(shield) --`, `Score engine unavailable`) and remove fallback once engines are `completed` (record fallback removal commit).
- Watcher `createFileSystemWatcher("**/*")` may be expensive on large repos (>50k files) — mitigate by `ackit.watch` default `false` and debounce 400ms plus ignore list; do not watch `node_modules` via glob `!node_modules/**` if supported, else ignore check inside handler.
- Webview CSP too strict may block legitimate rendering — test webview HTML in manual smoke; use nonce only if script needed, else `enableScripts:false`.

## Rollback plan

Focused commit revert of the `extensions/vscode/src/**` feature providers + `package.json` contributions delta; `TASK-0019` foundation remains intact (no revert of scaffold). If VSIX audit fails post-merge, revert `extensions/vscode/src/commands/*` + `providers/*` + `watcher.ts` and re-run `vsce package` to re-audit.

## Affected files

- `extensions/vscode/package.json` (contributes.views/commands, publisher, version alignment)
- `extensions/vscode/tsconfig.json`, `esbuild.mjs`
- `extensions/vscode/src/extension.ts`
- `extensions/vscode/src/sdk.ts`
- `extensions/vscode/src/providers/readinessStatusBar.ts`
- `extensions/vscode/src/providers/diagnostics.ts`
- `extensions/vscode/src/providers/treeReadiness.ts`
- `extensions/vscode/src/providers/treeFindings.ts`
- `extensions/vscode/src/providers/treeGraph.ts`
- `extensions/vscode/src/providers/treeTasks.ts`
- `extensions/vscode/src/providers/treePolicy.ts`
- `extensions/vscode/src/providers/codeActions.ts`
- `extensions/vscode/src/commands/refresh.ts`
- `extensions/vscode/src/commands/showGraph.ts`
- `extensions/vscode/src/commands/optimize.ts`
- `extensions/vscode/src/commands/showDiagnostics.ts`
- `extensions/vscode/src/commands/toggleWatch.ts`
- `extensions/vscode/src/commands/effectiveStack.ts`
- `extensions/vscode/src/watcher.ts`
- `extensions/vscode/src/test/suite/*.test.ts` (6 suites)
- `scripts/check-sdk-reuse.mjs`
- `extensions/vscode/README.md`, `CHANGELOG.md`, `SECURITY.md`
- `docs/guides/vscode.md`, `docs/architecture/overview.md`
- `extensions/vscode/.vscodeignore`, `images/icon.png` (if not in TASK-0019)

## Test steps

1. `pnpm install --frozen-lockfile` (root, no workspace)
2. `pnpm build && pnpm typecheck && pnpm lint && pnpm format:check`
3. `pnpm --filter vscode build` or `npm run build:vscode` → assert `dist/extension.js` <100KB
4. `node scripts/check-sdk-reuse.mjs` → 0
5. `npx vsce package --out ackit-0.2.0.vsix && npx vsce ls --tree` → whitelist only, size <2MB
6. `pnpm test` (root) + `npm run test:vscode` (`@vscode/test-electron --headless`) → all green, activation <50ms
7. Manual smoke (headed): `code --extensionDevelopmentPath=extensions/vscode --new-window /tmp/fixture-vscode-k002` → `F1 ACKit: Refresh` → Problems/StatusBar/QuickPick/CodeActions/Show Graph/Toggle Watch checklist (7 items)
8. `node dist/cli/index.js task doctor` → TASK-0020 dependencies satisfied
9. `git diff --check && git status --porcelain`

## Completion notes

(placeholder — to be filled on completion with evidence listed in Evidence §, exact SHAs, vsce ls output, grep outputs, @vscode/test-electron logs, manual smoke passes)
