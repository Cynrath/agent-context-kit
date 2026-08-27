# SDK Reference (Public SDK v1 — Stable)

The programmatic SDK is the single supported import for embedding ACKit in Node.js (CLI, MCP, Action, dashboard, VS Code all converge on it).

**Import path:** `@cynrath/agent-context-kit` (ESM only).  
**Entry:** `src/index.ts` is the ONLY public surface; `src/core/**` is internal and not exported via `package.json` `exports`.

## Supported imports

| Symbol | Kind | Description |
|---|---|---|
| `scanRepository(root, opts?)` | function | Scans a repository, returns `ScanResult` (deterministic findings, diagnostics, filesScanned). `opts.signal?: AbortSignal` cancels within 200ms. |
| `loadAckitConfig(root, opts?)` | function | Loads `ackit.yml` + policy chain, returns `{ok, config}` or `{ok:false, errors}` with `AckitError`-compatible codes. |
| `buildContextPack(root, opts?)` | function | Builds a budgeted deterministic context pack (`PackResult`). `opts.signal` supported. |
| `buildInstructionGraph(root, opts?)` | function | Builds the instruction graph (`InstructionGraph`). `opts.signal` supported. |
| `resolveEffectiveStack(graph, provider, forPath?)` | function | Pure function resolving the effective instruction stack for a provider/path. |
| `validateSkills(root)` | function | Validates `.agents/skills/*/SKILL.md` set, returns `{skills, issues}`. |
| `AckitError` | class | Typed error `extends Error { code: string; remediation?: string; cause?: unknown }`. Never a raw string. |
| `AckitErrorCode` | type | Union of stable codes (`CONFIG-*`, `SCAN-*`, `FS-*`, `POLICY-*`, `GRAPH-*`, `PACK-*`, `UNKNOWN`). |
| `AckitConfig` | type | Merged config (scan + context + policy + readiness (v0.2.0) + profile). |
| `InstructionGraph`, `InstructionNode`, `ProviderId`, `BuildGraphOptions` | types | Instruction model; `BuildGraphOptions` includes `signal?`, `codexGlobalDir?`, `maxTokenEstimatePerFile?`. |
| `Finding`, `ScanResult`, `ScanDiagnostic`, `ScanRule`, `Severity`, `ScanCategory` | types | Scanner model (SARIF-compatible). |
| `PackResult`, `PackManifestEntry` | types | Pack model (`ackit.pack.v0`). |
| `SkillRecord`, `SkillIssue` | types | Skills model. |

**Reserved v0.2.0 additions (not yet exported):**

- `scoreRepository` (readiness, TASK-0008)
- `evaluateRulePack` (rule packs, TASK-0012)

Additions require ADR + contract test update; the allowlist test fails on accidental export.

## Package contract

- `package.json` `type: "module"`, `sideEffects: false`, `engines.node >=22`, `exports: { ".": {...}, "./mcp": {...} }` only.
- Importing `@cynrath/agent-context-kit` has no side effects (no timers, servers, FS touches). `sideEffects:false` enables tree-shaking.
- No `process.exit` is ever called from SDK code; CLI maps `ScanResult`/`AckitError` to `EXIT_CODES` and owns `process.exit`.
- CJS consumers: use dynamic `await import("@cynrath/agent-context-kit")` (ESM-only, no CJS shim shipped).

## Error model

```ts
import { AckitError, scanRepository } from "@cynrath/agent-context-kit";
try {
  const result = await scanRepository(root, { signal });
} catch (e) {
  if (e instanceof DOMException && e.name === "AbortError") {
    console.log("aborted within 200ms");
  } else if (e instanceof AckitError) {
    console.error(e.code, e.message, e.remediation);
  } else if (e instanceof Error) {
    console.error("unexpected", e.message);
  }
}
```

Stable codes: `CONFIG-UNKNOWN-KEY` (did-you-mean hint in `remediation`), `CONFIG-YAML-SYNTAX`, `SCAN-CONTRACT-ERROR`, etc. Raw string throws never occur (grep-gated).

## Cancellation (AbortSignal)

All async SDK entries accept `{ signal?: AbortSignal }` and reject with `DOMException { name:"AbortError" }` within 200ms when `signal.aborted` is true before the call, and cooperatively abort mid-flight where checkpoints exist (scan batches, pack checkpoints, graph per-file).

```ts
import { scanRepository } from "@cynrath/agent-context-kit";
const ac = new AbortController();
setTimeout(() => ac.abort(), 10);
try {
  const result = await scanRepository(process.cwd(), { signal: ac.signal });
  console.log(result.findings.length);
} catch (e) {
  if (e instanceof DOMException && e.name === "AbortError") console.log("aborted");
}
```

Pattern reused from `buildContextPack` checkpoints (6 checkpoints) and `runScan` batch loop.

## Examples

- `examples/sdk-consumer.mjs` — minimal ESM import smoke (isolated tarball install validated).
- Integration tests: `tests/integration/sdk-cancellation.test.ts` proves abort <200ms.

## Compatibility

Pre-1.0 policy: minor may **add** (not remove) symbols; additive fields have defaults. `ackit.yml` v1 files remain valid under v2 (defaults for `readiness`/`profile`/`rulePacks`).

## MCP / Action / Dashboard / VS Code reuse

All share this SDK; direct `src/core` imports from `src/cli`/`src/mcp` for scanner pipeline are considered internal implementation of the package (external consumers must not import `src/core`). The public boundary is `src/index.ts`.

