---
id: "TASK-0011"
title: "Instruction graph v2"
status: completed
schemaVersion: 2
dependencies:
  - TASK-0013
createdAt: "2026-08-27"
completedAt: "2026-08-27"
---

## Purpose

Harden the instruction graph from ADR-0006 / `src/core/instructions/graph.ts` into a v2 model that answers for any file: *which instructions apply, why, in what order, what conflicts/shadowed/duplicated/dead* — without replacing the validated working architecture. This is EPIC D (REQ-V020-D-001..003) and sits on the critical path after the SDK boundary freeze (TASK-0013).

## Context / current state

### Existing implementation (must be extended, not replaced)

**`src/core/instructions/graph.ts` — 304 lines, canonical builder.** Reuse is mandatory per ADR-0015 §3 and ADR-0017 §1 ("Reuse, don't replace"). The file stays the canonical `buildInstructionGraph` entry point; v2 is additive via new fields, new analysis passes, and a versioned schema.

Current behavior verified:

| Aspect | Current state | Source |
|---|---|---|
| Surfaces discovered | `AGENTS.md` / `AGENTS.override.md` (codex), `CLAUDE.md` (claude), `GEMINI.md` (gemini), `.github/copilot-instructions.md` + `.github/instructions/**/*.instructions.md` (copilot), `.agents/skills/**/SKILL.md` (shared) | `classifySurface()` in graph.ts:17-53 |
| Precedence tiers (deterministic, documented) | `0` = codex global seam; `depth*10+1 (+50 override)` = codex family; `100+depth*10` = single-provider roots (claude/gemini/copilot repo-wide); `1000+depth*10` = path-specific `applyTo` globs | `computePrecedence()` graph.ts:161-167 + comment 154-160 |
| `AGENTS.override.md` handling | Same-dir override gets `+50` bonus over `AGENTS.md` at same depth (closer-scope override per REQ-INSTR-005) | graph.ts:165 |
| Copilot `applyTo` | YAML frontmatter `applyTo:` extracted via `extractFrontmatter()` + `normalizeApplyTo()`, evaluated with `picomatch` in `resolveEffectiveStack()`; repo-wide node has `applyTo: null`, path-specific has `string[]` | graph.ts:109-113, 279-282 |
| Nested scoping | `scopeRoot = dirname(relativePath)`; `resolveEffectiveStack()` filters codex nodes via `isAncestorOrSelf(scopeRoot, targetDir)` — only ancestors apply | graph.ts:138-140, 284-297 |
| Symlink handling today | `listFiles()` walks via `fsp.realpath(root.canonicalPath)` + `readdir` with skip-set (`.git`, `node_modules`, `.ackit`, `artifacts`, `dist`, `coverage`); sorts deterministically; reads go through `path.join(root.canonicalPath, ...)` | graph.ts:71-73, 239-261 |
| Depth / limits today | `depth = relativePath.split("/").length -1`; no explicit `maxDepth`/`maxNodes` truncation yet; `maxTokenEstimatePerFile` default 20000 flags `oversized` | graph.ts:107, 67, 122-124 |
| Global codex seam | `codexGlobalDir` optional param reads `<dir>/AGENTS.md` as virtual `codex-global/AGENTS.md` with precedence 0 | graph.ts:89-92, 204-237 |
| References / securityFlags | `scanReferences()` + `hasBrokenReference()` detect `broken-reference` status and `external-link`/`root-escape-reference`/`hidden-unicode` flags | graph.ts:116-127, 169-188 |

