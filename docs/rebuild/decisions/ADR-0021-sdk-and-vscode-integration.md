# ADR-0021: Public SDK Boundary + VS Code Extension Integration

Status: Accepted · Date: 2026-08-27

## Context

EPIC J (public SDK v1) must stabilize the Node/TypeScript programmatic API that `src/index.ts` already exports (ADR-0002 single package). EPIC K (VS Code extension) must be included in the same v0.2.0 product release, reuse the same engine/SDK rather than duplicating logic, and decide repo/package location among `packages/vscode`/`extensions/vscode`/`apps/vscode`.

Constraints: offline-first, deterministic, no `process.exit` from SDK, cancellable, types, ESM/CJS policy (current `type: module`, Node ≥22), small dependency set, machine-readable + human-readable.

## Decision

### SDK boundary (EPIC J)

1. **Single public entry**: `src/index.ts` remains the ONLY supported import surface. `package.json` `exports: { ".": { types/import }, "./mcp": { types/import } }` is unchanged. No deeper `src/core/**` imports are public (enforced by contract test + lint import-restriction). `ackit` is the CLI bin (`dist/cli/index.js`), not an SDK artifact.

2. **Supported exports** (v0.2.0 frozen surface):
   ```ts
   export { scanRepository } from "./api/scan-repository.js";
   export { loadAckitConfig } from "./core/config/load.js";
   export type { AckitConfig } from "./core/config/schema.js";
   export type { PackManifestEntry, PackResult, BuildPackOptions } from "./core/context/pack.js";
   export { buildContextPack } from "./core/context/pack.js";
   export { buildInstructionGraph, resolveEffectiveStack } from "./core/instructions/graph.js";
   export type { InstructionGraph, InstructionNode, ProviderId, BuildGraphOptions, EffectiveStack } from "./core/instructions/types.js";
   export type { Finding, ScanCategory, ScanDiagnostic, ScanResult, ScanRule, Severity } from "./core/scanner/types.js";
   export type { SkillIssue, SkillRecord } from "./core/skills/types.js";
   export { validateSkills } from "./core/skills/validate.js";
   // v0.2.0 additions:
   export { scoreRepository } from "./core/readiness/score.js";
   export type { ScoreReport, CategoryScore, Deduction } from "./core/readiness/types.js";
   export type { ProfileId, ProviderProfile } from "./core/profiles/types.js"; // or merged into instructions/types
   export { evaluateRulePack } from "./core/policy/packs/evaluate.js"; // pure, no I/O
   ```
   Additions/removals require contract-test `tests/contract/api-surface/api-surface.test.ts` update + ADR-0021 amendment. Internal types (`FilesystemEngine`, `RuleRegistry`) are private.

3. **Error model**: `class AckitError extends Error { code: "CONFIG-..." | "SCAN-..." | "POLICY-..." | "GRAPH-..." | "PACK-..."; remediation?: string; cause?: unknown }`. SDK never throws raw strings. Async functions accept `{ signal?: AbortSignal }` and reject with `DOMException` name `AbortError` within 200ms when aborted.

4. **Process discipline**: No `process.exit`, no global `process.on` installs, no env mutation. Callers receive `{ findings, diagnostics, exitCodeSuggestion }` and decide.

5. **Package policy**: `type: module` (ESM-only) — CJS consumers use dynamic `import()` shim doc'd in `docs/reference/sdk.md`. `sideEffects: false`, `engines.node >=22`, `exports` frozen. `examples/sdk-consumer.mjs` proves a fresh tarball install runs `import { scanRepository }`.

6. **Compatibility**: SDK semver follows the package version (0.2.0). Docs commit to "pre-1.0: minor may add, not remove; post-v2.0: semver-stable" (extra policy section). Every breaking export change carries `CHANGELOG.md` `BREAKING:` note and ADR entry.

### VS Code extension (EPIC K)

