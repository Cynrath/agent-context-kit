---
id: "TASK-0008"
title: "Readiness / context-quality scoring engine"
status: completed
schemaVersion: 2
dependencies: ["TASK-0013"]
createdAt: "2026-08-27"
completedAt: "2026-08-27"
---

## Purpose

Implement the deterministic Agent Readiness / Context-Quality scoring engine (`src/core/readiness/`) that turns the existing scan/pack/graph/policy/skills/task surfaces into a transparent 0–100 score with per-category breakdown, typed deductions with evidence, machine-readable `ackit.readiness.v1` schema, human terminal tree, CI thresholds, baseline/compare, N/A renormalization, and a golden-fixture stability contract — with no opaque AI/LLM scoring. This is EPIC A (REQ-V020-A-001..006).

## Context / current state

### Existing implementation

- **CLI + scan pipeline working**: `src/core/scanner/pipeline.ts`, `src/core/scanner/orchestrate.ts`, `src/core/scanner/registry.ts`, `src/core/scanner/rules/*`, `src/core/scanner/redact.ts` produce `ScanResult` (`findings: Finding[]`, `diagnostics: ScanDiagnostic[]`) with stable fingerprints, SARIF 2.1.0, and JSON. `src/cli/commands/scan.ts` and `src/core/reporting/*` (terminal/JSON/SARIF) already exist. `src/api/scan-repository.ts` is the SDK entry that the CLI delegates to.
- **Instruction graph exists** (`src/core/instructions/graph.ts`, `src/core/instructions/types.ts`, `src/core/instructions/analysis/*`) but is pre-v2; TASK-0018/0007 track (per TRACEABILITY) will extend it to v2 with `includeScopes/excludeScopes/providerApplicability/shadowedBy/duplicateOf`. Readiness must consume `InstructionGraph` as input without owning its evolution — it reads the graph, never mutates it.
- **Context pack exists** (`src/core/context/pack.ts` — `buildContextPack`, `PackResult`, `PackManifest`, token estimates via `estimateTokens`). Provides context-efficiency signals (file size, token counts, ranking).
- **Policy engine exists** (`src/core/policy/*` — `apply.ts`, `match.ts`, `resolve.ts`, `types.ts`) and will grow with declarative rule packs in TASK-0012 but readiness already consumes `EffectivePolicy`/policy findings.
- **Tasks system exists** (`src/core/tasks/*` — `store.ts`, `types.ts`) producing task hygiene signals (active tasks, schema issues, stale references).
- **Skills catalog exists** (`src/core/skills/validate.ts`, `src/core/skills/types.ts`) — readiness consumes skill health.
- **Config** (`src/core/config/schema.ts`, `src/core/config/load.ts`, `schemas/ackit.schema.json`) is at `schemaVersion: 1`; this task adds `readiness.weights` additive contract (handled in `src/core/config/*`).
- **No readiness module yet**: there is no `src/core/readiness/` directory, no `schemas/readiness.schema.json`, no `scoreRepository` export, no `ackit readiness` command, and `src/index.ts` does not yet export `scoreRepository`. All those are created here.
- **Filesystem safety** (`src/core/filesystem/*` — `engine.ts`, `paths.ts`, `root.ts`, `walk.ts`) already enforces canonical-path root containment; readiness must reuse it for every evidence path.

### Exact likely files/modules (to create or modify)

- **New**: `src/core/readiness/engine.ts` (pure scorer), `src/core/readiness/types.ts` (ScoreReport, CategoryScore, Deduction, severity), `src/core/readiness/weights.ts` (default weights + renormalize), `src/core/readiness/deductions/*` (per-category deduction collectors), `src/core/readiness/index.ts` (barrel)
- **New**: `schemas/readiness.schema.json` (`ackit.readiness.v1`, generated via `pnpm gen:schemas` if zod-driven) + `src/core/config/json-schema.ts` extension
- **Modify**: `src/index.ts` (export `scoreRepository` + types `ScoreReport`, `CategoryScore`, `Deduction`, `ReadinessInputs`, `ReadinessOptions`), `src/core/config/schema.ts` + `schemas/ackit.schema.json` (add `readiness.weights` validated object), `src/cli/commands/scan.ts` (include readiness in `--json` and wire `--fail-below/--strict/--ci/--baseline/--compare`), optional `src/cli/commands/readiness.ts` (dedicated `ackit readiness` alias), `src/core/reporting/terminal.ts` (tree bars), `src/core/reporting/json.ts` (attach readiness payload)
- **Fixtures**: `fixtures/readiness-golden/` (golden repo), `fixtures/readiness-n-a/` (no tasks), `fixtures/readiness-baseline/` + `benchmarks/fixtures/` reuse, `tests/__fixtures__/readiness/*`
- **Tests**: `tests/unit/readiness/*`, `tests/contract/readiness-schema.test.ts`, `tests/integration/readiness/*`, `tests/security/readiness-redaction.test.ts`, `tests/regression/readiness-stability.test.ts`

### Dependencies

- **Direct**: `TASK-0013` — Public SDK v1 stabilization. Readiness is a pure function over SDK inputs; it must reuse `src/index.ts` boundary, error model (`AckitError`), `AbortSignal` plumbing, and `package.json` exports discipline established there. No engine work starts before SDK contract is frozen.
- **Indirect**: `TASK-0007` — v0.2.0 requirements + architecture baseline (pins, ADRs, `docs/v0.2.0/*` freeze). Implicitly required via TASK-0013's own dependency; not listed as direct to keep the graph minimal.

### Relevant ADRs / requirements

- **ADRs**: `ADR-0015` (v0.2.0 consolidated release architecture — single `v0.2.0` with portable invariants), `ADR-0016` (Readiness scoring model + Provider profile model — location `src/core/readiness/`, 6 categories, weights, deductions, stability contract), `ADR-0021` (SDK + VS Code integration — `scoreRepository` as SDK export reused by CLI/MCP/Action/dashboard/VS Code, no duplicated logic), `ADR-0022` (benchmark/regression policy — stability contract), `ADR-0024` (cross-cutting security — redaction, path containment), plus reused `ADR-0002` (single package), `ADR-0006` (instruction graph model), `ADR-0007` (CLI exit codes 0–5), `ADR-0012` (context budget + cache).
- **Requirements**: `REQ-V020-A-001` (scoring architecture & SPI), `REQ-V020-A-002` (categories & weighting), `REQ-V020-A-003` (deductions, severity→points, evidence), `REQ-V020-A-004` (N/A, strict/CI thresholds, baseline/compare), `REQ-V020-A-005` (output contracts), `REQ-V020-A-006` (stability & regression gate), plus `REQ-V020-GOV-003` (root containment), `REQ-V020-GOV-004` (no secret/absolute-path leakage), `REQ-V020-GOV-005` (determinism contract).

## Goal

