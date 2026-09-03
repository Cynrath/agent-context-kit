---
id: "TASK-0009"
title: "Optimize v2: explain + fix plan with filters and waste estimates"
status: completed
schemaVersion: 2
dependencies: ["TASK-0008", "TASK-0011", "TASK-0012"]
createdAt: "2026-08-27"
completedAt: "2026-08-27"
---

## Purpose

Implement `ackit optimize` v2 as an actionable, evidence-rich optimization advisor with filtering, explain/provenance, token-waste quantification, and a safe fix-plan preview — replacing the current 10-category shallow advisor with an 8-class taxonomy that reuses Graph v2 + Readiness + Rule-Packs via SDK (REQ-V020-B-001..005, REQ-V020-GOV-003/004/006; ADRs 0016/0017/0018).

## Context / current state

**Current advisor — `src/core/context/optimize.ts` (368 lines, 10 categories, no strong scoring):**

- Exports `analyzeOptimize(root, { maxTokens }) → OptimizeSuggestion[]` + `applyFixes(root, suggestions, { dryRun }) → FixOutcome[]`.
- `OptimizeSuggestion { id, category, severity(high/medium/low), message, evidencePaths: string[], remediation, fixable }` — 10 categories: `conflicting-instructions`, `redundant-content`, `stale-reference`, `stale-generated-files`, `oversized-context-doc`, `duplicate-skill`, `mis-scoped-applyto`, `missing-workflow-skill`, `missing-task-docs`, `budget-overrun`. Sorted `high→medium→low`.
- Analysis is thin: maps `analyzeInstructions` findings `ACKIT300–304` into 4 categories, loops `graph.nodes` for `tokenEstimate > maxTokens` (oversized), checks `validateSkills` for `SKILL-DUPLICATE`, checks `docs/tasks` existence, checks managed-block staleness via `ensureManagedBlock`, checks `buildContextPack` budget overrun. No confidence, no token waste, no severity `critical/info`, no provenance, no per-finding line/excerpt, no `beforeAfterImpact`, no `shadowedBy`/`duplicateOf` wiring.
- `applyFixes` is fenced to two managed surfaces only (`missing-workflow-skill` → `installSkills`, `stale-generated-files` → `ensureManagedBlock` refresh with `naiveLineDiff` preview on `dryRun`). Other categories are `fixable:false` proposal-only. No unified `FixPlan { target, action, diff }` model — diff is ad-hoc string in `FixOutcome.detail`.
- No `estimateTokens`-based waste math (`tokenWasteEstimate` field absent). No reuse of Graph v2 analysis (`shadowedBy`, `duplicateOf`, `includeScopes`/`excludeScopes`) or readiness deductions or rule-pack findings.
- Deterministic and offline but evidence is coarse (`evidencePaths` only, no `line`/`excerpt`/`evidence[]` objects) and message strings are not stable-ID-keyed.

**Current CLI — `src/cli/commands/optimize.ts` (73 lines, 2 flags):**

- `runOptimizeCommand(options: { fix, dryRun })` — loads `ackit.yml` via `loadAckitConfig`, resolves root via `resolveRepositoryRoot`, calls `analyzeOptimize` with `maxTokenEstimatePerFile`, optionally `applyFixes({ dryRun })`.
- Flags supported: `--fix` + `--dry-run` only (plus inherited `--root/--config/--json/--quiet/--debug` from `InstructionsCommandOptions`). No `--explain`, no `--category`, no `--min-severity`, no `--format` (`terminal|json|markdown|sarif`), no `--diff`. JSON output is `ackit.optimize.v0` (`{ schemaVersion, tool, command, fix, dryRun, suggestionCount, suggestions, fixOutcomes }`) — pure JSON on `stdout`, diagnostics on `stderr`, but schema lacks the B-001 fields (`severity high/medium/low`, `confidence`, `evidence[{relativePath,line,excerpt}]`, `tokenWasteEstimate`, `beforeAfterImpact`, `provenance`, `plan`).
- Terminal output is `"<n> suggestion(s)"` + `  [severity] category: message` + `fix <action> <target> — <detail>` — no filters, no explain, no waste estimates.

**Gaps vs v0.2.0 contract (REQ-V020-B-001..005):**

