# ADR-0017: Instruction Graph v2

Status: Accepted · Date: 2026-08-27

## Context

The vNext instruction graph (ADR-0006, `src/core/instructions/graph.ts`) already resolves `AGENTS.md`/`AGENTS.override.md`, `CLAUDE.md`, `GEMINI.md`, Copilot (`copilot-instructions.md` + `.github/instructions/*.instructions.md` with `applyTo` frontmatter), skills, precedence tiers, nesting, and basic analysis. v0.2.0 (EPIC D) must harden this without replacing the working architecture: nested include/exclude scopes, provider applicability, duplicate/shadowed/dead detection, provenance, explain output, deterministic ordering, monorepo separation, Windows/macOS/Linux normalization, symlink/path edge cases, circular protection, and size limits. The product must answer for any file: "Which instructions apply? Why? In what order? What conflicts/shadowed/duplicated?"

## Decision

1. **Reuse, don't replace**: `src/core/instructions/graph.ts` stays the canonical builder. v2 is additive: new fields on `InstructionNode`/`InstructionGraph` behind a versioned schema `schemas/instruction-graph.schema.json` v2 (v1 remains valid during migration). `resolveEffectiveStack(graph, provider, forPath)` remains the query seam; a new flag `detailed: true` returns structured `EffectiveStackInfo { chain: string[], perNode: { why, provenance, shadowedBy? } }`.

2. **Extended node model** (REQ-V020-D-001):
   ```ts
   type InstructionNodeV2 = InstructionNode // existing REQ-INSTR-002 fields
     & { includeScopes: string[] | null   // explicit glob allowlist (null = all)
       , excludeScopes: string[] | null   // deny globs
       , providerApplicability: ProviderId[] | null
       , provenance: { source: string, reason: string, line?: number }[]
       , orderIndex: number               // deterministic sort key
       , shadowedBy: string | null
       , duplicateOf: string | null
       }
   ```

3. **Resolution hardening** (REQ-V020-D-002):
   - Scope containment uses normalized POSIX repo-relative paths; Windows drives/UNC rejected pre-fs via `normalizeRelativePath`.
   - `includeScopes`/`excludeScopes` globs evaluated via `picomatch` (bounded, RE2-safe via length cap 500) after symlink realpath resolution. `excludeScopes` wins over `includeScopes`.
   - Provider applicability filters nodes whose `providerApplicability` does not include the queried provider.
   - Deterministic order: `scope depth ASC → precedence ASC → provider tie-break (codex<claude<gemini<copilot<shared) → id lexicographic → orderIndex`.
   - Workspace boundaries are orthogonal: graph scoping never conflates with `src/core/workspace` (monorepo) partitioning; each path query evaluates both independently.
   - Symlinks: canonicalize via `realpath` before scope match; outside-root targets denied (FS-PATH-ESCAPES-ROOT). Cyclic instruction references (if `references` point to each other) terminated via visited-set with `INSTR-CYCLE-SKIPPED`.
   - Size limits: `maxNodes` (default 2000), `maxDepth` (64), `maxApplyToGlobs` (100) — hitting a limit emits `INSTR-LIMIT-NODES/DEPTH/GLOBS` diagnostic and truncates deterministically, never throws.

4. **Analysis** (REQ-V020-D-003): deterministic, no LLM:
   - Conflicts: opposite literal values for same key (e.g., two instructions set `ts: strict = true` vs `false` via frontmatter convention) → `INSTR-CONFLICT`.
   - Exact/near duplicates: content SHA-256 identical or LCS >0.9 → `INSTR-DUPLICATE`.
   - Shadowed: more-specific node's scope is a strict subset of less-specific's AND precedence higher → `INSTR-SHADOWED` with `shadowedBy`.
   - Dead/unreachable: node's scopes match zero files in the repo walk (respecting ignore) → `INSTR-UNREACHABLE`.
   All emit stable `ruleId` and are reused by `optimize` and readiness scoring.

5. **Explain / provenance**: `ackit instructions --explain --json` adds `provenance[]` per node (why included). Terminal `--explain` prints indented chain. `InstructionGraph.diagnostics` carries limit/parse warnings.

## Rationale

Keeps the validated Codex/Copilot semantics (global seam, `AGENTS.override.md`, `applyTo` globs) while adding the missing hardening required for correctness on Windows and in monorepos. Determinism and limits are contracts, not best-effort.

## Alternatives considered

- Full graph rewrite with DAG library: rejected — would invalidate the existing security/contract coverage with no evidence of a design flaw; additive v2 schemas are cheaper and safer.
- Native `fs.watch` for live graph: rejected already for watcher (ADR-0019); polling is retained for graph cache invalidation.

## Consequences

- `InstructionGraph` JSON schema bumps to v2 (migration shim emits both `precedence` and `orderIndex` for one release).
- Existing fixtures gain snapshots for each new class; `optimize` and scoring import the analysis without duplicating logic.
- Dashboard's graph view (ADR-0019) and VS Code's "instructions for current file" (ADR-0021) consume `resolveEffectiveStack` from SDK.

## Related requirements

REQ-V020-D-001..003.

## References

- `src/core/instructions/graph.ts` (base)
- `src/core/instructions/types.ts` (InstructionNodeSchema)
- `docs/concepts/instruction-graph.md` (existing conceptual doc)