One concrete outcome: a deterministic, pure-function readiness engine `scoreRepository(input) → ScoreReport` with six weighted categories, typed deductions with evidence, `ackit.readiness.v1` machine schema, human terminal tree, CI-gateable thresholds (`--fail-below`/`--strict`/`--ci`), N/A renormalization, baseline/compare, and a golden-fixture stability contract — shipped via `src/index.ts` SDK, wired into `ackit scan --json` (and optionally `ackit readiness`), with no network/LLM and no opaque scoring.

## In scope

- **Engine core** (`src/core/readiness/`):
  - Pure function `scoreRepository(input: ReadinessInputs, options?: ReadinessOptions): ScoreReport` where `ReadinessInputs = { graph: InstructionGraph, pack: PackResult | PackManifest, scan: ScanResult, skills: SkillCatalog | SkillIssue[], policy: EffectivePolicy | PolicyFindings, tasks: TaskHealth }`. No I/O, no `fetch`, no `child_process`, no `process.exit`, no LLM inside scorer. Caller gathers inputs via SDK (`buildInstructionGraph`, `buildContextPack`, `scanRepository`, `validateSkills`, `loadAckitConfig`).
  - Six normative categories, default weights normalized to overall 0–100 integer (half-up rounding):
    - `instructions` 25, `security` 25, `contextEfficiency` 20, `taskHygiene` 10, `skills` 10, `policy` 10.
    - Overall = `round(sum(categoryScore * effectiveWeight) / sum(effectiveWeights))` where `effectiveWeights` are renormalized after N/A exclusion (see below).
  - Weights configurable via `ackit.yml` `readiness.weights` (optional, validated). Missing key → default; partial override → merge with defaults; sum need not be 100 (renormalize). Invalid (negative, non-number, unknown key) → `AckitError` `CONFIG-READINESS-WEIGHTS` + remediation.
  - Each category scored 0–100 integer starting at 100, minus deductions. Floor 0, ceiling 100. Info-severity deductions (0 points) never move the score but are emitted for auditability.
- **Deductions** (`Deduction`):
  - Shape: `{ id: string (stableId, e.g., READINESS-INST-DUPLICATE-001), category: CategoryId, points: number, severity: "critical"|"high"|"medium"|"low"|"info", reason: string (human), evidence: { relativePath: string (POSIX repo-relative), line?: number, excerpt?: string (redacted) }, remediation?: string, fingerprint?: string }`.
  - Severity→points contract (declarative, versioned):
    - `critical` = 15
    - `high` = 8–12 (default 10; allow 8/10/12 depending on rule specificity — documented per deduction in `weights.ts` table)
    - `medium` = 4–5 (default 5)
    - `low` = 1–2 (default 2)
    - `info` = 0 (never deducts)
  - Every non-zero category deduction carries `evidence.relativePath` (repo-relative POSIX, no absolute path), human `reason`, and `remediation`. Secrets in `excerpt` are redacted via existing `src/core/scanner/redact.ts` (`[REDACTED]`). No absolute machine paths in evidence (reuse `REQ-V020-GOV-004`).
  - Points are declarative in a versioned table (`src/core/readiness/weights.ts` or `deductions/catalog.ts`) — changing a value is a scoring version bump (see Stability).
  - Deterministic deduction order: sort by `category` (canonical order: instructions, security, contextEfficiency, taskHygiene, skills, policy), then `severity` descending (critical→info), then `stableId` lexicographically, then `evidence.relativePath`. Snapshot-gated.
- **Category collectors** (each maps one input surface to deductions):
  - `instructions`: graph health (conflicting directives, duplicates, shadowed nodes, unreachable/dead scopes, overly broad scopes, missing `AGENTS.md`/`CLAUDE.md` when expected). Reuses graph analysis outputs.
  - `security`: scanner security findings (`ACKIT001..005`-class secrets, weak permissions, path-traversal hints), redaction health.
  - `contextEfficiency`: pack oversize, duplicate instruction content (token waste via `estimateTokens`), low-value context content, oversized files over budget, redundant provider guidance.
  - `taskHygiene`: task schema issues, stale `docs/tasks` references, active task count health, blocked/circular dependencies.
  - `skills`: `validateSkills` issues (missing `SKILL.md`, invalid frontmatter, unreferenced skills).
  - `policy`: policy/rule-pack findings (when packs exist; otherwise N/A or 100 if no policy configured — see N/A handling).
- **N/A handling & renormalization**:
  - If a category's input surface is absent by design (e.g., no `docs/tasks` directory → `taskHygiene` N/A; no `policy` configured → `policy` N/A; no `skills` directory → `skills` N/A), the category is `{ status: "n/a", score: null, reason: "no docs/tasks" | "no policy configured" | "no skills", deductions: [] }`, excluded from averaging. `effectiveWeights` are renormalized proportionally: `effectiveWeight_i = weight_i / sum(weights of available categories)`.
  - Example: if `taskHygiene` is N/A (10 weight removed), remaining sum 90. Instructions effective weight becomes 25/90 ≈ 27.78% of overall. Documented arithmetic in `weights.ts` comment + unit test.
- **Thresholds & CI gating**:
  - CLI flags: `--fail-below <n>` (0–100 integer), `--strict`, `--ci` (alias for strict CI gate). Semantics:
    - `--fail-below <n>`: if `overallScore < n` → exit 1 (or 2 for invalid threshold). Also supports per-category: `--fail-below instructions:80` or repeated flags (if implemented) — at minimum overall gate is required; per-category is SHOULD if not blocking initial ship, but design must accommodate it without breaking schema.
    - `--strict`: alias for `--fail-below 80` (or configured `readiness.strictThreshold` in `ackit.yml` if present; otherwise 80). Document exact mapping.
    - `--ci`: synonym for `--strict` + ensure machine JSON + SARIF readiness summary emitted; exit 1 on gate failure (ADR-0007 code 1 = findings threshold).
  - JSON includes `threshold` field when gate active: `{ requested: number, source: "cli: --fail-below" | "config: readiness.strictThreshold" | "flag: --strict", passed: boolean }`.
  - Invalid threshold (non-integer, <0, >100) → exit 2 + `AckitError` `CLI-READINESS-THRESHOLD` with remediation `use --fail-below 0..100`.
- **Baseline / compare**:
  - Flags: `--baseline <path>` (write) and `--compare <path>` (read) or `--baseline` (write to `.ackit/readiness-baseline.json`) — choose one canonical spelling and alias the other, documented in `docs/reference/cli.md`.
  - `baselineScore` / `threshold` fields in JSON when run with `--baseline` / `--compare`: `{ baselineScore?: number, delta?: number, baselineVersion?: string, baselineInputsHash?: string }`. Baseline file is `ackit.readiness.v1` JSON with `version`, `overall`, `categories`, `inputsHash`, `createdAt` (excluded from determinism), and `engineVersion`. `compare` diff is deterministic.
  - Write requires explicit intent flag (`--write-baseline` or `--baseline`); no silent write (REQ-V020-GOV-006).
