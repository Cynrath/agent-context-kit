# Changelog — VS Code Extension

## [0.4.0] - 2026-09-03

- Sync: workspace dependency `@cynrath/agent-context-kit` `workspace:*` now resolves core `0.4.0` (managed-asset sync, workflow-config gate wiring, disk-proven advance gate, atomic checkpoints, MCP drift parity).
- Sync: manifest `version` `0.3.0 → 0.4.0` per ADR-0023 version coupling (root == extension == tag == release == action).
- No extension UI behavior change in this release; extension surfaces operate unchanged on the expanded SDK.
- Offline-first unchanged: no network, no telemetry, no remote fonts.

- Sync: workspace dependency `@cynrath/agent-context-kit` `workspace:*` now resolves core `0.3.0` (workflow/intent/checkpoint/evidence/verification/drift/policy-v2/roles/skills/journal capabilities in the shared SDK).
- Sync: manifest `version` `0.2.2 → 0.3.0` per ADR-0023 version coupling (root == extension == tag == release == action).
- No extension UI behavior change in this release; extension surfaces (Readiness, Findings/Problems, Instruction Graph, Tasks, Policy, Optimize, Diagnostics) operate unchanged on the expanded SDK.
- Offline-first unchanged: no network, no telemetry, no remote fonts.

## [0.2.2] - 2026-08-27

- Fix: real TreeDataProvider for `ackit.readiness`/`ackit.findings`/`ackit.graph`/`ackit.tasks`/`ackit.policy`/`ackit.optimize` (previously no providers)
- Fix: `ACKit: Optimize` now uses real `analyzeOptimize` SDK (was terminal message)
- Fix: `ACKit: Diagnostics` now shows real diagnostics JSON (was node count)
- Fix: watch `onDidCreate`+`onDidChange`+`onDidDelete` debounced, multi-root via `getRootForActiveEditor()`
- Fix: `ACKit: Instructions for Current File` via `buildInstructionGraph`+`resolveEffectiveStack`
- Fix: Problems severity mapping (critical/high→Error, medium→Warning) + safe `Uri.joinPath`
- Add: `services/ackitWorkspace.ts` state model (cache, refresh events, debounce, cancellation, disposal, offline)
- Add: `src/test/runTest.ts` + `src/test/suite/*` (unit + Electron @vscode/test-electron, 11 checks)
- Add: `tsconfig.test.json` + `tsconfig.json` for extension
- Fix: icon 1×1 (68 bytes) → 256×256 PNG (26KB, square, >1KB, professional)
- Fix: Marketplace README rewritten to match implemented UI (0.2.2, no false claims)
- Add: CI `extension` job (manifest contract, typecheck, build, unit, Electron xvfb, vsce ls/package/audit, icon dimensions, offline-egress)

## [0.2.1] - 2026-08-27

- Maintenance sync with core `0.2.1` (offline-egress hardening, fresh consumer, README parity)
- No behavior change, version bump only

## [0.2.0] - 2026-08-27

- Initial VS Code extension: readiness tree, Problems `ACKITxxx`, instruction graph, tasks/policy/optimize, palette commands, debounced watcher, no telemetry, <2MB VSIX