1. **Location**: `extensions/vscode/` — chosen after auditing actual repo layout: root has no `packages/` or `apps/` directory; docs show `templates/` + `benchmarks/` + `schemas/` only. `extensions/` is the VS Code community convention, keeps the root single-package (ADR-0002). Its own `package.json` (`name: ackit-vscode`, `publisher: cynrath`) is NOT the npm library; it builds to `.vsix`. The repo's `pnpm-workspace.yaml` is NOT introduced (keeps single-package install), the extension has its own `package.json` but is built via `esbuild` under root scripts `build:vscode` etc.

2. **Runtime: direct SDK import** (preferred over subprocess):
   - Extension's `extension.ts` runs inside VS Code's Node host and does `import { scanRepository } from "@cynrath/agent-context-kit"` resolved against the installed library (bundled dep). Subprocess CLI invocation (`child_process.spawn("ackit")`) is reserved as fallback if VS Code's sandbox restricts direct SDK FS access on a platform — documented in `extensions/vscode/SECURITY.md` why one path was chosen (start with SDK, fallback to subprocess ftok if `ENOENT` on scan).
   - SDK reuse proof: `src/dashboard/ui` and extension share types; a `scripts/check-sdk-reuse.mjs` grep asserts `extensions/vscode/src/**` imports only from `@cynrath/agent-context-kit` / `vscode` / stdlib (no direct `src/core/scanner/pipeline`).

3. **Feature slice**: readiness status bar (`$(shield)` + score), Problems (`DiagnosticCollection` per `ACKITxxx` code), tree views (Readiness categories, Findings by severity, Instruction graph, Tasks, Policy/packs), QuickPick "Instructions for current file" = `resolveEffectiveStack` over active editor path, optimize CodeActions, Command Palette (`ACKit: Refresh / Show Graph / Optimize / Diagnostics / Toggle Watch`). File watcher connects to the local engine (reuses watch semantics), not VS Code's alone, debounced 400ms.

4. **Activation**: `activationEvents: ["onStartupFinished"]` with lazy loading — `activate()` only registers providers; scan/graph/pack are async on first command/fileOpen, so startup cost <50ms. Cross-platform smoke via `@vscode/test-electron`.

5. **Distribution**: `vsce package` → `ackit-0.2.0.vsix` (audit whitelist: `extension/dist/**`, `package.json`, `README.md`, `LICENSE`, `CHANGELOG.md` slice, `images/**`). Size <2MB. Marketplace publish (`vsce publish`) is a separate explicit authorization checkpoint (never auto); CI validates `vsce package` + `vsce ls` white-list only. Version alignment: extension `version` must equal core package version (check at activation + in contract test); mismatch → warning notification.

## Rationale

Single-entry SDK with typed errors and AbortSignal cancellation is proven for CLI+MCP+Action+dashboard+VS Code reuse without plugin execution. `extensions/vscode/` keeps the repo's single-package invariant while giving VS Code a discoverable home.

## Alternatives considered

- CJS package in addition to ESM: rejected — Node 22+ handles ESM natively; adding `cjs` doubles publish surface for no consumer evidence.
- Extension as separate repo (`Cynrath/agent-context-kit-vscode`): rejected — version alignment + doc sync would drift; colocated under `extensions/` with independent `.vsix` versioning is tighter for v0.2.0.
- CLI subprocess for extension: noted as fallback (documented tradeoff: cleaner boundary vs two runtimes); direct SDK import is cheaper and gets AbortSignal cancellation for free.

## Consequences

- New directories: `extensions/vscode/{src,package.json,README.md,CHANGELOG.md,images}`; build emits `dist/extension.js` (bundled by `esbuild`, <100KB) — justificar is hand-rolled if weight under 100KB with no dep.
- New tests: `@vscode/test-electron` suite in `extensions/vscode/src/test/suite/`, grep-reuse gate.
- SDK docs: `docs/reference/sdk.md` updated with SDK-first examples and extension consumer note.
- VSIX audit: part of TASK-0024 release readiness gate.

## Related requirements

REQ-V020-J-001..003, REQ-V020-K-001..003.

## References

- `src/index.ts` (current surface, 25 lines)
- `package.json` (`exports`, `sideEffects`, `engines`)
- `docs/architecture/overview.md` (SDK as shared engine)