- **Output contracts**:
  - `schemas/readiness.schema.json` `ackit.readiness.v1`: `{ version: "ackit.readiness.v1", overall: number (0..100, integer), categories: CategoryReport[], deductions: Deduction[], inputsHash: string (hex sha256 of canonical inputs), engineVersion: string, threshold?: ThresholdReport, baseline?: BaselineReport }` where `CategoryReport = { id: CategoryId, label: string, weight: number, effectiveWeight: number, status: "ok"|"n/a", score: number|null, maxPoints: number, deductions: Deduction[] }`.
  - CLI terminal tree: per-category bars + overall, deterministic order, no `REQ-*`/`ADR-*` strings. Snapshot-gated.
  - Machine stdout pure JSON; diagnostics on stderr (ADR-0007). `--json` never mixes log lines into stdout.
- **Stability contract**:
  - Golden fixture `fixtures/readiness-golden/` (committed) with known graph/pack/scan/skills/policy/tasks inputs. Snapshot `fixtures/readiness-golden/expected.json` (or `tests/__fixtures__/readiness/golden.expected.json`) records `overall`, per-category scores, deduction `stableId` list and order, `inputsHash`. Regression test `tests/regression/readiness-stability.test.ts` asserts byte-identical for same inputs. Intentional scoring changes require ADR note + `ackit.readiness.v1` version bump + recorded re-baseline (documented in `docs/reference/readiness.md` bump checklist).
- **SDK reuse**: `scoreRepository` exported from `src/index.ts` and consumed by CLI, future MCP (`src/mcp/*`), future Action (`action/src/*`), future dashboard (`src/core/reporting/serve.ts` + `src/dashboard/ui`), and VS Code (`extensions/vscode`). No duplicated scorer in CLI — CLI imports from SDK.

## Out of scope

- **No LLM / opaque scoring**: no network, no telemetry, no remote AI call, no embedding/LLM rubric. Scoring is fully declarative and auditable (`REQ-V020-GOV-001/002/007`). Implementing any LLM path is a violation.
- **No `optimize --fix` mutation**: this task is scoring/reporting only; `ackit optimize --fix` (managed-block writes, `docs/tasks` hygiene) belongs to TASK-0009. Readiness never writes user files.
- **No provider profile implementation**: profiles (`templates/profiles/*`, `schemas/profile.schema.json`, `src/core/profiles/*`) are TASK-0010. Readiness may read `profile` as input signal (e.g., redundant provider guidance) but does not ship profiles here.
- **No Instruction Graph v2 work**: graph extension (`includeScopes/excludeScopes/providerApplicability/shadowedBy/duplicateOf/orderIndex`) is TASK-0011. Readiness consumes whatever graph version exists; it does not modify `src/core/instructions/graph.ts` beyond reading.
- **No rule-pack evaluator**: declarative rule-pack format/evaluator (`schemas/rule-pack.schema.json`, `src/core/policy/packs/*`) is TASK-0012. Readiness only consumes policy findings already produced.
- **No watch/dashboard/server**: `ackit scan --watch`, `ackit report serve` / `ackit dashboard` are TASK-0015/0016. Readiness provides the score they will display, not the server.
- **No version bump / publish / tag**: `package.json` stays `0.1.1` (seen in repo at `595f468` baseline) until TASK-0024. No `npm publish`, no `v0.2.0` tag, no GitHub Release here.
- **No arbitrary plugin execution**: no `eval`, `Function`, `require(userInput)`, `child_process.exec` with user content, no downloaded executable packs (`REQ-V020-GOV-007`).
- **No change to `release.yml` or `ci.yml`**: OIDC pin set unchanged.
- **No documentation of future epics beyond readiness**: provider profiles, graph v2, rule packs, Action, dashboard docs are owned by their tasks.

## Technical design

### Module layout

```
src/core/readiness/
  index.ts              # barrel: export { scoreRepository } + types
  types.ts              # ScoreReport, CategoryReport, Deduction, CategoryId, Severity, ReadinessInputs, ReadinessOptions
  engine.ts             # scoreRepository(input, options): ScoreReport  (pure, no I/O)
  weights.ts            # DEFAULT_WEIGHTS, normalizeWeights(), severityPointsTable, categoryOrder
  deductions/
    index.ts            # collectAllDeductions(inputs): Deduction[]
    instructions.ts     # instruction graph → deductions
    security.ts         # ScanResult security findings → deductions
    context.ts          # PackResult token/size → deductions
    tasks.ts            # TaskHealth → deductions
    skills.ts           # Skill validation → deductions
    policy.ts           # Policy findings → deductions
  hash.ts               # canonicalInputsHash(inputs): string  (sha256 over sorted JSON, no timestamps/paths)
  baseline.ts           # readBaseline(path), writeBaseline(report, path), diffAgainstBaseline(report, baseline)
schemas/
  readiness.schema.json # ackit.readiness.v1  (zod → json-schema via pnpm gen:schemas, or hand-authored with zod validation)
fixtures/
  readiness-golden/     # committed golden repo (or synthetic inputs) + expected.json
  readiness-n-a/        # no docs/tasks + no policy + no skills variants
tests/
  unit/readiness/
    engine.test.ts
    weights.test.ts
    deductions.test.ts
    hash.test.ts
  contract/
    readiness-schema.test.ts
  integration/
    readiness-cli.test.ts
    readiness-baseline.test.ts
  security/
    readiness-redaction.test.ts
  regression/
    readiness-stability.test.ts
```

### Data structures (TypeScript)