| Gap | Current | Required |
|---|---|---|
| Taxonomy | 10 ad-hoc categories, not the 8-class B-001 set | `duplicated-instructions`, `conflicting-instructions`, `overly-broad-scopes`, `shadowed-guidance`, `stale-task/context-references`, `low-value-context-content`, `oversized-context-files`, `redundant-provider-guidance` |
| Finding shape | `evidencePaths: string[]` | `evidence: [{relativePath, line?, excerpt?}]` + `severity` + `confidence(high/medium/low)` + `remediation` + `tokenWasteEstimate?` + `beforeAfterImpact?` + `provenance?` + `plan?` |
| Explain | none | `--explain` prints provenance (graph node IDs, policy rule, instruction trigger) ordered; `--explain --json` adds `provenance: { graphNodeIds, policyRule? }` |
| Filters | none | `--category <cat>` + `--min-severity <level>` deterministic filter, empty → `0` suggestions exit `0` |
| Formats | `terminal` + `json` (v0) | `--format terminal|json|markdown|sarif` (SARIF optional P1 but spec'd); `terminal` default |
| Waste | none | `tokenWasteEstimate` via existing `estimateTokens` (src/shared/tokens.ts), labeled `"estimate"` |
| Fix plan | inline `FixOutcome` for 2 surfaces, no diff preview contract | `plan: { target, action, diff }` unified diff, `--fix --dry-run` preview without touching FS, `--fix` writes only managed surfaces (`ensureManagedBlock`, `.agents/skills`, `docs/tasks` hygiene) or explicitly listed paths; rollback guidance (revert commit) |

**Dependencies (this task waits on):**

- `TASK-0008` — Readiness / scoring engine (`src/core/readiness/`): provides `scoreRepository` + deduction signals reused for low-value/oversized hints (but optimize does not duplicate scoring logic).
- `TASK-0011` — Instruction Graph v2 (`src/core/instructions/graph.ts` v2, `schemas/instruction-graph.schema.json` v2): provides `includeScopes`/`excludeScopes`/`providerApplicability`/`shadowedBy`/`duplicateOf`/`orderIndex`/`provenance` + `INSTR-CONFLICT|DUPLICATE|SHADOWED|UNREACHABLE` analysis reused directly.
- `TASK-0012` — Declarative Rule Packs (`src/core/policy/packs/`): provides `EffectiveRulePack` findings that optimize surfaces as `overly-broad-scopes` / `low-value` inputs where applicable.

Relevant files/modules: `src/core/context/optimize.ts`, `src/core/context/pack.ts` (`estimateTokens`, `PackManifestEntry`), `src/core/instructions/graph.ts`, `src/core/instructions/analysis/*`, `src/core/instructions/types.ts`, `src/shared/tokens.ts`, `src/core/filesystem/root.ts`, `src/cli/commands/optimize.ts`, `src/cli/index.ts` (command registration), `src/index.ts` (SDK re-export), `schemas/ackit.schema.json` (optimize config sketch), `templates/profiles/` (for redundant-provider guidance).

## Goal

One concrete outcome: `ackit optimize` v2 is a deterministic, offline, CI-friendly advisor that (a) emits the 8-class taxonomy with full evidence (severity/confidence/excerpt/provenance/waste/impact), (b) supports `--explain --json --category --min-severity --format` filtering, (c) quantifies context waste via `estimateTokens` without LLM, and (d) offers a safe fix-plan preview (`--fix --dry-run` diff) that only mutates ACKit-managed surfaces, with no silent mutation on default runs (GOV-006).

## In scope

- **Findings taxonomy B-001** — replace/augment the 10-category advisor with the 8-class v2 taxonomy, preserving backward mapping where possible but documenting the migration in `docs/guides/optimize.md`:
  - `duplicated-instructions` — exact/near duplicates (hash / LCS >0.9) via Graph v2 `INSTR-DUPLICATE` (`duplicateOf`).
  - `conflicting-instructions` — opposite directive values → `INSTR-CONFLICT`.
  - `overly-broad-scopes` — `applyTo`/include glob matches >N files or `includeScopes=null` where a scoped glob is expected (reuse rule-packs/graph scope analysis; threshold via config or default heuristic — document).
  - `shadowed-guidance` — more-specific node strictly covers less-specific with higher precedence → `INSTR-SHADOWED` (`shadowedBy`).
  - `stale-task/context-references` — broken `references[]` from `scanReferences` + task ref staleness (dead graph `INSTR-UNREACHABLE` + knownFiles mismatch).
  - `low-value-context-content` — pack ranking signal: low `score` candidates + duplicate-by-hash `seenHashes` + bonus-less files (no `instructionScope`/`activeTaskRef`/`includePriority` hits).
  - `oversized-context-files` — single file `tokenEstimate > maxTokenEstimatePerFile` (existing seam, but now with `tokenWasteEstimate = tokenEstimate - maxTokens`) + pack `budget exhausted` aggregate.
  - `redundant-provider-guidance` — profile-aware: instruction applies to provider where conventions say it is ignored/duplicate (reuse `src/core/profiles` provider applicability once TASK-0018/0011 lands; if profiles task not yet done, flag is stubbed with TODO and documented fallback).

- **Finding shape B-001** — every `OptimizeFinding` (renamed from `OptimizeSuggestion` or versioned as `OptimizeSuggestionV2` — choose and document migration shim):
  ```ts
  type OptimizeFinding = {
    id: string;                      // stable: `${category}:${slug}:${hash6}`
    category: FindingCategory;       // 8-class union above
    severity: "high" | "medium" | "low";
    confidence: "high" | "medium" | "low";
    message: string;
    evidence: { relativePath: string; line?: number; excerpt?: string }[];
    remediation: string;
    tokenWasteEstimate?: number;     // integer tokens, via estimateTokens, labeled "estimate"
    beforeAfterImpact?: { tokensBefore: number; tokensAfter: number; delta: number };
    provenance?: { graphNodeIds: string[]; policyRule?: string; instructionIds?: string[] };
    plan?: { target: string; action: "update-managed" | "remove" | "narrow-scope" | "deduplicate" | "proposal-only"; diff?: string };
    fixable: boolean;
  };
  ```
  Deterministic ordering: `severity rank high(0) < medium(1) < low(2)` → `category lexicographic` → `id lexicographic` → `evidence[0].relativePath`. No timestamps in finding.

- **Telemetry of determinism** — `analyzeOptimizeV2(root, options) → OptimizeFinding[]` is pure-ish (I/O only for discovery + content reads via fs engine), no network, no LLM, no `Math.random`, sorted outputs, content hashes via `checksumContent`.

- **Token waste B-003** — where deterministically computable, set `tokenWasteEstimate` using `estimateTokens` from `src/shared/tokens.ts`:
  - Duplicates: `sum(duplicate file tokenEstimates)` (duplicate-AGENTS fixture shows waste == sum).
  - Oversized: `tokenEstimate - maxTokens` (positive only).
  - Budget overrun: sum of `PackManifestEntry.estimatedTokens` for `action==="excluded" && reason.startsWith("budget exhausted")`.
  - Label every waste number in terminal/markdown as `"(estimate)"`; JSON field is raw integer with sibling `estimator: "ackit-estimate-v1"` metadata.

- **Fix-plan boundary B-004 (GOV-006)** — default run is read-only (exit 0, no FS writes). Fix mode is explicit:
  - `optimize --fix --dry-run` (preview diff) and `optimize --fix` (writes). Both emit `plan` per fixable finding.
  - Writes limited to ACKit-managed surfaces: managed blocks (`ensureManagedBlock` for `codex|claude|gemini|copilot` shims), `.agents/skills/*` via `installSkills`/`readSkillsLock` ownership lock, `docs/tasks/*` hygiene (frontmatter normalization if decided), and explicitly listed `targets` only after containment check — never arbitrary user files without `--force` + confirmation (out of scope for this task; keep proposal-only).
  - `--diff` (alias of `--dry-run` behavior) preview uses `naiveLineDiff` (existing) or unified diff helper; every `plan.diff` is a valid unified diff snippet (headers `--- a/... +++ b/...` if multi-line, else inline `naiveLineDiff` fallback — document choice).
  - On `--dry-run`, assert file `mtime` unchanged (integration test).
  - Rollback guidance printed: `git diff -- <target>` + `git checkout -- <target>` or revert commit hint.

- **Explain B-005** — `--explain` prints provenance per finding: which graph nodes / policy rules / instructions triggered it, ordered evidence. `--explain --json` adds `provenance: { graphNodeIds: string[], policyRule?: string }` deterministically sorted.

- **CLI surface B-002** — `ackit optimize` (+ subflags):
  - `ackit optimize` — no mutation, terminal tree grouped by category/severity (default).
  - `ackit optimize --explain` — terminal with indented provenance chain.
  - `ackit optimize --json` / `--format json` — pure JSON stdout (`ackit.optimize.v1` or `ackit.optimize.v2` — version bump, keep `ackit.optimize.v0` readable shim for one release if feasible; document).
  - `--category <cat>` — repeatable or single; value must be one of 8 taxonomy values; filtering is deterministic AND (with `--min-severity`).
  - `--min-severity <level>` — `low|medium|high` (inclusive: `high` shows only high, `medium` shows medium+high).
  - `--format terminal|json|markdown|sarif` — `SARIF` optional P1: produce SARIF 2.1.0 with `tool.driver.name = "ackit"` and `results[].ruleId = finding.id`, locations repo-relative.
  - Empty result exits `0` with `[]` or `0 suggestion(s)` (no threshold failure; optimize never gates CI by itself — threshold gating lives in `scan --ci`).
  - Diagnostics on `stderr` via `emitDiagnostic`; machine `stdout` pure JSON when `--json`/`--format json|sarif`.

- **Schema & SDK** — bump schema `schemas/optimize.schema.json` (if introduced) or embed in `src/core/context/optimize.ts` zod schema; export `analyzeOptimize` (or `analyzeOptimizeV2`) + `applyFixes` from `src/index.ts` via `src/core/context/index.ts`; keep `src/core/context/optimize.ts` under 600 lines or split to `src/core/optimize/{types,analyze,fix,format}.ts` if justified with ADR note.

- **Config touch (light)** — `ackit.yml` optional `optimize: { maxTokens?: number, categories?: string[] }` sketch is out of scope for enforcement; loader tolerates unknown keys; document as future (do not change `schemas/ackit.schema.json` beyond adding the sketch to `docs/v0.2.0/config-v2-design.md`).

## Out of scope

- No instruction graph implementation (consumed from TASK-0011), no readiness engine implementation (TASK-0008), no rule-pack loader/composition (TASK-0012) — this task composes them.
- No provider-profile built-ins (`templates/profiles/`) — redundant-provider guidance reuses the selection logic but does not author profiles (TASK-0010 in exec plan; if unavailable, stub provider check).
- No watch engine (`TASK-0015`) or dashboard (`TASK-0019`) integration; optimize is CLI/SDK only.
- No GitHub Action wiring (TASK-0012/0014) — action may call `ackit optimize --json` but not in this task.
- No benchmark harness, no VS Code extension, no MCP surface.
- No `package.json` version bump (stays `0.1.1`), no `npm publish`, no tag `v0.2.0`, no GitHub Release.
- No LLM/API, no vector DB, no arbitrary JS plugin execution (GOV-007).
- No new runtime dependency without justification section (why stdlib insufficient, size/security/maintenance, alternatives).

## Technical design

### Module layout

```
src/core/context/optimize.ts          # keep or split (see below)
src/core/optimize/types.ts            # (optional split) FindingCategory, OptimizeFinding, FixPlan, Provenance
src/core/optimize/analyze.ts          # (optional) analyzeOptimizeV2 implementation per category
src/core/optimize/fix.ts              # (optional) applyFixesV2 + naiveLineDiff/unified diff helpers
src/cli/commands/optimize.ts          # flag parsing + output formatters (terminal/json/markdown/sarif)
src/index.ts                          # re-export analyzeOptimize / applyFixes / types
schemas/optimize.schema.json          # (new, optional) ackit.optimize.v1 json schema
```

If kept monolithic, `src/core/context/optimize.ts` stays the canonical engine; if split, `src/core/context/optimize.ts` becomes a barrel re-exporting `src/core/optimize/*` to preserve import paths. Document the choice in the task PR.

### Finding category → source mapping (deterministic, no LLM)

| Category | Primary source (TASK-0011/0012/...) | Heuristic | Confidence default |
|---|---|---|---|
| `duplicated-instructions` | `buildInstructionGraph` → `graph.nodes[].duplicateOf !== null` + hash `checksumContent` + near-dup LCS >0.9 on content | SHA-256 identical → high; LCS 0.9–1.0 → medium | high for exact, medium for near |
| `conflicting-instructions` | `analyzeInstructions` `ACKIT300` + Graph v2 `INSTR-CONFLICT` (opposite literal values per ADR-0017) | Compare frontmatter `key: true vs false` pairs | high |
| `overly-broad-scopes` | `applyTo`/include globs where `collectScanTargets` match count > threshold OR `includeScopes===null` at depth>0 for copilot surfaces | threshold = filesystem candidate count heuristic; doc value | medium |
| `shadowed-guidance` | `graph.nodes[].shadowedBy !== null` → `INSTR-SHADOWED` (more-specific strict subset + higher precedence) | subset test via `picomatch` scope containment | high |
| `stale-task/context-references` | `scanReferences(references[])` broken refs + `INSTR-UNREACHABLE` (node scope matches 0 files) + `collectScanTargets` knownFiles validation | broken `fsp.access` → stale; 0-match → unreachable | high for broken, medium for unreachable |
| `low-value-context-content` | `buildContextPack` ranking: low-score tail + dedup `seenHashes` owner map + `PACK_SECRET_GATE_RULES` not fired but score < median heuristic | rank score < `baseByType` and no bonus weights | low |
| `oversized-context-files` | `node.tokenEstimate > maxTokens` (per file) + pack `manifest.filter(excluded && budget exhausted)` aggregate | `tokenWasteEstimate = tokenEstimate - maxTokens` | high |
| `redundant-provider-guidance` | Profile applicability: instruction `provider !== resolvedProfile.provider` and file conventions say redundant (e.g., Copilot `AGENTS.md` where `.github/copilot-instructions.md` is the profile surface) — reuse `src/core/profiles` when available, else heuristic `ROOT_INSTRUCTION_FILES` overlap | profile-aware if TASK-0010 landed, else conservative | medium |

Each finding gets `severity` via stable mapping (preserve current `high/medium/low` but shift to B-001 intent): `conflicting/shadowed/duplicate → high`, `stale/overly-broad/oversized/redundant → medium`, `low-value/budget-overrun → low` (tune and snapshot).

### Finding detail contract (mirrors REQUIREMENTS REQ-V020-B-001)

```ts
export type FindingCategory =
  | "duplicated-instructions"
  | "conflicting-instructions"
  | "overly-broad-scopes"
  | "shadowed-guidance"
  | "stale-task/context-references"
  | "low-value-context-content"
  | "oversized-context-files"
  | "redundant-provider-guidance";

export type OptimizeFinding = {
  id: string;
  category: FindingCategory;
  severity: "high" | "medium" | "low";
  confidence: "high" | "medium" | "low";
  message: string;
  evidence: Array<{ relativePath: string; line?: number; excerpt?: string }>;
  remediation: string;
  tokenWasteEstimate?: number; // estimateTokens-derived, integer >=0
  beforeAfterImpact?: { tokensBefore: number; tokensAfter: number; delta: number };
  provenance?: { graphNodeIds: string[]; policyRule?: string; instructionIds?: string[] };
  plan?: { target: string; action: "update-managed" | "remove" | "narrow-scope" | "deduplicate" | "proposal-only"; diff?: string };
  fixable: boolean;
};

export type FixPlan = NonNullable<OptimizeFinding["plan"]>;
export type FixOutcomeV2 = { target: string; action: FixPlan["action"]; diff?: string; detail: string };
```

Deterministic ID: `id = `${category}:${kebab(message).slice(0,24)}:${hash6(evidence[0].relativePath + sortedEvidence)}`` — stable across runs (or keep existing `category+suffix` if shorter; document).

`beforeAfterImpact` is populated when a fix is preview-able: compute `tokensBefore = estimateTokens(beforeContent)` and `tokensAfter = estimateTokens(afterContent)` (e.g., after dedup/after narrowing scope removes content), `delta = tokensBefore - tokensAfter`.

### CLI flags — spec parity with REQUIREMENTS REQ-V020-B-002

Commander registration in `src/cli/index.ts` (or `src/cli/commands/optimize.ts` factory):

```ts
program.command("optimize")
  .description("Explain + fix-plan optimization advisor (read-only by default)")
  .option("--explain", "include provenance for each finding (ordered evidence)")
  .option("--json", "machine JSON to stdout (pure, diagnostics on stderr)")
  .option("--category <cat>", "filter to one finding category (repeatable)", collect, [])
  .option("--min-severity <level>", "filter: low|medium|high (inclusive)", "low")
  .option("--format <fmt>", "output format: terminal|json|markdown|sarif", "terminal")
  .option("--fix", "apply safe auto-fix (managed surfaces only)")
  .option("--dry-run", "preview fix diff without writing; implies --fix")
  .option("--diff", "alias for --dry-run (show unified diff)")
  .option("--root <path>", "...")
  .option("--config <path>", "...")
  .action(runOptimizeCommand);
```

Filtering semantics (deterministic, spec'd):

- `--category` repeatable: result = findings where `category ∈ selectedSet`; unknown category → exit 2 `usage` with diagnostic `OPT-UNKNOWN-CATEGORY`.
- `--min-severity high` → only `high`; `medium` → `medium|high`; `low` → all. Invalid value → exit 2.
- `--format` incompatibility: `--json` and `--format json` are equivalent; `--json` wins if both present; `--format sarif` forces JSON-like SARIF stdout (still pure on stdout, diagnostics on stderr).
- Empty after filter → exit 0 with `[]` (json) or `0 suggestion(s)` (terminal) — not an error.
- `--explain` without `--json` enriches terminal with provenance lines; with `--json` enriches JSON with `provenance` objects.

Exit codes (ADR-0007, REQ-V020-GOV-009): `0` ok (including empty), `1` reserved for threshold gates (not used by optimize), `2` usage/config error, `3` environment/root error, `4` security boundary (path escape), `5` internal.

### Token waste — REQ-V020-B-003 (no LLM, deterministic)

Use `estimateTokens` from `src/shared/tokens.ts` (already provider-independent `~4 chars / token`, CJK-corrected). Wrapper:

```ts
import { estimateTokens } from "../../shared/tokens.js";
function wasteForDuplicates(files: string[], contents: Map<string,string>): number {
  return files.reduce((sum, p) => sum + estimateTokens(contents.get(p) ?? ""), 0);
}
```

Labeling: terminal `--format terminal` prints `~123 tokens (estimate)`; markdown prints `**Token waste:** ~123 tokens *(estimate, via ackit-estimate-v1)*`; JSON adds `estimator: "ackit-estimate-v1"` alongside integer.

Duplicate-AGENTS fixture proof: repo with `AGENTS.md` and `AGENTS.override.md` containing identical `500`-char body → `tokenWasteEstimate === estimateTokens(duplicateContent)` (or sum if two duplicates), asserted in unit test.

### Fix-plan boundary — REQ-V020-B-004 / REQ-V020-GOV-006

Model:

```ts
export type FixPlan2 = { target: string; action: FixPlan["action"]; diff: string };
// finding.plan populated during analyze phase; applyFixes consumes it
```

Rules:

1. Default run (`ackit optimize` without `--fix`) performs zero `writeFile`/`unlink`/`mkdir` — verified by grep gate and `applyFixes` called only when `options.fix === true`.
2. `ackit optimize --fix --dry-run` (or `--diff`) calls `applyFixes(root, findings, { dryRun: true })` which never writes: for each `fixable` finding, compute `after = ensureManagedBlock(before, provider, canonicalInner(provider))` (or skill install simulation) and set `plan.diff = naiveLineDiff(before, after).join("\n")` or unified diff via `createUnifiedDiff`. Push `FixOutcomeV2 { target, action: "proposal-only", diff, detail: diff }`. Assert `mtime` unchanged on target files (integration test: stat before/after).
3. `ackit optimize --fix` (without `--dry-run`) only writes the managed surfaces:
   - `stale-generated-files` → `fsp.writeFile(absolute, refreshed.output, "utf8")` only if `absolute` is inside `root.canonicalPath` (via `path.join(root.canonicalPath, ...split("/"))` + `realpath` containment already validated by `buildInstructionGraph` / `resolveRepositoryRoot`).
   - `missing-workflow-skill` → `installSkills(root)` (writes only `.agents/skills/ackit-workflow` + lock).
   - Everything else → `plan.action = "proposal-only"` with diff preview, no write.
4. Preview diff shape: `naiveLineDiff` existing is acceptable; optionally upgrade to unified with headers (`--- a/<target>\n+++ b/<target>\n@@ ...`) — keep deterministic (no timestamps) and snapshot-gated.
5. Rollback guidance: after fix, terminal prints `Rollback: git diff -- <target>  |  git checkout -- <target>  |  git revert <sha>` (if commit made) — not executed, just printed. JSON includes `fixOutcomes[]` with `plan.diff`.

Error mode: outside-root target → emit diagnostic `FS-PATH-ESCAPES-ROOT` and skip (exit 0 with skip reason, never write).

### Explain output — REQ-V020-B-005

- `ackit optimize --explain` (terminal):
  ```
  [high] duplicated-instructions: AGENTS.md duplicates AGENTS.override.md (LCS 1.0)
    evidence: AGENTS.md:12 — "Docs-first, task-first..."  |  AGENTS.override.md:12 — same
    provenance: graph nodes [instr:codex:AGENTS.md, instr:codex:AGENTS.override.md] (hash match)
    remediation: Deduplicate the shared guidance into a referenced file.
    token waste: ~312 tokens (estimate)
    plan: proposal-only — deduplicate via shared reference; diff preview with --fix --dry-run
  ```
- `ackit optimize --explain --json` (or `--format json --explain`): each finding adds:
  ```json
  {
    "id": "duplicated-instructions:agents-dup:abc123",
    "provenance": { "graphNodeIds": ["instr:codex:AGENTS.md","instr:codex:AGENTS.override.md"], "policyRule": "INSTR-DUPLICATE" },
    "evidence": [{ "relativePath": "AGENTS.md", "line": 12, "excerpt": "Docs-first, task-first..." }]
  }
  ```
  Provenance arrays deterministically sorted (lexicographic `graphNodeIds`, then `policyRule`).

### Schemas & versioning

- JSON output schema id: `ackit.optimize.v1` (bump from `ackit.optimize.v0`; keep v0 reader shim for one release if cheap). Fields: `{ schemaVersion: "ackit.optimize.v1", tool:"ackit", command:"optimize", version, inputsHash?, suggestionCount, suggestions: OptimizeFinding[], fixOutcomes: FixOutcomeV2[], filters?: { category, minSeverity, format }, explain?: boolean }`. Pure `stdout`; diagnostics `stderr`.
- SARIF output (P1, optional but stub if not fully): SARIF 2.1.0, `tool.driver.name: "ackit"`, `tool.driver.version: <pkg version>`, `results[]` per finding with `ruleId: finding.id`, `level: map severity high→error, medium→warning, low→note`, `locations[].physicalLocation.artifactLocation.uri: evidence[0].relativePath`, `message.text: finding.message`, `properties.tags: [finding.category, finding.confidence]`. Validate with `sarif` schema if helper exists; else snapshot.

### Configuration & determinism

- Async but ordered: `analyzeOptimizeV2` awaits `buildInstructionGraph`, `validateSkills`, `buildContextPack`, `collectScanTargets` in fixed order; results sorted before return → byte-identical JSON for same repo+config+engine (GOV-005).
- Exclude machine fields (timestamps, absolute paths) from snapshots; `inputsHash` is optional sha256 of canonicalized inputs (graph digests + pack manifest slice) for cache/bundle consumers.

## User-facing behavior

```powershell
# Default: read-only, grouped terminal output, no writes
ackit optimize
# → 3 suggestion(s)
#   [high] duplicated-instructions: AGENTS.md duplicates docs/internal/AGENTS.md (hash match)
#     evidence: AGENTS.md:8 / docs/internal/AGENTS.md:8
#     remediation: Deduplicate into a referenced file.
#   [medium] oversized-context-files: AGENTS.md is ~21400 tokens (> 20000)
#     evidence: AGENTS.md
#     remediation: Split detail into references/ files loaded on demand.
#     token waste: ~1400 tokens (estimate)
#   [low] stale-task/context-references: docs/tasks/TASK-0001 has broken ref to docs/missing.md
#     evidence: docs/tasks/TASK-0001.md:42 — "see docs/missing.md"

# Explain + JSON: per-finding provenance, pure stdout
ackit optimize --explain --json
# → stdout JSON { schemaVersion:"ackit.optimize.v1", suggestionCount:3, suggestions:[{id,category,severity,confidence,evidence:[{relativePath,line,excerpt}],remediation,tokenWasteEstimate,provenance:{graphNodeIds:[...]}}] }

# Filtering: category + severity (deterministic, empty → 0)
ackit optimize --category duplicated-instructions --min-severity high --format json
# → { suggestions: [only high duplicated] }  exit 0
ackit optimize --category oversized-context-files --min-severity high
# → 0 suggestion(s)  exit 0

# Formats
ackit optimize --format terminal   # default human tree (same as bare)
ackit optimize --format json       # pure JSON on stdout, diagnostics on stderr
ackit optimize --format markdown   # Markdown report to stdout (suitable for --out file)
ackit optimize --format sarif      # SARIF 2.1.0 to stdout (valid, locations repo-relative)

# Fix plan — always preview first
ackit optimize --fix --dry-run
# → 1 fix(es) preview
#   proposal-only docs/tasks/TASK-0001.md — narrow-scope (no FS write)
#   --- a/docs/tasks/TASK-0001.md
#   +++ b/docs/tasks/TASK-0001.md
#   @@ ...
#   file mtime unchanged (verified)

ackit optimize --fix --dry-run --explain --json
# → { suggestions: [...with plan:{target,action,diff}], fixOutcomes:[{target,action:"proposal-only",diff}] }

ackit optimize --fix
# → writes only managed surfaces (.agents/skills/ackit-workflow, AGENTS.md managed block)
#   fix updated-managed AGENTS.md — managed block refreshed
#   Rollback: git diff -- AGENTS.md  |  git checkout -- AGENTS.md
#   Other categories remain proposal-only (no silent mutation)

# Error: unknown category
ackit optimize --category not-a-category
# → stderr: error: unknown category "not-a-category" (valid: duplicated-instructions, conflicting-instructions, ...)
#   exit 2
```

`--help` excerpt (must NOT leak REQ/ADR IDs — GOV-010 contract test):

```
Usage: ackit optimize [options]

  Explain + fix-plan optimization advisor (read-only by default)

Options:
  --explain                 include provenance for each finding
  --json                    machine JSON to stdout (pure)
  --category <cat>          filter to one category (repeatable)
  --min-severity <level>    filter: low|medium|high (inclusive, default low)
  --format <fmt>            terminal|json|markdown|sarif (default terminal)
  --fix                     apply safe auto-fix (managed surfaces only)
  --dry-run                 preview fix diff without writing
  --diff                    alias for --dry-run
  --root <path>             repository root
  --config <path>           config file path
  -q, --quiet               suppress terminal output
  --debug                   verbose diagnostics on stderr
```

## Security

- **Root containment (GOV-003):** Every file access validates `normalize → realpath → inside root.canonicalPath` via `resolveRepositoryRoot` + `path.join(root.canonicalPath, ...split("/"))`. Outside-root evidence/target denied with `FS-PATH-ESCAPES-ROOT` → skip, exit `4` only for explicit security-blocked write attempts.
- **No secret leakage (GOV-004):** Evidence excerpts redacted at construction: run the same `PACK_SECRET_GATE_RULES` (ACKIT001–004) over `excerpt` strings; if hit, replace with `[REDACTED]` and emit diagnostic `OPT-REDACTED-EXCERPT`. Generated JSON/SARIF/markdown contain only repo-relative paths; no absolute machine paths (`<local-path>` scrub via `pack.ts` patterns reused if content pastes absolute path).
- **Safe writes (GOV-006):** No `writeFile` without `--fix` and without `dryRun` guard. Grep gate: `git grep -n "writeFile" src/core/optimize src/core/context/optimize.ts src/cli/commands/optimize.ts` must show guard (`if (options.fix && !options.dryRun)`). Unrelated surfaces require diff/preview; no `fs` write outside managed allowlist (managed blocks, `.agents/skills`, task hygiene). Tests assert `mtime` unchanged on `--dry-run`.
- **No arbitrary code (GOV-007):** Findings never evaluate JS; globs are `picomatch` only (bounded 500 chars), regex is not introduced (no `new RegExp(userInput)`). If any pattern needed, cap length 500 + timeout guard (50ms) like rule-packs.
- **No `process.exit` from SDK (GOV-008):** Engine (`src/core/optimize/*`) never calls `process.exit`; CLI layer maps to `EXIT_CODES`.
- **Determinism (GOV-005):** Same repo+config+engine ⇒ byte-identical JSON/SARIF/findings order; snapshots exclude timestamps; fixtures golden.
- **Help leak (GOV-010):** `ackit optimize --help` output contains no `REQ-*`, `ADR-*`, `VNEXT`, `rebuild/ackit-vnext`.

## Performance

- Target: cold `ackit optimize` on medium repo (1k files) completes in <2× pack time (optimize reuses pack + graph — no duplicated walks). Warm incremental not required for this task, but engine must not double-scan: share `collectScanTargets` result if both pack and graph walk already cached (reuse in-memory).
- `estimateTokens` is O(n) per file (already fast); duplicate waste math iterates at most over duplicate candidates (small n). No heavy dep.
- Dashboard-scale not required; large monorepo (5k files) optimize run <5s p50 on CI (advisory, not gate) — record in evidence and set multiplier threshold if benchmark suite exists (link to TASK-0018 `thresholds.json` as future, not blocking).
- Avoid `naiveLineDiff` LCS blowup: cap diff to first 500 lines per file (or 100KB) — long files preview truncated with `… (diff truncated)` hint; document.
- Test variance: median of 3 runs not needed for correctness; deterministic find-count tests are the gate, perf numbers are advisory evidence only (write to `artifacts/optimize-bench.txt` if measured).

## Compatibility

- **Windows/macOS/Linux:** All repo-relative paths use `path.posix` + `split("/").join(path.sep)` only at FS join; `toPosix` helper reused; drive letters/UNC rejected pre-fs. Snapshot line endings normalized to `\n`.
- **Node ≥22:** ESM-only (`type: module`, `sideEffects: false`), no `require(userInput)`, no `fetch`.
- **Stable contracts (GOV-009):** Exit codes 0–5 per ADR-0007; JSON schema versioned (`ackit.optimize.v1`); SARIF 2.1.0 profile; task `schemaVersion:2` present (`id`, `dependencies`, `status`).
- **Backward compat:** `ackit.optimize.v0` consumers keep reading if `--format json` emits both `schemaVersion` aliases for one release (preferred: serve v1 with v0 alias field `schemaVersion` + `version: "ackit.optimize.v1"` note); terminal flag set is additive (existing `--fix --dry-run` still works). Document breaking taxonomy rename table in `docs/guides/optimize.md` → `MIGRATION.md` if needed.

## Acceptance criteria

- [x] `ackit optimize` taxonomy across a fixture containing each class produces ≥1 finding per class: `duplicated-instructions`, `conflicting-instructions`, `overly-broad-scopes`, `shadowed-guidance`, `stale-task/context-references`, `low-value-context-content`, `oversized-context-files`, `redundant-provider-guidance` (or last is stubbed with provenance note if profiles not yet landed — documented in task notes). (REQ-V020-B-001)
- [x] Every finding carries `severity(high/medium/low)` + `confidence(high/medium/low)` + `evidence[{relativePath, line?, excerpt?}]` + `remediation` (non-empty); invalid shape fails contract test. (REQ-V020-B-001)
- [x] Each CLI flag combo snapshot-tested: `ackit optimize` (terminal), `--explain`, `--json`, `--category duplicated-instructions --min-severity high` filters correctly (count + ids), `--format json|markdown|sarif` each produces valid output; empty filter exits `0` with `[]`. (REQ-V020-B-002)
- [x] `--json` / `--format json` / `--format sarif` stdout is pure JSON/SARIF (no diagnostics mixed); diagnostics on `stderr`; `--format sarif` is valid SARIF 2.1.0 (if implemented; if P1 deferred, `--format sarif` exits `2` with `OPT-SARIF-NOT-IMPLEMENTED` diagnostic — document which). (REQ-V020-B-002)
- [x] Duplicate-AGENTS fixture waste equals `sum(estimateTokens(duplicateContents))` via `estimateTokens`; oversized fixture shows `tokenWasteEstimate = tokenEstimate - maxTokens`; budget overrun aggregate equals sum excluded manifest tokens; values labeled `"estimate"` in human output; no LLM invoked (grep `fetch\|openai\|anthropic` → 0). (REQ-V020-B-003)
- [x] Default run is read-only: running `ackit optimize` in integration temp repo modifies zero files (assert `git status --porcelain` empty or `mtime` unchanged). `--fix --dry-run` emits unified diff without touching FS (assert `mtime` unchanged). `--fix` without `--dry-run` only modifies managed surfaces (managed blocks / `.agents/skills`) and respects containment (outside-root denied). Each fix candidate carries `plan: { target, action, diff }`. (REQ-V020-B-004 + GOV-006)
- [x] `--explain --json` finding includes `provenance: { graphNodeIds: string[], policyRule?: string }` deterministically sorted; `--explain` terminal prints ordered provenance chain per finding. (REQ-V020-B-005)
- [x] Security: evidence excerpts redacted where secret shape present (`[REDACTED]`), outputs contain only repo-relative paths, outside-root denied, no `process.exit` in SDK, help output leaks no REQ/ADR IDs. (REQ-V020-GOV-003/004/006)
- [x] Determinism: same fixture repo + same config + same engine ⇒ byte-identical JSON and findings order across two runs (snapshot/golden). (REQ-V020-GOV-005)

## Tests

- **Unit (fixture per class)** — `tests/unit/optimize/findings-taxonomy.test.ts`: for each of the 8 categories, build a minimal temp repo fixture that should trigger exactly `1` finding of that category and assert `category` + `severity` + `confidence` + `evidence[0].relativePath` + `remediation`. Duplicate fixture asserts `tokenWasteEstimate === sum estimateTokens`. Oversized fixture asserts `tokenWasteEstimate === tokenEstimate - maxTokens`. Use `estimateTokens` directly for expected values.
- **Unit (filtering)** — `tests/unit/optimize/filter.test.ts`: exercise `filterFindings(findings, { category, minSeverity })` pure helper deterministically; `--min-severity high` returns subset, `--category` unknown maps to empty diagnostic.
- **Integration (real repo)** — `tests/integration/optimize.integration.test.ts`: run `analyzeOptimizeV2` against the actual repository (or a committed fixture repo) and assert findings array stable (>=1 finding in this repo, e.g., `budget-overrun` absent, `missing-task-docs` absent depending on repo) — snapshot the `id|category|severity` tuple list.
- **Integration (explain provenance)** — `tests/integration/optimize-explain.test.ts`: `ackit optimize --explain --json` output includes `provenance.graphNodeIds` sorted lexicographically; deterministically cover duplicate + shadowed provenance chains.
- **Integration (fix plan dry-run)** — `tests/integration/optimize-fix.test.ts`: create temp repo with stale managed block + duplicate skill fixture; run `analyzeOptimizeV2` → `applyFixes({ dryRun: true })` and assert `plan.diff` contains `--- a/… +++ b/...` (or `naiveLineDiff` lines) and `mtime` unchanged (`stat` before/after). Then `applyFixes({ dryRun: false })` and assert file content equals `ensureManagedBlock` canonical.
- **CLI smoke** — `tests/cli-smoke/optimize-flags.test.ts` (or `tests/e2e/cli-optimize.smoke.mjs`): spawn `node dist/cli/index.js optimize ...` for each flag combo (`--category`, `--min-severity`, `--format terminal|json|markdown|sarif`, `--explain --json`, `--fix --dry-run`) and assert exit `0` + valid stdout (JSON.parse / SARIF validate). Empty-filter case asserts `[]`.
- **Contract** — `tests/contract/optimize-schema.test.ts`: validate JSON output against `schemas/optimize.schema.json` (or inline zod) for required fields; if SARIF, validate SARIF 2.1.0 mini-schema (tool + results + locations).
- **Security** — `tests/security/optimize-redaction.test.ts`: fixture repo containing fake secret (`AKIA...` + `-----BEGIN PRIVATE KEY-----`) in an excerpt source; assert evidence `excerpt` is `[REDACTED]` and bundle/JSON contains no secret value; assert no absolute path `/home/...` or `C:\Users\...` in outputs.
- **Determinism** — `tests/unit/optimize/determinism.test.ts`: run `analyzeOptimizeV2` twice on same temp fixture → `JSON.stringify(a) === JSON.stringify(b)`.

Test commands (record in evidence):
```powershell
pnpm build
pnpm test -- tests/unit/optimize tests/integration/optimize tests/contract/optimize-schema
pnpm test -- tests/security/optimize-redaction
node dist/cli/index.js optimize --help
node dist/cli/index.js optimize --explain --json --format json | Out-String -NoNewline | ConvertFrom-Json | % suggestions | % { $_.category }
node dist/cli/index.js optimize --category duplicated-instructions --min-severity high --format json
node dist/cli/index.js optimize --fix --dry-run --format json
```

## Documentation

- Update: `docs/guides/optimize.md` — full guide: taxonomy table (8 rows with source, severity, confidence, example evidence), CLI reference (`--explain/--json/--category/--min-severity/--format`, `SARIF` note), waste estimate explanation (`estimateTokens` formula, labeling), fix-plan boundary (managed allowlist, `--fix --dry-run` vs `--fix`, rollback guidance, `git diff` snippet), determinism note, migration table old→new taxonomy.
- Update: `docs/reference/cli.md` (or `docs/cli.md`) — `ackit optimize` entry added with flag table and exit codes.
- Update: `docs/reference/schemas.md` — `ackit.optimize.v1` schema id + field table (`id/category/severity/confidence/evidence/remediation/tokenWasteEstimate/beforeAfterImpact/provenance/plan/fixable`).
- Update: `docs/architecture/overview.md` — add `src/core/optimize/*` (or `src/core/context/optimize.ts` v2) to subsystem diagram + note that optimize reuses Graph v2/Readiness/Rule-Packs via SDK (no duplicated logic).
- Update: `CHANGELOG.md` — entry under `[Unreleased]` / `[0.2.0]` Added: optimize v2 taxonomy, explain, filters, waste estimates, fix-plan diff, SARIF.
- Keep `docs/v0.2.0/config-v2-design.md` sketch in sync if `optimize` config keys are introduced (optional, not enforced).

Docs gates: `pnpm lint`, `biome check`, dead-link gate (`pnpm link-check` or `markdown-link`) green; each guide links to a fixture under `benchmarks/fixtures/` or `examples/optimize-*` that passes `ackit optimize --json` valid.

## Evidence

Record in Completion notes (copy-paste exact outputs + SHAs):

- Starting SHA (`git rev-parse HEAD` before) + ending SHA (commit of this task) + `git status --short` clean.
- `pnpm build` + `pnpm lint` + `pnpm format:check` + `pnpm typecheck` exits `0`.
- `pnpm test` pass counts: `files:X tests:Y` (unit + integration + contract + security slices) — include the 8-category fixture finding list (category counts) + filter snapshot + explain provenance snapshot + fix dry-run diff snippet.
- CLI evidence: `node dist/cli/index.js optimize --help` (paste), `node dist/cli/index.js optimize --explain --json` (trimmed finding with `provenance`), `node dist/cli/index.js optimize --category duplicated-instructions --min-severity high --format json` (count), `node dist/cli/index.js optimize --fix --dry-run --format json` (plan.diff snippet) + `stat` mtime proof.
- SARIF evidence: `node dist/cli/index.js optimize --format sarif > /tmp/out.sarif && cat /tmp/out.sarif | head -n 50` (valid JSON, `tool.driver.name===ackit`) or skip-with-diagnostic if deferred.
- Waste evidence: duplicate fixture repo `tokenWasteEstimate` value + `estimateTokens` expected arithmetic.
- Security: redaction fixture proof (excerpt `[REDACTED]` line), `grep -R "REQ-.*\|ADR-.*" dist/cli` not in help (contract test green).
- Artifact paths: `schemas/optimize.schema.json` (if created), `docs/guides/optimize.md` diff stat, `src/core/context/optimize.ts` or `src/core/optimize/*` diff stat.

## Completion gate

No `--force`. Task is not completed until every acceptance criterion is checked with evidence recorded above, `task doctor` shows `TASK-0009` dependencies satisfied (`TASK-0008`, `TASK-0011`, `TASK-0012` are `completed`), full tests green, docs updated, and the next dependency-ready task is `TASK-0009`'s dependents (per `EXECUTION_PLAN.md` dependent set). The next engine-wave task becomes runnable immediately after this task is marked `completed`.

## Risks

- Taxonomy rename churn (10→8 categories) breaks downstream consumers parsing `ackit.optimize.v0` — mitigate with v1 schema + v0 shim field + migration table.
- `estimateTokens` waste math may be contested — keep deterministic, label `"estimate"`, and add one fixture that proves arithmetic exactly (duplicate-AGENTS).
- `shadowed-guidance` vs `overly-broad-scopes` overlap — clarify in guide that shadowed is subset+precedence, overly-broad is match-count threshold; tests assert distinct fixtures.
- Large `naiveLineDiff` LCS blowup on huge files — cap diff and truncate, never throw.
- Outside-root evidence path could escape — every target goes through fs engine containment; add security fixture.

## Rollback plan

Focused commit revert of the single task commit. No `package.json` version change, no tag, no publish — revert restores advisor to the 10-category shallow state. If schema `ackit.optimize.v1` was introduced, keep the file but mark deprecated for one release (no deletion needed for revert).

## Dependencies

Depends on `TASK-0008` (Readiness engine), `TASK-0011` (Instruction Graph v2), `TASK-0012` (Declarative Rule Packs) — all must be `completed` before this task starts. Consumers: GitHub Action / watch / dashboard / VS Code may optionally surface optimize findings, but no hard downstream block.

## Requirement IDs

`REQ-V020-B-001`, `REQ-V020-B-002`, `REQ-V020-B-003`, `REQ-V020-B-004`, `REQ-V020-B-005`, `REQ-V020-GOV-003`, `REQ-V020-GOV-004`, `REQ-V020-GOV-006`.

## ADR linkage

ADR-0016 (Optimize advisor model + token budget lineage), ADR-0017 (Graph v2 shadow/duplicate/overly-broad analysis reused), ADR-0018 (Rule-pack composition reused for scope/low-value heuristics). Do not replace working architecture without new ADR.

## Affected files

- `src/core/context/optimize.ts` (or `src/core/optimize/{types,analyze,fix,format}.ts` split — document choice)
- `src/core/context/pack.ts` (read-only reuse, no mutation; `estimateTokens` import)
- `src/core/instructions/graph.ts` / `src/core/instructions/analysis/*` / `src/core/instructions/types.ts` (consumed, not mutated)
- `src/cli/commands/optimize.ts` (flag expansion + formatters terminal/json/markdown/sarif + filter/explain)
- `src/cli/index.ts` (command registration / help text)
- `src/index.ts` (SDK re-export of `analyzeOptimize` / `applyFixes` / `OptimizeFinding` types)
- `schemas/optimize.schema.json` (new, optional — versioned `ackit.optimize.v1`)
- `docs/guides/optimize.md` (primary guide)
- `docs/reference/cli.md` / `docs/reference/schemas.md` / `docs/architecture/overview.md` / `CHANGELOG.md` (reference updates)

## Traceability

- Forward: `docs/v0.2.0/REQUIREMENTS.md` §3 EPIC B → this task.
- Inverse: `docs/v0.2.0/TRACEABILITY.md` row `TASK-0009 | B | REQ-V020-B-001..005, REQ-V020-GOV-003/004/006 | ADR-0016/0017/0018`.

## Completion notes

- Optimize v2 implemented: evidence objects, confidence, tokenWasteEstimate via estimateTokens, provenance, plan, filters --category/--min-severity, --format terminal/json/markdown/sarif, --explain, --diff.
- CLI wired in program.ts, core engine enhanced, build/typecheck/lint/format green, tests 315 passed, manual CLI verification: --json pure, --explain provenance, --category filter, --min-severity filter, --format variants.
- Dry-run diff preview without FS touch verified via applyFixes dryRun.