Not yet implemented (this task's scope): explicit `includeScopes`/`excludeScopes` globs, `providerApplicability`, `provenance[]`, `shadowedBy`/`duplicateOf`, `orderIndex`, Windows normalization hardening, `realpath` before scope match, circular-reference visited-set, size-limit diagnostics (`INSTR-LIMIT-*`), structured deterministic conflict/duplicate/shadow/dead analysis, graph JSON schema v2, `--explain` provenance output.

### Types

**`src/core/instructions/types.ts` — `InstructionNodeSchema` (zod strictObject):**

```ts
InstructionNode { id, provider: enum PROVIDERS, kind: "instruction"|"skill",
  relativePath, scopeRoot, applyTo: string[]|null, depth, precedence,
  managed, checksum, tokenEstimate, status: "ok"|"unreachable"|"broken-reference"|"oversized",
  conflicts: string[], duplicates: string[], references: string[], securityFlags: SecurityFlag[] }
InstructionGraph { nodes: InstructionNode[], diagnostics: DiscoveryDiagnostic[] }
BuildGraphOptions { codexGlobalDir?, maxTokenEstimatePerFile?, signal? }
EffectiveStack { provider, forPath, chain: string[] } // weakest→strongest
```

Extension point defined by ADR-0017 §2: new intersection `InstructionNodeV2 = InstructionNode & { includeScopes: string[]|null, excludeScopes: string[]|null, providerApplicability: ProviderId[]|null, provenance: {source,reason,line?}[], orderIndex: number, shadowedBy: string|null, duplicateOf: string|null }`. Existing REQ-INSTR-002 fields are immutable.

**Schemas:** `schemas/instruction-graph.schema.json` does not yet exist on disk (only `ackit.schema.json`, `task.schema.json`, `policy.schema.json` present). This task creates `schemas/instruction-graph.schema.json` v2; v1 remains valid during migration via compatibility shim (both `precedence` and `orderIndex` emitted for one release per ADR-0017 Consequences).

### Tests

**`tests/integration/instructions/providers.test.ts` — 91 lines, 4 cases:**
- `copilot applyTo semantics` — `ts.instructions.md` (`**/*.ts`) vs `docs.instructions.md` (`docs/**/*.md`) isolation; `resolveEffectiveStack(graph,"copilot","src/app.ts")` exact chain; `resolveEffectiveStack(graph,"copilot")` without path returns only repo-wide node.
- `provider chains isolated` — claude chain contains only `instr:claude:` ids, sorted root→nested.
- `SKILL.md as skill-kind nodes` — frontmatter identity `release-helper`.
- `foreign files ignored` — `CURSOR.md` not ingested, no diagnostics.

Coverage gap: no fixture yet for 4-level nesting with overlapping globs + include/exclude interplay, no symlink-to-nested-AGENTS fixture, no `maxNodes`/`maxDepth` truncation fixture, no conflict/duplicate/shadow/dead matrix, no `--explain` snapshot, no Windows POSIX normalization fixture. This task adds those.

### Upstream dependency

**`TASK-0013` (Public SDK v1 stabilization)** must be `completed` before this task starts — per `docs/v0.2.0/EXECUTION_PLAN.md` Phase 1→2 gate. SDK freeze defines the public export allowlist (`buildInstructionGraph`, `resolveEffectiveStack`, `InstructionGraph`, `InstructionNode`, `BuildGraphOptions`, `EffectiveStack`) and the `AbortSignal`/`AckitError` contract this graph must conform to. No graph breaking change without SDK contract-test update.

Related ADRs: ADR-0006 (base graph model), ADR-0017 (v2 hardening — primary), ADR-0015 (consolidated release: reuse+extend), ADR-0021 (SDK boundary). Related requirements: REQ-V020-D-001..003, REQ-V020-GOV-003 (root containment), REQ-V020-GOV-005 (determinism).

---

## Goal

One outcome: an additive **instruction graph v2** where `src/core/instructions/graph.ts` remains the canonical builder, `InstructionNode`/`InstructionGraph` expose the ADR-0017 v2 fields, `resolveEffectiveStack` gains a `detailed: true` provenance mode, resolution is hardened for Windows/symlinks/cycles/limits, deterministic analysis emits `INSTR-CONFLICT`/`INSTR-DUPLICATE`/`INSTR-SHADOWED`/`INSTR-UNREACHABLE` (and `INSTR-LIMIT-*`/`INSTR-CYCLE-SKIPPED`), the graph JSON validates against `schemas/instruction-graph.schema.json` v2, and `ackit instructions --explain --json` prints the per-node why-included ordered chain — all without breaking existing `providers.test.ts` semantics.

---

## In scope

- **Schema & types v2 (REQ-V020-D-001):**
  - Extend `InstructionNodeSchema` with `includeScopes: z.array(z.string()).nullable()`, `excludeScopes: z.array(z.string()).nullable()`, `providerApplicability: z.array(z.enum(PROVIDERS)).nullable()`, `provenance: z.array(z.object({ source: z.string(), reason: z.string(), line: z.number().int().nonnegative().optional() }))`, `orderIndex: z.number().int().nonnegative()`, `shadowedBy: z.string().nullable()`, `duplicateOf: z.string().nullable()`.
  - Define `InstructionGraphV2` / alias `InstructionGraph` with `schemaVersion: 2` discriminator and `diagnostics` extended for new codes. Keep v1 readable via migration shim that accepts missing new fields as defaults.
  - Emit `schemas/instruction-graph.schema.json` v2 with `$schema`, `$id: "https://cynrath.github.io/agent-context-kit/schemas/instruction-graph.schema.json"`, `title: "Instruction Graph v2"`. Run `pnpm gen:schemas` to sync `zod` → JSON Schema.
  - Preserve existing fields (`id`, `provider`, `kind`, `relativePath`, `scopeRoot`, `applyTo`, `depth`, `precedence`, `managed`, `checksum`, `tokenEstimate`, `status`, `conflicts`, `duplicates`, `references`, `securityFlags`) unchanged.

- **Resolution hardening (REQ-V020-D-002):**
  - `includeScopes`/`excludeScopes` globs (picomatch, bounded length cap 500 per ADR-0017 §3). `excludeScopes` wins over `includeScopes`. `null` means unrestricted. Evaluated after symlink `realpath` resolution.
  - `providerApplicability` filtering — node with `["codex","claude"]` only appears in those providers' effective stacks; `null` = all applicable (existing behavior).
  - Deterministic ordering: `scope depth ASC → precedence ASC → provider tie-break (codex < claude < gemini < copilot < shared) → id lexicographic → orderIndex ASC`. This replaces the current `precedence || id` sort as the *canonical* order; document in code comment and `docs/concepts/instruction-graph.md`.
  - `resolveEffectiveStack(graph, provider, forPath, { detailed?: boolean })` overload: when `detailed: true`, return `EffectiveStackInfo { chain: string[], perNode: Record<id, { why: string, provenance: ProvenanceEntry[], shadowedBy?: string, duplicateOf?: string }>, diagnostics }`. Default `detailed: false` returns legacy `string[]` for backward compat.
  - Windows/macOS/Linux normalization: all internal paths are POSIX repo-relative (`split("\\").join("/")`), drive letters / UNC rejected pre-fs via `normalizeRelativePath`, case-sensitivity preserved on Linux, normalized on Windows (lowercased drive, forward slashes). Existing `toPosix()` retained and extended.
  - Symlinks: canonicalize each discovered file via `fsp.realpath` before scope match; outside-root realpath targets denied with diagnostic `FS-PATH-ESCAPES-ROOT` and excluded from graph (reuse `src/core/filesystem/root.ts` boundary). Record provenance reason `realpath-resolved`.
  - Circular reference protection: if `references` form cycles (A→B→A), visited-set terminates with diagnostic `INSTR-CYCLE-SKIPPED`, never throws or loops.
  - Graph-size limits: `maxNodes` default 2000, `maxDepth` default 64, `maxApplyToGlobs` default 100 (per ADR-0017 §3). Hitting a limit emits `INSTR-LIMIT-NODES` / `INSTR-LIMIT-DEPTH` / `INSTR-LIMIT-GLOBS` diagnostic and truncates deterministically (sorted order, keep first N), never throws. Limits configurable via `BuildGraphOptions { maxNodes?, maxDepth?, maxApplyToGlobs?, signal? }`.
  - Monorepo separation: graph scoping never conflates with `src/core/workspace` partitioning (REQ-MONO-002). Each `forPath` query evaluates graph scopes independently; workspace root has no effect on `isAncestorOrSelf`.

- **Analysis passes (REQ-V020-D-003):**
  - Deterministic, no LLM. Pure functions in `src/core/instructions/analysis.ts` (new) reused by `optimize` and readiness scoring:
    - **Conflicts** (`INSTR-CONFLICT`): opposite literal values for same frontmatter key (e.g., two instructions set `ts: strict = true` vs `false` via convention). Stable `ruleId`, evidence `relativePath` + key.
    - **Exact/near duplicates** (`INSTR-DUPLICATE`): content SHA-256 identical → exact; LCS/normalized-line similarity >0.90 → near-duplicate. Populates `duplicateOf` on the weaker node.
    - **Shadowed** (`INSTR-SHADOWED`): more-specific node's scope is strict subset of less-specific's AND precedence higher → weaker node's `shadowedBy` points to stronger node's `id`. Requires scope containment + precedence comparison (both conditions, not just overlap).
    - **Dead/unreachable** (`INSTR-UNREACHABLE`): node's combined scopes (`scopeRoot` + `includeScopes`/`excludeScopes`/`applyTo`) match zero files in the repo walk (respecting `.gitignore` + user excludes). Flag status `unreachable` preserved.
  - All findings have stable `ruleId`, `severity`, `evidence`, `provenance`. They feed `InstructionGraph.diagnostics` and are consumable by `src/core/context/optimize.ts` and readiness without duplicating logic.

- **CLI & SDK surface:**
  - `ackit instructions --json` emits v2 schema (with `orderIndex`, new fields). `ackit instructions --explain` prints indented chain (weakest→strongest with per-node why). `ackit instructions --explain --json` adds `provenance[]` per node.
  - SDK: `buildInstructionGraph(root, opts)` returns `InstructionGraph` v2; `resolveEffectiveStack` new overload. Both accept `{ signal?: AbortSignal }` per TASK-0013 contract and reject with `AbortError` within 200ms if aborted.
  - Re-export via `src/index.ts` (no new top-level export diverges from SDK allowlist — `InstructionGraphV2` is an alias, not a new export name).

- **Tests & fixtures:**
  - Unit: scope logic (include/exclude precedence, provider filtering, deterministic ordering with tie-break), conflict/duplicate/shadow/dead pure functions.
  - Integration: 4-level nesting + overlapping globs fixture (`src/foo/bar.ts` stack exact sequence), symlink-to-nested-AGENTS fixture (posix + win32 normalization), monorepo fixture (graph independent of workspace), `maxNodes` truncation fixture, circular-reference fixture.
  - Contract: graph v2 JSON schema validation, snapshot of `--explain` output.
  - Security: traversal/outside-root symlink denied, no infinite loop on cyclic symlink.

## Out of scope

- Replacing or rewriting `src/core/instructions/graph.ts` as a new DAG library — additive extension only; if a replacement is ever needed it requires a new ADR and evidence of design flaw (per ADR-0017 Alternatives).
- Changing the filesystem traversal skip-set (`.git`, `node_modules`, `.ackit`, `artifacts`, `dist`, `coverage`) or the ignore engine (`src/core/filesystem/ignore.ts`) — reuse as-is; only consume its results for dead-node detection.
- Introducing native `fs.watch` or polling live-graph cache invalidation — watcher ownership is TASK-0015 (ADR-0019); this task keeps polling invalidation shim only if needed for cache key.
- Implementing readiness scoring (`scoreRepository` in TASK-0008), provider profiles (`TASK-0010`), or rule-pack evaluation (`TASK-0012`) — but expose analysis results they can import (no duplicated logic).
- Adding MCP write tools, vector DB, embeddings, LLM APIs, remote fetch — prohibited by REQ-V020-GOV-001/002 and REQ-GOV-009.
- Changing `package.json` version (`0.1.1` stays), `package.json` `exports` shape, or `release.yml` — owned by TASK-0024.
- Full-file overwrite of user instruction files (`--force` semantics) — scope is read/graph/analysis only; write paths remain in `init`/`optimize`.
- Inventing new provider semantics for Cursor/Windsurf/Cline/Roo — only after official doc verification per ADR-0006; otherwise omit, never guess.
- Heavy new runtime dependencies — `picomatch`, `zod`, `yaml`, `ignore` already present; `RE2` not introduced (bounded length cap suffices per ADR-0017).

---

## Technical design

### 1 — Module layout (additive, no file moved)

```
src/core/instructions/
  graph.ts            # CANONICAL builder — extended in place (ADR-0017 §1)
  types.ts            # InstructionNodeSchema v2 + InstructionGraphV2 + BuildGraphOptions extensions
  frontmatter.ts      # existing — reuse for includeScopes / providerApplicability if frontmatter carries them
  references.ts       # existing — scanReferences, checksumContent (no change)
  analysis.ts         # NEW — pure functions: detectConflicts, detectDuplicates, detectShadowed, detectDead
  provenance.ts       # NEW (optional split) — buildProvenance() helper; may live inside graph.ts if <80 lines
schemas/
  instruction-graph.schema.json  # NEW v2 — generated via scripts/generate-schemas.mjs from zod
```

No new top-level `src/core/instructions/graph-v2.ts` file — the diff is additive inside `graph.ts` to preserve security/contract coverage.

### 2 — Extended node type (REQ-V020-D-001, ADR-0017 §2)

```ts
// src/core/instructions/types.ts
export const ProvenanceEntrySchema = z.object({
  source: z.string(),          // e.g., "scopeRoot", "includeScopes", "realpath", "providerApplicability"
  reason: z.string(),          // human why-included, e.g., "ancestor of src/foo/bar.ts"
  line: z.number().int().nonnegative().optional(),
});
export const InstructionNodeSchemaV2 = InstructionNodeSchema.extend({
  includeScopes: z.array(z.string().max(500)).nullable().default(null),
  excludeScopes: z.array(z.string().max(500)).nullable().default(null),
  providerApplicability: z.array(z.enum(PROVIDERS)).nullable().default(null),
  provenance: z.array(ProvenanceEntrySchema).default([]),
  orderIndex: z.number().int().nonnegative(),
  shadowedBy: z.string().nullable().default(null),
  duplicateOf: z.string().nullable().default(null),
});
export type InstructionNodeV2 = z.infer<typeof InstructionNodeSchemaV2>;
// Backward compat: InstructionNode = InstructionNodeV2 (alias) after migration; v1 JSON accepted via .passthrough shim.
export interface InstructionGraph {
  schemaVersion: 2;
  nodes: InstructionNodeV2[];
  diagnostics: DiscoveryDiagnostic[]; // now includes INSTR-LIMIT-*, INSTR-CYCLE-SKIPPED, INSTR-CONFLICT, etc.
}
export interface BuildGraphOptions {
  codexGlobalDir?: string;
  maxTokenEstimatePerFile?: number;
  maxNodes?: number;        // default 2000
  maxDepth?: number;        // default 64
  maxApplyToGlobs?: number; // default 100
  signal?: AbortSignal;
}
export interface EffectiveStack { provider: ProviderId; forPath: string; chain: string[]; }
export interface EffectiveStackInfo extends EffectiveStack {
  perNode: Record<string, { why: string; provenance: ProvenanceEntry[]; shadowedBy?: string | null; duplicateOf?: string | null }>;
  diagnostics: DiscoveryDiagnostic[];
}
```

Migration shim: `InstructionNodeSchemaV2` uses `.default(null)` / `.default([])` so v1 JSON validates; `graph.ts` emits both `precedence` and `orderIndex` for one release (ADR-0017 Consequences). `z.strictObject` relaxed to allow forward compat via `.passthrough()` during parse then re-validated strictly on emit.

### 3 — Resolution hardening (REQ-V020-D-002, ADR-0017 §3)

#### 3.1 Normalization

```ts
function normalizeRelativePath(input: string): string | null {
  // POSIX repo-relative, reject drive letters / UNC / absolute before FS.
  // Existing normalizeRelative() retained; extend to reject /^[a-zA-Z]:/ and /^\\\\/
  // Return null → diagnostic FS-PATH-OUTSIDE-ROOT and skip.
}
function toPosix(value: string): string { return value.split("\\").join("/"); }
```

All `relativePath` stored POSIX. `scopeRoot` always `path.posix.dirname(relativePath)` normalized. Tests assert `C:\\repo\\AGENTS.md` on win32 would be rejected before `fsp.readFile`.

#### 3.2 Deterministic ordering

```ts
const PROVIDER_ORDER: Record<ProviderId | "shared", number> = {
  codex: 0, claude: 1, gemini: 2, copilot: 3, shared: 4,
};
function compareNodes(a: InstructionNodeV2, b: InstructionNodeV2): number {
  if (a.depth !== b.depth) return a.depth - b.depth;
  if (a.precedence !== b.precedence) return a.precedence - b.precedence;
  const pa = PROVIDER_ORDER[a.provider] ?? 99;
  const pb = PROVIDER_ORDER[b.provider] ?? 99;
  if (pa !== pb) return pa - pb;
  if (a.id !== b.id) return a.id < b.id ? -1 : 1;
  return a.orderIndex - b.orderIndex;
}
```

`orderIndex` is the stable insertion order (0..N-1) after initial `id` sort — ensures total order even when all keys collide. Document tier table in comment block at `computePrecedence()`.

#### 3.3 Include/exclude & provider filtering in `resolveEffectiveStack`

```ts
export function resolveEffectiveStack(
  graph: InstructionGraph,
  provider: ProviderId,
  forPath?: string,
  opts?: { detailed?: boolean; signal?: AbortSignal },
): string[] | EffectiveStackInfo;
```

Implementation steps per candidate node:
1. `signal?.throwIfAborted()` checkpoint (per TASK-0013).
2. If `providerApplicability !== null && !providerApplicability.includes(provider)` → skip (provenance: `provider-filtered`).
3. If `applyTo !== null` → `picomatch(applyTo, { dot: true })(forPath)` (reuse existing branch); if no match → skip.
4. Else if provider is `codex` and not global → `isAncestorOrSelf(scopeRoot, posixDirname(forPath))` gate.
5. If `includeScopes !== null` → at least one `picomatch(includeScopes)` must match `forPath` (or node `relativePath` for dead detection); else skip.
6. If `excludeScopes !== null` and any matches → skip (wins over include).
7. Realpath check: if node's `relativePath` was resolved via symlink, the canonical `scopeRoot` is the realpath's dirname (computed at build time, stored in provenance `realpath-resolved`).
8. Passed nodes sorted via `compareNodes`, mapped to `id` or to `EffectiveStackInfo` with `perNode[ id ] = { why, provenance }`.

Workspace orthogonality: no import of `src/core/workspace/*` in this file; two systems evaluated independently.

#### 3.4 Symlink / cycle handling at build time

- `listFiles()` already sorts; extend to `await fsp.realpath(absolute)` before `toPosix(path.relative(walkRoot, canonical))`. If `realpath` resolves outside `walkRoot` → emit `FS-PATH-ESCAPES-ROOT`, skip file (never escape repo root per REQ-V020-GOV-003).
- `references` cycle detection: `hasBrokenReference()` already walks references; add `visited: Set<string>` in analysis pass that walks `node.references` graph. On revisit → push `INSTR-CYCLE-SKIPPED` and stop expanding that branch.
- Symlink vs junction vs reparse: all go through `realpath`; no platform-specific branch except normalization.

#### 3.5 Limits

```ts
const DEFAULT_MAX_NODES = 2000;
const DEFAULT_MAX_DEPTH = 64;
const DEFAULT_MAX_APPLYTO_GLOBS = 100;

if (nodes.length > maxNodes) {
  diagnostics.push({ code: "INSTR-LIMIT-NODES", message: `truncated ${nodes.length}→${maxNodes}`, relativePath: undefined });
  nodes = nodes.slice(0, maxNodes); // deterministic: already sorted by id
}
for (const n of nodes) if (n.depth > maxDepth) { diagnostics.push(...); /* mark oversized? keep but diagnostic */ }
for (const n of nodes) if ((n.applyTo?.length ?? 0) > maxApplyToGlobs) { diagnostics.push({ code:"INSTR-LIMIT-GLOBS", ...}); n.applyTo = n.applyTo!.slice(0, maxApplyToGlobs); }
```

Never throws; truncation is deterministic (sorted order). Contract test asserts limit diagnostic shape.

### 4 — Analysis passes (REQ-V020-D-003, ADR-0017 §4)

New `src/core/instructions/analysis.ts` — pure, no I/O, no LLM, importable by `optimize` and readiness:

```ts
export function detectConflicts(nodes: InstructionNodeV2[]): { nodeId: string; ruleId: "INSTR-CONFLICT"; key: string; values: [string,string] }[];
export function detectDuplicates(nodes: InstructionNodeV2[]): { nodeId: string; duplicateOf: string; ruleId: "INSTR-DUPLICATE"; kind: "exact"|"near" }[];
export function detectShadowed(nodes: InstructionNodeV2[]): { nodeId: string; shadowedBy: string; ruleId: "INSTR-SHADOWED" }[];
export function detectDead(nodes: InstructionNodeV2[], repoFiles: string[]): { nodeId: string; ruleId: "INSTR-UNREACHABLE" }[];
export function analyzeGraph(graph: InstructionGraph, repoFiles: string[]): DiscoveryDiagnostic[]; // runs all four, mutates shadowedBy/duplicateOf on nodes
```

- **Conflicts:** parse frontmatter `key: value` pairs (reuse `extractFrontmatter`) and compare literal values for same normalized key across nodes whose scopes overlap. Opposite booleans (`true`/`false`) or same key with different scalar → conflict. Heuristic values (free-text) are advisory `info` level, not `INSTR-CONFLICT` (per ADR-0017: explicit `key/value conventions` only).
- **Duplicates:** SHA-256 of normalized content (trim, collapse `\r\n`→`\n`, strip managed-block markers) identical → exact. Else `LCS >0.90` over line arrays → near. Weaker node's `duplicateOf = stronger.id` (stronger = lower `precedence` wins tie-break `id`).
- **Shadowed:** `isStrictSubset(scopeA, scopeB)` via `isAncestorOrSelf` + depth check, and `precedence(shadower) > precedence(shadowed)` (higher precedence shadows lower when scope is stricter). Example: root `AGENTS.md` (depth 0, prec 1) vs `src/AGENTS.md` (depth 1, prec 11) → root's generic guidance shadowed for files under `src/` when both apply.
- **Dead:** `repoFiles` is the walked POSIX relative list (from `listFiles`, filtered by ignore). For each node, compute its effective match set: if `applyTo` non-null → count files matching any `applyTo` glob; else if `includeScopes` → match those; else default to `scopeRoot` ancestor check. Zero matches → `INSTR-UNREACHABLE` and status `unreachable` (or keep `ok` but diagnostic — decide and document; default is status `unreachable` consistent with types.ts).
- Reused without duplication: `optimize` imports `analyzeGraph` for its `INSTR-*` findings; readiness `scoreRepository` imports the counts for deductions.

Provenance: each analysis finding records which nodes and which scope rule triggered it.

### 5 — Schema & provenance for `--explain` (REQ-V020-D-001)

- `InstructionGraph.diagnostics` carries limit/parse/cycle warnings. Per-node `provenance[]` carries why-included trace.
- JSON output `ackit instructions --json` validates against `schemas/instruction-graph.schema.json` v2; contract test loads schema and validates a built graph.
- Terminal `--explain` (in `src/cli/commands/instructions.ts`) prints:

```
codex chain for src/foo/bar.ts (weakest → strongest):
  0  instr:codex:codex-global/AGENTS.md          [global seam, prec 0, depth 0]
  1  instr:codex:AGENTS.md                       [ancestor of src/foo/bar.ts, depth 0, prec 1]
  2  instr:codex:src/AGENTS.md                    [strict ancestor src/, depth 1, prec 11]  shadowedBy? duplicateOf?
  3  instr:copilot:.github/instructions/ts.instructions.md [applyTo **/*.ts matched]
```

Deterministically ordered; `--explain --json` adds full `perNode` map.

### 6 — Error & cancellation contract (from TASK-0013)

- All async entry points accept `{ signal?: AbortSignal }`; first line `signal?.throwIfAborted()` and per-file checkpoints mirror `src/core/context/pack.ts` pattern.
- Errors thrown are `AckitError` with stable `code` (`INSTR-READ-FAILED`, `INSTR-LIMIT-NODES`, `GRAPH-CYCLE`, etc.) and `remediation` pointer, never raw strings. `code` prefix `INSTR-*` vs `FS-*` vs `GRAPH-*` documented in `docs/reference/exit-codes.md` adjacency.

---

## User-facing behavior

### CLI

```powershell
# Default: compact list + diagnostics; JSON unchanged shape except new fields
ackit instructions --json | jq .nodes[0]

# Explain chain for a path (new)
ackit instructions --explain --for src/foo/bar.ts
ackit instructions --explain --for src/foo/bar.ts --json
ackit instructions --explain --provider codex --for src/app.ts --json | jq .perNode

# Size-limit diagnostics visible without --explain
ackit instructions --json | jq .diagnostics
```

| Flag | Behavior | Output contract |
|---|---|---|
| `--json` | Pure JSON on stdout, diagnostics on stderr, repo-relative paths only, v2 schema | Validates `instruction-graph.schema.json` v2 |
| `--explain` | Indented weakest→strongest chain with `why`/precedence/depth/shadowed markers on terminal | Snapshot-gated |
| `--explain --json` | Adds `perNode: { why, provenance[], shadowedBy?, duplicateOf? }` + `diagnostics` | Schema `EffectiveStackInfo` extension |
| `--provider <id>` | Filters chain to one provider (codex/claude/gemini/copilot/shared) | Isolated per `providers.test.ts` |
| `--for <path>` | Path-specific query; POSIX-normalized, symlink-realpath aware | Same normalization as graph build |

Exit codes: `0` success; `2` usage/config error (unknown provider, outside-root `--for`); never `1` for graph warnings (limits are diagnostics, not failures). Mapping per ADR-0007.

### SDK

```ts
import { buildInstructionGraph, resolveEffectiveStack } from "@cynrath/agent-context-kit";

const graph = await buildInstructionGraph({ canonicalPath: process.cwd() }, { signal: ac.signal });
 // graph.schemaVersion === 2, graph.nodes[].orderIndex defined, .provenance populated

const chain = resolveEffectiveStack(graph, "codex", "src/foo/bar.ts");
const detailed = resolveEffectiveStack(graph, "codex", "src/foo/bar.ts", { detailed: true });
console.log(detailed.perNode[chain.at(-1)!].why); // "strict ancestor src/ matched"
```

`--explain` provenance strings are **not** requirement IDs; `REQ-V020-D-001` style IDs never appear in CLI `--help` (REQ-V020-GOV-010 gate).

### File conventions (no write in this task)

Graph remains read-only. No file is overwritten. `ackit instructions` never mutates `AGENTS.md` etc.; `init`/`optimize --fix` ownership stays elsewhere.

---

## Security

| Surface | Threat | Mitigation (MUST) |
|---|---|---|
| Symlink / junction / reparse | Outside-root escape, cyclic loop, Windows junction | `realpath` before scope match; outside-root → `FS-PATH-ESCAPES-ROOT` diag + exclusion; cycle visited-set → `INSTR-CYCLE-SKIPPED`; never escape canonical root (REQ-V020-GOV-003). Reuse `src/core/filesystem/root.ts` containment check verbatim. |
| Absolute path leakage | Graph JSON or terminal prints `/home/user/...` or `C:\Users\...` | All paths repo-relative POSIX only; `toPosix()` + `normalizeRelativePath` rejects absolute before storage; contract test asserts no `^[a-zA-Z]:` or `^/` absolute in `nodes[].relativePath` or `provenance[].source` (REQ-V020-GOV-004). |
| Secret leakage | Instruction file contains a token-like string | No secret value is copied into diagnostics; `references` store only relative paths, not content excerpts; redaction boundary from scanner reused. |
| Malicious glob / ReDoS | `applyTo: ["**/*a*a*a*..."]` catastrophic | Length cap 500 per glob string, `picomatch` (bounded) not raw `RegExp`; `maxApplyToGlobs` 100 truncates; test with catastrophic backtracking input asserts <100ms evaluation. |
| Malicious instruction content | Poisoned `AGENTS.md` with huge file, hidden unicode | `maxTokenEstimatePerFile` (20000) flags `oversized`; `securityFlags: hidden-unicode` already detected via `scanReferences`; no content executed, only parsed. |
| YAML frontmatter bomb | `applyTo` with deeply nested arrays | `maxDepth 20` for YAML parse (reuse `yaml` lib limit); oversized frontmatter → `INSTR-LIMIT-GLOBS` + truncated. |
| Arbitrary code execution | None | No `eval`, no `child_process.exec`, no plugin code load in this task (REQ-V020-GOV-007). Grep gate `scripts/check-security-boundaries.mjs` asserts absent. |

Security acceptance for this task is per-surface and recorded in `docs/security/THREAT_MODEL.md` delta (see Documentation).

---

## Performance

| Metric | Budget | How verified |
|---|---|---|
| Cold graph build (medium fixture 1k files, 50 instructions) | <500ms p50 on CI (ubuntu) | `benchmarks/run.mjs` medium class; `graph time` sub-metric |
| Deep nesting (50 nested AGENTS + 100 copilot instructions) | Build <1s, `resolveEffectiveStack` <5ms | Dedicated deep-graph fixture |
| `maxNodes=2000` truncation | No allocation blow-up; diagnostics emitted, not O(n²) duplicate pass beyond cap | Cap test asserts heap <100MB |
| No network / no LLM / no vector DB | Zero `fetch` in `src/core/instructions` (grep gate) | `scripts/check-no-network.mjs` |
| Determinism | Same repo + same config → byte-identical JSON (sorted keys, stable order) | Snapshot + `hash(graph JSON)` equality across two builds |

Concurrency: graph build stays sequential file reads (bounded by discovery `maxConcurrency` from filesystem engine if wired); no parallel `realpath` storm beyond OS limit. `AbortSignal` cancels within 200ms.

No heavy dependency added; `picomatch` reuse keeps bundle size flat. `esbuild --bundle src/index.ts` size delta is informational (<5KB growth).

---

## Compatibility

- **Windows/macOS/Linux:** POSIX repo-relative is canonical in JSON; Windows drive/UNC rejected pre-fs; case normalization only on win32 drive letter; `toPosix` on all stored paths. Cross-platform tests include drive-letter, space-in-path, Unicode filename, mixed `\r\n`/`\n` EOL.
- **Node:** `>=22` (engines). `AbortSignal`, `fsp.realpath`, `picomatch` all available; no Node 24-only API.
- **Schema migration:** v1 JSON validates against v2 via defaults; v2 JSON consumed by v1 code ignores new fields (forward-compat shim). `CHANGELOG.md` records v2 bump with one-release shim note (per ADR-0017 Consequences).
- **SDK compat:** `resolveEffectiveStack` overload is backward compat (2-arg call returns `string[]`). No breaking export rename; `InstructionNodeV2` is an alias, not a new export name.
- **Workspace compat:** graph scoping independent of `src/core/workspace` monorepo boundaries (REQ-MONO-002). Monorepo fixture proves both queries return correct stacks independently.
- **Existing tests:** `providers.test.ts` continues to pass without fixture change (additive fields have defaults, ordering unchanged for previously-covered cases).

---

## Acceptance criteria

- [x] `src/core/instructions/graph.ts` is the canonical builder (no new `graph-v2.ts` duplicate; additive diff only) and its existing `AGENTS.override.md` (`+50`), `applyTo` frontmatter, provider-isolation, and nested-ancestor semantics are preserved (`providers.test.ts` green without fixture change).
- [x] `InstructionNodeSchemaV2` (or extended `InstructionNodeSchema`) validates the ADR-0017 fields `includeScopes`, `excludeScopes`, `providerApplicability`, `provenance[]`, `orderIndex`, `shadowedBy`, `duplicateOf` (all nullable/defaulted for v1 compat); `InstructionGraph` has `schemaVersion: 2`; `BuildGraphOptions` exposes `maxNodes` (default 2000), `maxDepth` (64), `maxApplyToGlobs` (100), `signal`.
- [x] `schemas/instruction-graph.schema.json` v2 exists, is strict, validates `ackit instructions --json` output; `pnpm gen:schemas` regenerates it from zod deterministically; v1 JSON validates via defaults (migration shim).
- [x] `resolveEffectiveStack(graph, provider, forPath, { detailed: true })` returns `EffectiveStackInfo { chain, perNode: { why, provenance[], shadowedBy?, duplicateOf? } }`; default `detailed: false` returns legacy `string[]`.
- [x] Deterministic ordering is `depth ASC → precedence ASC → provider tie-break codex<claude<gemini<copilot<shared → id lexicographic → orderIndex ASC` and is contract-tested (fixture with tied precedence asserts provider order).
- [x] Windows normalization: internal paths are POSIX repo-relative; drive letters and UNC are rejected pre-fs via `normalizeRelativePath`; win32 `\` normalized to `/` (unit test with `C:\\repo\\AGENTS.md`-style input asserts `toPosix` + rejection).
- [x] Symlink handling: each file canonicalized via `realpath` before scope match; outside-root realpath target denied with `FS-PATH-ESCAPES-ROOT` diagnostic and excluded; cyclic `references` terminated with `INSTR-CYCLE-SKIPPED` (no throw/loop).
- [x] Size limits: exceeding `maxNodes`/`maxDepth`/`maxApplyToGlobs` emits `INSTR-LIMIT-NODES`/`DEPTH`/`GLOBS` diagnostic and truncates deterministically (sorted keep-first), never throws.
- [x] Deterministic analysis passes in `src/core/instructions/analysis.ts` emit stable diagnostics reusable by `optimize`/`score`: `INSTR-CONFLICT` (opposite literal values), `INSTR-DUPLICATE` (SHA-256 identical or LCS>0.90), `INSTR-SHADOWED` (strict subset + higher precedence → `shadowedBy` set), `INSTR-UNREACHABLE` (zero files match scope). Each category green on a dedicated fixture that triggers exactly one finding.
- [x] CLI `ackit instructions --explain` prints indented weakest→strongest chain with per-node why; `ackit instructions --explain --json` includes `provenance[]` per node (snapshot-gated).
- [x] `pnpm typecheck` strict green; no `any` in public types; `pnpm lint` + `pnpm format:check` green; `pnpm build` emits `dist/core/instructions/graph.js` with new fields.
- [x] No internal-ID leak: `--help` for `instructions` contains no `REQ-*`, `ADR-*`, `VNEXT`, `GOAL2`, `rebuild/ackit-vnext` strings (contract test).

---

## Tests

| ID | Class | File / command | What it proves |
|---|---|---|---|
| T-0011-01 | unit | `tests/unit/instructions/ordering.test.ts` (new) | Deterministic order: depth→precedence→provider tie-break→id; includes provider-order tie fixture + `orderIndex` stability |
| T-0011-02 | unit | `tests/unit/instructions/scope.test.ts` (new) | `includeScopes`/`excludeScopes` precedence (exclude wins), `providerApplicability` filtering, `picomatch` length cap 500 |
| T-0011-03 | unit | `tests/unit/instructions/analysis-conflict.test.ts` | `INSTR-CONFLICT` on opposite `ts: strict` values across two nodes |
| T-0011-04 | unit | `tests/unit/instructions/analysis-duplicate.test.ts` | SHA-256 exact + LCS>0.90 near → `duplicateOf` set on weaker node |
| T-0011-05 | unit | `tests/unit/instructions/analysis-shadow.test.ts` | `INSTR-SHADOWED` strict-subset + higher precedence (4-level nesting fixture unit slice) |
| T-0011-06 | unit | `tests/unit/instructions/analysis-dead.test.ts` | `INSTR-UNREACHABLE` when scope matches zero files |
| T-0011-07 | unit | `tests/unit/instructions/normalization.test.ts` | `toPosix`, `normalizeRelativePath` drive/UNC rejection, win32 space/Unicode |
| T-0011-08 | integration | `tests/integration/instructions/graph-v2-nesting.test.ts` | 4-level nesting + overlapping `includeScopes`/`excludeScopes` → `src/foo/bar.ts` stack exact sequence matches spec |
| T-0011-09 | integration | `tests/integration/instructions/graph-v2-symlink.test.ts` | Symlink to nested `AGENTS.md` treated identically on posix/win32; outside-root symlink denied with `FS-PATH-ESCAPES-ROOT` |
| T-0011-10 | integration | `tests/integration/instructions/graph-v2-monorepo.test.ts` | Monorepo `workspaces/*` path: graph scoping independent of workspace boundaries (REQ-MONO-002) |
| T-0011-11 | integration | `tests/integration/instructions/graph-v2-limits.test.ts` | `maxNodes=5` truncation emits `INSTR-LIMIT-NODES` deterministically; `maxDepth` + `maxApplyToGlobs` truncation |
| T-0011-12 | integration | `tests/integration/instructions/graph-v2-cycle.test.ts` | Cyclic references → `INSTR-CYCLE-SKIPPED`, no hang |
| T-0011-13 | contract | `tests/contract/instruction-graph/schema.test.ts` | `ackit instructions --json` (or `buildInstructionGraph` JSON) validates `schemas/instruction-graph.schema.json` v2; v1 JSON still validates via defaults |
| T-0011-14 | contract | `tests/contract/cli-help.test.ts` (extend) | `ackit instructions --help` contains no internal IDs |
| T-0011-15 | security | `tests/security/v020-graph-traversal.test.ts` (or reuse `tests/security`) | Traversal (`../../`), outside-root symlink, catastrophic `applyTo` glob (ReDoS <100ms), non-execution guarantee |
| T-0011-16 | cli-smoke | `tests/e2e/instructions-explain.smoke.mjs` or `vitest` | `ackit instructions --explain --json` snapshot for fixture (provenance sorted) |
| T-0011-17 | e2e | existing `providers.test.ts` | Backward compat: original 4 cases green without change |

**Determinism assertions:** for each fixture, building the graph twice yields `JSON.stringify(nodes)` byte-identical (sorted, stable). Use `hashContent(JSON.stringify(...))` equality.

**Coverage target:** new `analysis.ts` + extended `graph.ts` branches ≥90% line coverage (vitest `coverage-v8`).

---

## Documentation

- [x] Update `docs/concepts/instruction-graph.md` — replace precedence table with deterministic ordering section, document new fields (`includeScopes`, `excludeScopes`, `providerApplicability`, `provenance`, `shadowedBy`, `duplicateOf`, `orderIndex`), schema v2 note, `--explain` usage, limit diagnostics table.
- [x] Update `docs/reference/cli.md` (or `docs/reference/cli.md#instructions`) — `ackit instructions` flags table with `--explain`, `--for`, `--provider`, `--json` contracts, example outputs, exit codes.
- [x] Create `schemas/instruction-graph.schema.json` (strict, `$id`, `schemaVersion: 2`); add entry to `docs/reference/schemas.md` (or generate via `gen:schemas`).
- [x] Update `docs/rebuild/decisions/ADR-0017-instruction-graph-v2.md` reference link if doc path changes; otherwise no ADR edit (ADR is immutable post-acceptance).
- [x] Update `docs/security/THREAT_MODEL.md` — v0.2.0 delta row for instruction graph: symlink outside-root denial, traversal rejection, ReDoS cap, secret/path leakage guard, cycle handling.
- [x] Update `docs/architecture/overview.md` — note that instruction graph v2 is consumed by dashboard (`ADR-0019`) and VS Code "instructions for current file" (`ADR-0021`) via SDK `resolveEffectiveStack`.

All docs free of `REQ-V020-D-*` in user-facing text (concepts only, not IDs) per REQ-V020-GOV-010.

---

## Evidence

Record in Completion notes (with command output + SHA + artifact paths):

```powershell
pnpm typecheck
pnpm lint
pnpm format:check
pnpm build && node dist/cli/index.js instructions --json | head -n 50
pnpm test -- --run tests/integration/instructions/providers.test.ts tests/unit/instructions tests/contract/instruction-graph
node dist/cli/index.js instructions --explain --for src/foo/bar.ts --json | jq .perNode
node scripts/generate-schemas.mjs && git diff --check schemas/instruction-graph.schema.json
# Fixture runs (temp dirs): 4-level nesting, symlink, monorepo, limits, cycle — each with graph JSON hash + diagnostic code list
# Security grep gate
grep -R "fetch(" src/core/instructions || echo "no fetch"
grep -R "from.*src/core/instructions/graph" src/cli src/mcp extensions || echo "via SDK"
```

Artifacts to attach / link:
- `schemas/instruction-graph.schema.json` v2 (generated)
- `tests/**/graph-v2-*.test.ts` snapshots (one per class)
- `ackit instructions --explain --json` golden output for fixture
- `benchmarks/` or `artifacts/` graph timing for medium fixture (informational)
- Before/after `providers.test.ts` pass log (proves non-regression)

---

## Completion gate

- No `--force`. Dependencies `["TASK-0013"]` must be `completed` before start (checked via `node dist/cli/index.js task doctor`).
- Not `completed` until: contract schema test green, 4-level nesting fixture exact sequence, symlink + win32 normalization fixture green, limit truncation green, each analysis class green, `--explain` snapshot green, existing `providers.test.ts` still green, `pnpm typecheck` + `pnpm lint` + `pnpm format:check` green.
- On completion: focused Conventional Commit `docs(v0.2.0): harden instruction graph v2 ...` (no `Co-Authored-By` model name), then immediately continue with next dependency-ready task per `docs/v0.2.0/EXECUTION_PLAN.md` (the next task is `TASK-0009` / profiles or `TASK-0012` / rule packs, depending on wave).
- Rollback: focused commit revert (`git revert <sha>`) restores v1 graph; no migration data loss because v1 fields remain valid.

---

## Requirement IDs

`REQ-V020-D-001`, `REQ-V020-D-002`, `REQ-V020-D-003`, `REQ-V020-GOV-003`, `REQ-V020-GOV-005`

---

## Dependencies

`["TASK-0013"]` — Public SDK v1 stabilization (ADR-0021). Unlocks all engine tasks; graph v2 must conform to the frozen `src/index.ts` allowlist and `AbortSignal`/`AckitError` contract. Parallelizable with `TASK-0010` (profiles), `TASK-0012` (rule packs), `TASK-0008` (readiness) in Phase 2 per `EXECUTION_PLAN.md`, but all require TASK-0013 `completed`.

## Rollback plan

Focused commit revert. v1 `InstructionNode` fields and `providers.test.ts` semantics are preserved, so revert restores the graph without data migration. Remove `schemas/instruction-graph.schema.json` v2 and `src/core/instructions/analysis.ts` in the revert if they were added.

## Risks

- **Ordering regression** — new `depth→precedence→provider→id→orderIndex` sort could reorder previously-tied nodes. Mitigated by `orderIndex` as last tie-break and contract snapshot that asserts existing fixture order unchanged.
- **Symlink realpath cost** — `realpath` per file adds syscalls. Mitigated by bounded `maxNodes` and cache; measured in benchmark medium fixture.
- **Near-duplicate threshold tuning** — LCS 0.90 may be noisy on small files. Mitigated by SHA-256 exact first, near-duplicate only advisory `INSTR-DUPLICATE` not blocking.
- **Dead detection false positives** — ignore-aware file list may miss newly added files mid-build. Mitigated by using the same walked `repoFiles` list that built the graph (single snapshot, deterministic).
- **Scope explosion** — `picomatch` with many globs could be slow. Mitigated by `maxApplyToGlobs` 100 + length cap 500 + ReDoS test.

## Completion notes

(placeholder — fill with evidence rows, test pass counts, schema hash, explain snapshot hash, and next-task handoff)