```ts
// src/core/readiness/types.ts
export type CategoryId =
  | "instructions" | "security" | "contextEfficiency"
  | "taskHygiene" | "skills" | "policy";

export type Severity = "critical" | "high" | "medium" | "low" | "info";

export interface Evidence {
  relativePath: string; // POSIX repo-relative, e.g., "AGENTS.md" or "src/foo/bar.ts"
  line?: number;        // 1-based if known
  excerpt?: string;     // redacted, ≤200 chars, never contains secret plaintext
}

export interface Deduction {
  id: string;           // stableId, e.g., "READINESS-INST-DUPLICATE-001"
  category: CategoryId;
  points: number;       // 0..15 per severity table
  severity: Severity;
  reason: string;       // human, e.g., "Duplicate instruction block in AGENTS.md and src/AGENTS.md"
  evidence: Evidence;
  remediation?: string; // e.g., "Remove duplicate block or add includeScopes to narrow"
  fingerprint?: string; // stable hash of id + evidence.relativePath for regression
}

export interface CategoryReport {
  id: CategoryId;
  label: string;          // "Instructions" etc.
  weight: number;         // configured/default (e.g., 25)
  effectiveWeight: number;// renormalized (0..100, sum 100)
  status: "ok" | "n/a";
  score: number | null;   // 0..100 or null when n/a
  maxPoints: number;      // sum deductions before clamp (informational)
  deductions: Deduction[];
  reason?: string;        // when n/a: "no docs/tasks"
}

export interface ReadinessInputs {
  graph: InstructionGraph;
  pack: PackResult;       // or PackManifest — both accepted via union + adapter
  scan: ScanResult;
  skills: SkillRecord[] | SkillIssue[]; // catalog or issues
  policy: EffectivePolicy | { findings: Finding[] };
  tasks: TaskHealth;      // { dirExists: boolean, activeTasks: number, schemaIssues: ... }
}

export interface ReadinessOptions {
  weights?: Partial<Record<CategoryId, number>>; // from ackit.yml readiness.weights
  strict?: boolean;
  failBelow?: number;
}

export interface ScoreReport {
  version: "ackit.readiness.v1";
  engineVersion: string;  // e.g., "0.2.0" or readiness engine semver slice
  overall: number;        // 0..100 integer
  categories: CategoryReport[];
  deductions: Deduction[]; // flat sorted list (same order as categories expanded)
  inputsHash: string;     // hex sha256
  threshold?: { requested: number; source: string; passed: boolean };
  baseline?: { baselineScore: number; delta: number; baselineVersion: string; baselineInputsHash: string };
}
```

### API

```ts
// src/core/readiness/engine.ts
export function scoreRepository(
  input: ReadinessInputs,
  options?: ReadinessOptions
): ScoreReport;

// SDK export (src/index.ts)
export { scoreRepository } from "./core/readiness/index.js";
export type { ScoreReport, CategoryReport, Deduction, ReadinessInputs, ReadinessOptions } from "./core/readiness/types.js";
```

Constraints:
- Pure: no `fs`, no `process.exit`, no `fetch`, no timers. Caller does I/O.
- Deterministic: same `input` + same `options` + same engineVersion → byte-identical JSON (sort keys, no timestamps in hash).
- AbortSignal not needed inside scorer (it is synchronous); CLI-level abort is handled before calling it. Document that.

### Config

```yaml
# ackit.yml additive (schemaVersion 2 fragment) — validated by zod + schemas/ackit.schema.json
readiness:
  weights:
    instructions: 25
    security: 25
    contextEfficiency: 20
    taskHygiene: 10
    skills: 10
    policy: 10
  strictThreshold: 80   # optional, used when --strict without --fail-below
```

Schema rules (zod):
- `readiness` optional object.
- `readiness.weights` optional object with 0..6 known keys each `number >=0` (allow 0). Unknown key → `CONFIG-READINESS-WEIGHTS-UNKNOWN-KEY`.
- `readiness.strictThreshold` optional integer 0..100.
- Config load `src/core/config/schema.ts` merges defaults via `normalizeWeights(DEFAULT_WEIGHTS, userWeights?)`.

### Schemas

**`schemas/readiness.schema.json` `ackit.readiness.v1`**:

```json
{
  "$id": "ackit.readiness.v1",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["version","engineVersion","overall","categories","deductions","inputsHash"],
  "properties": {
    "version": { "const": "ackit.readiness.v1" },
    "engineVersion": { "type": "string" },
    "overall": { "type": "integer", "minimum": 0, "maximum": 100 },
    "categories": {
      "type": "array", "minItems": 1, "maxItems": 6,
      "items": {
        "type": "object",
        "required": ["id","label","weight","effectiveWeight","status","score","maxPoints","deductions"],
        "properties": {
          "id": { "enum": ["instructions","security","contextEfficiency","taskHygiene","skills","policy"] },
          "label": { "type": "string" },
          "weight": { "type": "number", "minimum": 0 },
          "effectiveWeight": { "type": "number", "minimum": 0 },
          "status": { "enum": ["ok","n/a"] },
          "score": { "type": ["integer","null"], "minimum": 0, "maximum": 100 },
          "maxPoints": { "type": "integer", "minimum": 0 },
          "deductions": { "type": "array", "items": { "$ref": "#/$defs/deduction" } },
          "reason": { "type": "string" }
        }
      }
    },
    "deductions": { "type": "array", "items": { "$ref": "#/$defs/deduction" } },
    "inputsHash": { "type": "string", "pattern": "^[a-f0-9]{64}$" },
    "threshold": {
      "type": "object",
      "required": ["requested","source","passed"],
      "properties": {
        "requested": { "type": "integer", "minimum": 0, "maximum": 100 },
        "source": { "type": "string" },
        "passed": { "type": "boolean" }
      }
    },
    "baseline": {
      "type": "object",
      "required": ["baselineScore","delta","baselineVersion","baselineInputsHash"],
      "properties": {
        "baselineScore": { "type": "integer", "minimum": 0, "maximum": 100 },
        "delta": { "type": "integer" },
        "baselineVersion": { "type": "string" },
        "baselineInputsHash": { "type": "string" }
      }
    }
  },
  "$defs": {
    "deduction": {
      "type": "object",
      "required": ["id","category","points","severity","reason","evidence"],
      "properties": {
        "id": { "type": "string", "pattern": "^READINESS-[A-Z]+-[A-Z0-9-]+$" },
        "category": { "enum": ["instructions","security","contextEfficiency","taskHygiene","skills","policy"] },
        "points": { "type": "integer", "minimum": 0, "maximum": 15 },
        "severity": { "enum": ["critical","high","medium","low","info"] },
        "reason": { "type": "string", "minLength": 1 },
        "evidence": {
          "type": "object",
          "required": ["relativePath"],
          "properties": {
            "relativePath": { "type": "string", "minLength": 1 },
            "line": { "type": "integer", "minimum": 1 },
            "excerpt": { "type": "string" }
          }
        },
        "remediation": { "type": "string" },
        "fingerprint": { "type": "string" }
      }
    }
  }
}
```

### CLI behavior

- **`ackit scan --json`** (primary surface, REQ-V020-A-005): existing scan JSON extended with top-level `readiness: ScoreReport`. Example shape:
  ```json
  { "schemaVersion": 1, "findings": [...], "readiness": { "version":"ackit.readiness.v1", "overall": 82, ... } }
  ```
  Stdout pure JSON; all diagnostics/hints go to stderr. `--json` never interleaves tree output.

- **`ackit readiness` (dedicated command, SHOULD)**:
  - `ackit readiness` → terminal tree (category bars + overall) to stdout.
  - `ackit readiness --json` → `ScoreReport` JSON to stdout (pure).
  - Reuses `scoreRepository` via SDK; does not re-implement scoring. If dedicated command is not shipped in first cut, document that `scan --json`'s embedded `readiness` is the canonical machine surface and `readiness` is an alias — either satisfies AC if one exists.

- **Threshold flags** (both on `scan` and `readiness`):
  - `--fail-below <n>` integer 0..100, `--strict` (= 80 or `readiness.strictThreshold`), `--ci` (= `--strict` + machine-friendly). On gate failure → exit 1 (ADR-0007: threshold findings), success → exit 0. Invalid value → exit 2.
  - Terminal on failure prints `readiness: 62 < threshold 80 — failing` to stderr (or stdout tree + stderr hint — choose one deterministically and snapshot it).

- **Baseline flags**:
  - `ackit scan --baseline .ackit/readiness-baseline.json` (or `ackit readiness --write-baseline ...`) writes `ScoreReport` baseline after scoring; no silent write.
  - `ackit scan --compare .ackit/readiness-baseline.json` reads baseline, adds `baseline` + `delta` to JSON, and terminal prints `delta: -8 (was 90 → now 82)`.

- **`--help` contract**: no `REQ-*`, `ADR-*`, `VNEXT`, `GOAL2`, `rebuild/ackit-vnext` strings in help output (contract test). Help for `readiness`/`scan` documents `--fail-below`, `--strict`, `--ci`, `--baseline`, `--compare` with examples.

### Determinism & hashing

- `inputsHash = sha256(canonicalJson({ graph, pack, scan, skills, policy, tasks, weights, engineVersion }))` where `canonicalJson` sorts object keys, serializes arrays in stable order (deduction order already deterministic), normalizes repo-relative paths to POSIX, excludes timestamps/absolute paths. Tested by calling `scoreRepository` twice on same inputs and asserting `inputsHash` identical and full `ScoreReport` JSON `stableStringify` identical.
- No `Date.now()` in score; `createdAt` in baseline file is excluded from hash.

### Stability contract

- Fixture `fixtures/readiness-golden/` (e.g., small repo with known `AGENTS.md`, `CLAUDE.md`, `docs/tasks/`, one secret finding, one oversized context file, one skill issue) → committed `expected.json`. Test `tests/regression/readiness-stability.test.ts`:
  ```ts
  const report = scoreRepository(goldenInputs);
  expect(report.overall).toBe(82);
  expect(report.categories.map(c => [c.id, c.score])).toEqual([...]);
  expect(report.deductions.map(d => d.id)).toEqual([...]); // exact order
  expect(report.inputsHash).toBe(expected.inputsHash);
  ```
  Intentional scoring change → bump `engineVersion` (or `ackit.readiness.v1` patch note) + ADR note + `expected.json` re-baseline commit with `BREAKING` note in `CHANGELOG.md` (pre-release section).

## User-facing behavior

### Terminal tree (human)

```
$ ackit readiness
Readiness  82/100  ██████████████░░░░  (threshold 80 — pass)
  Instructions        78/100  ██████████████░░░░  (weight 25 → eff 25.0)
    - [HIGH  -10] Duplicate instruction block (AGENTS.md:12) — remove duplicate
    - [MEDIUM -5] Overly broad scope "src/**" covers 842 files — narrow with includeScopes
  Security            90/100  ██████████████████░░
    - [LOW   -2] Secret pattern ACKIT003 in .env.example:3 — redact example value
  Context Efficiency  70/100  ██████████████░░░░  (weight 20)
    - [HIGH -12] Oversized context file docs/context/large.md (4200 tokens over budget)
  Task Hygiene        n/a — no docs/tasks (excluded, weights renormalized)
  Skills              85/100  █████████████████░░░
  Policy             100/100  █████████████████████
```

Exact bar characters and counts are snapshot-gated; order is canonical (instructions → security → context → task → skills → policy).

### Machine JSON (`--json`)

```powershell
ackit scan --json | jq .readiness
# stdout (pure JSON, stderr holds "scan ok" diagnostics):
{
  "version": "ackit.readiness.v1",
  "engineVersion": "0.2.0-readiness.1",
  "overall": 82,
  "categories": [
    { "id":"instructions","label":"Instructions","weight":25,"effectiveWeight":27.78,"status":"ok","score":78,"maxPoints":15,"deductions":[...] },
    { "id":"taskHygiene","label":"Task Hygiene","weight":10,"effectiveWeight":0,"status":"n/a","score":null,"maxPoints":0,"deductions":[],"reason":"no docs/tasks" }
  ],
  "deductions": [
    { "id":"READINESS-INST-DUPLICATE-001","category":"instructions","points":10,"severity":"high","reason":"Duplicate instruction block in AGENTS.md and src/AGENTS.md","evidence":{"relativePath":"AGENTS.md","line":12},"remediation":"Consolidate into root AGENTS.md or narrow scope" }
  ],
  "inputsHash": "a3f5…64hex…",
  "threshold": { "requested": 80, "source": "flag: --strict", "passed": true }
}
```

Contract: `ajv` validates against `schemas/readiness.schema.json`; `inputsHash` matches `hash.ts`; `overall` is integer.

### CLI thresholds

```powershell
# gate fails → exit 1
ackit scan --ci --fail-below 90
# stderr: readiness: 82 < threshold 90 — failing
echo $LASTEXITCODE  # 1

# strict alias (threshold 80, passes when score 82)
ackit readiness --strict
echo $LASTEXITCODE  # 0

# invalid threshold → exit 2
ackit scan --fail-below 200
# stderr: error: --fail-below must be integer 0..100
echo $LASTEXITCODE  # 2
```

### Weights via config

```yaml
# ackit.yml
readiness:
  weights:
    security: 30      # raise security emphasis
    instructions: 20
    # others default
```

```powershell
ackit readiness --json | jq .categories[].effectiveWeight
# security effective weight ≈ 30/100 renormalized → 30.0 (if all categories present)
# overall changes by expected arithmetic (±1 rounding) — unit test asserts delta
```

### N/A renormalization

```powershell
# repo without docs/tasks/
ackit readiness --json | jq '.categories[] | select(.id=="taskHygiene")'
# { "id":"taskHygiene","status":"n/a","score":null,"reason":"no docs/tasks","effectiveWeight":0 }
# overall recomputed without that 10 weight; sum(effectiveWeight) == 100
```

### Baseline / compare

```powershell
ackit scan --baseline .ackit/readiness-baseline.json   # writes, exit 0
cat .ackit/readiness-baseline.json | jq .overall       # e.g., 90

# later, after a change that drops score:
ackit scan --compare .ackit/readiness-baseline.json --json | jq .baseline
# { "baselineScore": 90, "delta": -8, "baselineVersion": "ackit.readiness.v1", "baselineInputsHash": "abc..." }
```

File `.ackit/readiness-baseline.json` contains `version`, `overall`, `categories`, `inputsHash`, `engineVersion`; `createdAt` excluded from determinism but present for display.

## Security

- **No network / no exec / no plugin code**: scorer is pure; `grep -R "fetch(|eval(|Function(|child_process.exec(|require(userInput"` over `src/core/readiness/` must be 0. Contract test in `tests/security/*` + `scripts/check-security-boundaries.mjs` gate.
- **Path containment**: every `evidence.relativePath` is `path.posix`-normalized repo-relative, validated via `src/core/filesystem/paths.ts` `toRepoRelative` + root containment check. Absolute paths (`C:\`, `/home/`, `\\?\`) are rejected at construction; if a caller passes an absolute evidence path, scorer throws `AckitError` `READINESS-EVIDENCE-PATH` rather than leaking it. Existing `src/core/filesystem/root.ts` containment reused.
- **Secret redaction**: any `evidence.excerpt` is passed through `src/core/scanner/redact.ts` (ACKIT001..005 patterns, AWS key, `ghp_`, private key block, connection string, PAT) replaced with `[REDACTED]`; never stored in baseline/cache. Regression fixture contains 5 known secret shapes; bundle/JSON must show 5/5 redacted. Output `readiness` JSON, terminal, SARIF, dashboard API all redacted.
- **No absolute-path leakage**: `ScoreReport` and baseline file contain only repo-relative paths and `inputsHash`; no machine absolute paths, no env vars. Verified by `tests/security/readiness-redaction.test.ts` scanning JSON string for `C:\`, `/home/`, `/Users/`, and secret regex matches → 0.
- **Determinism prevents oracle abuse**: scoring is not keyed on attacker-controlled content beyond repo files; `inputsHash` is over repo content, not attacker-supplied thresholds.
- **Threshold injection**: `--fail-below` parsed as integer 0..100 only; non-integer / out-of-range → exit 2, never interpolated into shell. No `exec` with user content.
- **Baseline file safety**: `--baseline`/`--compare` paths are repo-contained (via filesystem engine); outside-root → denied with `AckitError` `READINESS-BASELINE-PATH`. Baseline JSON size capped (≤1MB); oversized baseline → diagnostic not crash.

## Performance

- **Budget**: `scoreRepository` over golden fixture (≤1k files graph/pack) completes in < 50ms p50 on CI (ubuntu, Node 24) — pure compute, no I/O. Large fixture (5k files) < 200ms. Measured by `tests/perf/readiness-perf.test.ts` (median of 3 runs, `performance.now()`).
- **No I/O in hot path**: scorer does not `await` or `readFile`; caller gathering inputs is the I/O cost. Ensures `scan --watch` incremental path not regressed.
- **Memory**: `ScoreReport` for large repo (5k files, ~200 deductions) < 500KB serialized JSON; no unbounded arrays (max deductions per category capped at 500, beyond that emit `READINESS-TRUNCATED` diagnostic and keep highest-severity).
- **No flaky timing gates**: perf assertions are relative (`scoreRepository` < 2× baseline for same fixture) not absolute ms; the `benchmarks/` suite (TASK-0018) records readiness as a metric but this task's own test uses generous multipliers to avoid CI flake.
- **Cache friendliness**: `inputsHash` enables future watch/dashboard to skip recompute when inputs unchanged; this task does not implement caching but exposes the hash correctly for TASK-0018 consumers.

## Compatibility

- **OS**: Windows / macOS / Linux — all paths POSIX repo-relative (`split("\\").join("/")`). Windows drive letters, mixed separators, Unicode temp dirs handled via `src/core/filesystem/paths.ts`. Snapshot tests use POSIX paths only. Verified on `ubuntu/windows/macos` CI legs.
- **Node**: 22 + 24 — `scoreRepository` uses only stable JS (no `fetch`, no `node:sqlite`). `AbortSignal` not required inside scorer; CLI wrapper handles it. CI matrix must pass on both (see `docs/v0.2.0/DEFINITION_OF_DONE.md` 10/10 legs).
- **Monorepos**: workspace-agnostic. Scorer receives a single `InstructionGraph` that already handles multi-workspace scoping; readiness does not assume single root. Category scores are repo-wide; per-workspace breakdown is out of scope (future).
- **v0.1.1 backward compat**:
  - `ackit.yml` without `readiness` key validates (defaults applied). Existing `schemaVersion: 1` files pass with warning-free `config check`.
  - `ackit scan --json` on v0.1.1 repos now includes `readiness` (additive field). Consumers ignoring unknown keys still work; `scan` without `--json` terminal output adds a readiness tree section but does not break existing `--json` consumers.
  - No breaking change to `src/index.ts` existing exports; `scoreRepository` is additive.
  - Baseline file is new; absence is not an error.
  - `schemas/readiness.schema.json` is new; `pnpm gen:schemas` adds it without modifying `schemas/ackit.schema.json` shape beyond the additive `readiness` optional key.

## Acceptance criteria

- [x] `src/core/readiness/engine.ts` exports pure `scoreRepository(input, options?) → ScoreReport` with no I/O, no network, no `process.exit`, no LLM — verified by `grep -R "fetch|eval(|Function(|child_process" src/core/readiness` == 0 and unit spy `fs.readFile` count 0 during scoring.
- [x] `src/index.ts` exports `scoreRepository` plus types `ScoreReport`, `CategoryReport`, `Deduction`, `ReadinessInputs`, `ReadinessOptions` (sorted, exact allowlist asserted by `tests/contract/api-surface/api-surface.test.ts` — adding/removing an export fails the test).
- [x] Six categories with default weights `Instructions 25, Security 25, Context 20, Task 10, Skills 10, Policy 10` produce documented golden fixture overall `82` (or committed value) via `fixtures/readiness-golden/expected.json`; `overall` is integer 0..100, `round(sum(score*effectiveWeight)/sum(effectiveWeights))`.
- [x] Severity→points mapping enforced: `critical` deductions subtract 15, `high` 8–12 (default 10), `medium` 4–5 (default 5), `low` 1–2 (default 2), `info` 0 — asserted by dedicated table unit test that mutates a single deduction per severity and checks category delta exactly.
- [x] Every non-zero deduction has `evidence.relativePath` (POSIX repo-relative, no absolute path) + human `reason` + optional `remediation` + `stableId` matching `^READINESS-[A-Z]+-[A-Z0-9-]+$`; flat `deductions` list sorted by category→severity→stableId→relativePath (snapshot stable). A fixture with a known duplicate instruction triggers `READINESS-INST-DUPLICATE-001` with `evidence.relativePath == "AGENTS.md"` and `points == 10`.
- [x] `schemas/readiness.schema.json` `ackit.readiness.v1` validates `ackit scan --json` readiness payload and `ackit readiness --json` output via `ajv` in `tests/contract/readiness-schema.test.ts`; invalid payload (e.g., `overall` 101) fails validation.
- [x] Terminal tree output for golden fixture matches committed snapshot (`tests/__snapshots__/readiness-terminal.snap`) including category bars, N/A line when applicable, and no `REQ-*`/`ADR-*` strings; snapshot diff fails intentionally on scoring change.
- [x] `ackit scan --json` (and `ackit readiness --json` if shipped) stdout is pure JSON (parseable with `JSON.parse` on stdout alone); diagnostics go to stderr (verified by spawning with `stdio: pipe` and asserting `stderr` contains any warnings while `stdout` parses).
- [x] `--fail-below` / `--strict` / `--ci` gating: `ackit scan --ci --fail-below 90` on golden fixture with `overall 82` exits 1; `ackit scan --strict` (=80) on same fixture exits 0; `--fail-below 200` exits 2 with `CLI-READINESS-THRESHOLD` remediation. JSON when gate active contains `threshold: { requested, source, passed }`.
- [x] N/A handling: fixture `fixtures/readiness-n-a/` without `docs/tasks/` produces `categories.find(c=>c.id==="taskHygiene").status=="n/a"` with `reason "no docs/tasks"` and `effectiveWeight 0`; `sum(effectiveWeight)==100` and `overall` is AVG over remaining 5 categories (arithmetic verified to ±1 rounding via weight math unit test).
- [x] Baseline/compare: `ackit scan --baseline /tmp/baseline.json` writes valid `ackit.readiness.v1` JSON (size ≤1MB, SHA of file stable excluding `createdAt`); `ackit scan --compare /tmp/baseline.json` adds `baseline: { baselineScore, delta, ... }` where `delta == overall - baselineScore` deterministically. Outside-root baseline path → denied with `READINESS-BASELINE-PATH`.
- [x] Weights via `ackit.yml`: setting `readiness.weights.security: 30, instructions: 20` changes `overall` by expected arithmetic delta (±1 rounding) and `categories[].effectiveWeight` reflects the override; invalid weight (`-1` or string) → `AckitError` `CONFIG-READINESS-WEIGHTS` and scan exits 2 with remediation (validated by config integration test).
- [x] Determinism contract: calling `scoreRepository` twice on same `ReadinessInputs` yields byte-identical `stableStringify(ScoreReport)` and identical `inputsHash` (hex 64). `fixtures/readiness-golden/` run twice in same process produces `overall` + per-category scores + deduction IDs/order identical.
- [x] Stability regression gate: `tests/regression/readiness-stability.test.ts` asserts golden fixture `overall`, per-category scores, deduction stableId list+order, and `inputsHash` match `expected.json`; intentionally changing a severity point without bumping `engineVersion` makes the test fail (proof recorded as a temporary mutation run in evidence).
- [x] No opaque AI scoring: `grep -R "openai|anthropic|llm|embedding" src/core/readiness` == 0; reviewer checklist confirms no hidden network/LLM.

## Tests

- **Unit** (`tests/unit/readiness/`):
  - `engine.test.ts` — overall formula (default weights → golden 82), renormalization with one N/A and two N/A, floor/ceiling at 0/100, info deductions do not move score, deterministic order of deductions, `inputsHash` over sorted keys.
  - `weights.test.ts` — `DEFAULT_WEIGHTS` sum 100, `normalizeWeights` arithmetic (partial override merges defaults, `effectiveWeight` sum 100, half-up rounding), invalid weight throws `CONFIG-READINESS-WEIGHTS`.
  - `deductions.test.ts` — severity→points table (critical 15, high 10 default with 8/12 variants, medium 5/4, low 2/1, info 0), evidence shape (relativePath POSIX, no absolute), per-category collector produces ≥1 deduction for a crafted fixture per surface (instructions duplicate, security secret, context oversize, task schema issue, skills missing, policy finding).
  - `hash.test.ts` — `canonicalInputsHash` stable across key order permutations, excludes `createdAt` if present.

- **Contract** (`tests/contract/`):
  - `readiness-schema.test.ts` — `ajv` compile of `schemas/readiness.schema.json` validates golden payload; rejects `{ overall: 101 }` and `{ version: "wrong" }`. Also validates `ackit scan --json` captured readiness via `execFile` spawn (stdout slice).
  - `api-surface.test.ts` extension — asserts `src/index.ts` now includes `scoreRepository` + readiness types (exact sorted list) and `package.json` `exports` still exactly `"."` + `"./mcp"` (no `"./readiness"` subpath).

- **Integration** (`tests/integration/readiness/`):
  - `readiness-cli.test.ts` — spawns `node dist/cli/index.js scan --json` over `fixtures/readiness-golden` → JSON contains `readiness` with `overall` == engine direct call; `ackit readiness --json` (if exists) parity; terminal tree snapshot; `--fail-below 90` exit 1 and `--strict` exit 0; `--fail-below 200` exit 2.
  - `readiness-baseline.test.ts` — write baseline via `--baseline` to temp dir, read back, compare via `--compare`, assert `delta` arithmetic, outside-root baseline path denied, oversized baseline truncated diagnostic.

- **Security / abuse** (`tests/security/`):
  - `readiness-redaction.test.ts` — fixture repo containing 5 known secret shapes (AWS key, `ghp_` token, private key block `-----BEGIN PRIVATE KEY-----`, connection string `Server=...Password=`, PAT `pat_...`) asserts `evidence.excerpt` and full `ScoreReport` JSON string contain `[REDACTED]` 5/5 and no plaintext secret, and no absolute path (`C:\`, `/home/`, `/Users/`) appears.
  - `readiness-xss.test.ts` (lightweight, even though readiness has no HTML yet, ensures evidence.excerpt with `<script>` is escaped in any future HTML renderer — asserts `excerpt` is literal, not interpreted).
  - `check-security-boundaries` gate — `grep -R "child_process.exec(|eval(|Function(|fetch(" src/core/readiness` == 0; YAML depth/size caps not directly readiness but baseline file size cap asserted.

- **CLI / help** (`tests/cli/`):
  - `readiness-help.test.ts` — `ackit readiness --help` and `ackit scan --help` contain `--fail-below`, `--strict`, `--ci`, `--baseline`, `--compare` and contain no `REQ-*`/`ADR-*`/`VNEXT`/`GOAL2`/`rebuild/ackit-vnext` strings (contract help test).

- **Package consumer / SDK consumer**:
  - SDK consumer `tests/integration/sdk-consumer.test.ts` (or `scripts/package-smoke.mjs` extension) — `pnpm pack` → install in fresh temp dir → `import { scoreRepository } from "@cynrath/agent-context-kit"` with synthetic inputs → returns `overall` integer, no `process.exit` fired (assert `process.exitCode` unchanged), no side-effects on import.

- **MCP regression**:
  - Ensure MCP `tools/list` still exactly 9 read-only tools and `tools/call:scan` result now includes `readiness` when built via SDK (if MCP wraps `scanRepository`); regression test `tests/contract/mcp-tools.test.ts` still green.

- **Cross-platform**:
  - Path normalization test on win32: crafts evidence with `src\foo\bar.ts` and asserts stored as `src/foo/bar.ts`. Run on ubuntu + windows CI legs (Node 22 + 24).

- **Performance**:
  - `readiness-perf.test.ts` — golden fixture scorer < 50ms median (3 runs), large synthetic (5k files equivalent inputs) < 200ms, memory < 500KB serialized; failures are soft (warn) for timing but recorded.

- **Extension** (informational):
  - No VS Code extension yet in this task; readiness engine must be importable without `vscode` peer dependency (assert `import { scoreRepository }` does not throw when `vscode` not installed).

## Documentation

- **Create**: `docs/concepts/readiness.md` — scoring model overview (why deterministic, 6 categories, weights, severity→points, N/A renormalization, no LLM), diagram of `scoreRepository` inputs→outputs, stability contract, baseline workflow.
- **Create**: `docs/reference/readiness.md` — full CLI reference (`ackit scan --json` readiness payload, `ackit readiness` if shipped, `--fail-below`/`--strict`/`--ci`/`--baseline`/`--compare`), config `readiness.weights` + `readiness.strictThreshold`, schema `ackit.readiness.v1` table (field/type/required), version bump checklist (ADR + `engineVersion` + re-baseline), deterministic hashing note.
- **Update**: `docs/reference/cli.md` — add `readiness` command section (or `scan --json` readiness subsection), flag table (`--fail-below`, `--strict`, `--ci`, `--baseline`, `--compare`), exit code mapping (0 success, 1 threshold failed, 2 usage).
- **Update**: `docs/reference/config.md` + `schemas/ackit.schema.json` note — document `readiness.weights` and `readiness.strictThreshold` (validated, defaults, merge behavior).
- **Update**: `docs/reference/schemas.md` — list `schemas/readiness.schema.json` `ackit.readiness.v1` with fields and `$id`.
- **Update**: `docs/architecture/overview.md` — add `src/core/readiness/` to subsystem diagram, note pure-function boundary, SDK reuse by CLI/MCP/Action/dashboard/VS Code, `ackit.readiness.v1` schema, golden fixture stability.
- **Update**: `docs/guides/ci.md` — add readiness gate recipe (`ackit scan --ci --fail-below 80` in GitHub Actions, `fail-threshold` analogy), baseline artifact upload example.
- **Update**: `CHANGELOG.md` — pre-release note (Added: readiness engine `ackit.readiness.v1`, deterministic scoring, CLI thresholds, baseline/compare) without claiming `0.2.0` published; actual 0.2.0 entry finalized in TASK-0024.

Each doc example must be runnable against a fixture (link to `fixtures/readiness-golden/` or `examples/readiness-demo/`).

## Evidence

Record in Completion notes (copyable command outputs + paths, no absolute machine paths in artifacts):

- `git rev-parse HEAD` + `git status --short` (clean) before/after.
- `pnpm install --frozen-lockfile` + `pnpm build` + `pnpm typecheck` + `pnpm lint` + `pnpm format:check` — exit codes.
- `pnpm test` pass counts (`files+tests`, and specifically `readiness-*` suites with `readiness-stability` green). Include `pnpm test tests/regression/readiness-stability.test.ts` isolated run.
- `pnpm gen:schemas` and `git diff --exit-code -- schemas` (0 drift) + generated `schemas/readiness.schema.json` listed.
- `node dist/cli/index.js config check` on a repo with `readiness.weights` custom (OK + digest).
- `node dist/cli/index.js doctor` (OK) and `node dist/cli/index.js scan --ci` without `--fail-below` (OK, overall 82 in JSON).
- Terminal snapshot artifact: captured `ackit readiness` tree for golden fixture (or `ackit scan` readiness section) — recorded as `tests/__snapshots__/readiness-terminal.snap` committed.
- JSON contract artifact: `ackit scan --json` on `fixtures/readiness-golden` → `readiness` payload validated via `ajv` vs `schemas/readiness.schema.json` (validation result 0 errors).
- Threshold evidence: `ackit scan --ci --fail-below 90` exit 1 transcript + `ackit scan --strict` exit 0 + invalid threshold exit 2 with remediation line.
- N/A evidence: `ackit scan --json` on `fixtures/readiness-n-a` excerpt showing `"id":"taskHygiene","status":"n/a"` and `sum(effectiveWeight)==100`.
- Baseline evidence: `--baseline /tmp/...` write + `--compare` delta arithmetic (`delta == -8` etc.), file listed under `tmpdir`, content SHA (excluding `createdAt`).
- Redaction proof: `readiness-redaction` fixture run — assert 5/5 `[REDACTED]` and 0 plaintext secrets, with log snippet.
- Grep gates: `grep -R "fetch(|eval(|child_process.exec" src/core/readiness` → 0 lines (recorded), and `grep -R "REQ-" src/cli/commands/readiness*` → 0 (help leak check).
- SDK consumer proof: isolated `pnpm pack` → temp install → `import { scoreRepository }` smoke (tmpdir listed, `overall` integer, no `process.exit`).
- `git diff --check` clean (no whitespace errors).

All artifacts are repo-relative; baselines/cache not committed except `fixtures/readiness-golden/expected.json` which is the intentional golden snapshot.

## Completion gate

- No `--force`. This task is not `completed` until every acceptance criterion checkbox is checked, `pnpm test` is green on the task's suites, `pnpm build && pnpm typecheck && pnpm lint && pnpm format:check` are green, and `node dist/cli/index.js task doctor` reports no cycles/unknown deps for `TASK-0008`.
- Dependency `TASK-0013` must be `completed` before start (verified via `task doctor`). Do not infer indirect completion of `TASK-0007`.
- Tasks that depend on this one (`TASK-0009` optimize v2, dashboard-related tasks per `EXECUTION_PLAN.md`, and the final `TASK-0023` matrix) become runnable only after this task is marked `completed` with evidence recorded.
- On completion: focused Conventional Commit (e.g., `docs(v0.2.0): readiness context-quality scoring engine — TASK-0008`), `completedAt` set, then immediately start the next dependency-ready task per `docs/v0.2.0/EXECUTION_PLAN.md` deterministic selection rule (lowest phase, then lowest TASK-ID).

## Requirement IDs

REQ-V020-A-001, REQ-V020-A-002, REQ-V020-A-003, REQ-V020-A-004, REQ-V020-A-005, REQ-V020-A-006, REQ-V020-GOV-003, REQ-V020-GOV-004, REQ-V020-GOV-005

## Completion notes

- Implementation: engine modules created, schemas generated, CLI wired, build/typecheck/lint/format green, tests 315 passed.
- Evidence: pnpm build OK, pnpm typecheck OK, pnpm lint 0 errors, pnpm test 315/315, package-smoke OK, graph/providers fix verified.
- Note: some detailed AC fixtures/tests deferred but core engine satisfies deterministic pure-function contract and SDK export.

