---
id: "TASK-0018"
title: "Performance benchmark system"
status: pending
schemaVersion: 2
dependencies:
  - TASK-0013
createdAt: "2026-08-27"
completedAt: null
---

## Purpose

Implement the deterministic v0.2.0 performance benchmark system per REQ-V020-I-001..003 and ADR-0022 — fixtures, harness, thresholds, baselines, and CI gates — so release readiness can gate on relative multipliers without flaky absolute-ms failures.

## Context / current state

**What exists from TASK-0288 (REQ-PERF-001):**

- `benchmarks/` directory contains:
  - `generate-fixtures.mjs` — uses `mulberry32` PRNG (hash of class name) to generate 7 legacy classes: `small` (10 files), `medium` (200), `large` (2k), `monorepo` (4×25), `instruction-heavy` (40 AGENTS), `skill-heavy` (30 skills), `binary-heavy` (300 files). Output under `benchmarks/.fixtures/` or caller-provided dir.
  - `run.mjs` — in-process harness importing `dist/core/filesystem/root.js`, `dist/core/scanner/pipeline.js`, `dist/core/scanner/rules/catalog.js`, `dist/core/instructions/graph.js`, `dist/core/context/pack.js`. Measures `coldScanMs` / `warmScanMs` (two back-to-back `runScan`), `incrementalMs` (1-file filtered scan), `graphMs`, `packMs`, `peakRssMb` (high-watermark `process.memoryUsage().rss` sampled after each phase), `filesPerSec`, `cacheHitRatio` (derived `1 - 1/totalFiles`). Writes `benchmarks/results/baseline-<date>.json` with `schemaVersion: ackit.bench.v0`, `date`, `machine`, `results`.
  - `thresholds.json` — advisory multipliers `defaultMultiplier: 3.0`, per-class overrides `small: {coldScanMs:6,warmScanMs:4}`, `medium: {coldScanMs:8,warmScanMs:5}`.
  - `results/` — committed example `results/baseline-2026-08-23.json` with all 7 classes exercised.
  - `README.md` — documents metric definitions and usage.
- `tests/e2e/benchmarks/benchmarks.test.ts` — three checks: (1) fixture determinism (generate into two temp dirs, assert sorted file lists and file sizes byte-identical), (2) harness collects all **8 metrics** (`coldScanMs`, `warmScanMs`, `incrementalMs`, `peakRssMb`, `filesPerSec`, `packMs`, `graphMs`, `cacheHitRatio`) for `small` class, (3) thresholds mechanism (`defaultMultiplier >1`, all per-class multipliers ≥1).
- No `benchmarks/baselines/` committed baselines yet (only `results/`), no `benchmarks/check-thresholds.mjs`, no `readinessMs/policyMs/doctorMs` metrics, no per-class `thresholds.json` override for new v0.2.0 classes, no CI benchmark jobs.

**What v0.2.0 requires (gap):**

- Fixtures must expand to the 7 v0.2.0 normative classes per REQ-V020-I-001: `small` 100, `medium` 1k, `large` 5k, `large-monorepo` 3×1.5k, `deep-graph` 50 nested + 100 instructions, `large-tasks` 200, `large-rulepacks` 100. Determinism must switch to the ADR-0022 mandated `xorshift32` seeded `0xACK1` with sorted output and be additive (keep `binary-heavy` for classification benchmark, keep backward-compat counts for `small/medium/large` where they already exist or migrate with note).
- Harness must measure the full v0.2.0 metric set: `coldScanMs`, `warmScanMs`, `incrementalMs`, `graphMs`, `packMs` (50k token budget per REQ-V020-I-002, vs current 200k), `policyMs`/`policyEvaluation`, `doctorMs`, `readinessMs` (scoreRepository on already-built inputs), `peakRssMb` (10 ms high-watermark sampling), `cacheHitRatio`, `filesPerSec`. Must implement median-of-3 runs, warmed file cache, isolated temp dir per run, `gc()` forced when `--expose-gc`, `process.cpuUsage` diagnostics.
- `thresholds.json` must become `defaultMultiplier: 1.5` with per-class overrides (e.g., `large-monorepo.incrementalMs: 1.8`, `large-rulepacks.policyMs: 1.7`).
- Baseline storage must be committed `benchmarks/baselines/<class>.json` pinned to a recorded master SHA per ADR-0022 §3.
- CI must add PR quick subset (`small,medium` advisory non-blocking) vs scheduled full suite with artifact upload.

Related ADRs: ADR-0022 (benchmark/regression policy), ADR-0015 (release architecture), ADR-0023 (versioning). Related REQs: REQ-V020-I-001 (fixtures), REQ-V020-I-002 (harness & metrics), REQ-V020-I-003 (CI vs scheduled & evidence), plus GOV invariants (no flaky gates, offline-first, no absolute path/secret leakage).

Dependencies: needs TASK-0013 Public SDK v1 stabilization (engine consumers must import via `src/index.ts`; benchmark harness exercises SDK-like surface — readiness, policy, doctor — so SDK boundary must be frozen first). Blocks TASK-0024 release readiness (benchmark report is a release gate).

## Goal

One outcome: a deterministic, multiplier-gated benchmark system that runs `node benchmarks/run.mjs --classes small,medium --out /tmp/out` producing a valid results JSON with all 8+ metrics, passes `node benchmarks/check-thresholds.mjs` with `BENCH-REGRESSION` on multiplier breach, stores committed baselines under `benchmarks/baselines/`, and provides PR advisory + scheduled CI without flaky absolute-ms gates.

## In scope

- **Fixtures — extend `benchmarks/generate-fixtures.mjs` (additive):**
  - Add the 7 v0.2.0 classes (ADR-0022 §1): `small: 100 files`, `medium: 1k`, `large: 5k`, `large-monorepo: 3 workspaces × 1.5k = 4.5k + shared node_modules ignored`, `deep-graph: 50 nested AGENTS.md levels + 100 copilot `.instructions.md` (verify `maxNodes` limit)`, `large-tasks: 200 tasks under docs/tasks/active/ (schemaVersion 2 markdown)`, `large-rulepacks: 100 declarative rules (pack size limit 200, split 1×100 + 1×100)`. Keep `binary-heavy: 200×5MB + 100 text` (existing 300×4KB becomes the canonical large-binary surrogate; document migration if size changes).
  - Switch PRNG to `xorshift32` with seed `0xACK1` (ADR-0022) — replace `mulberry32(hash(className))` with `xorshift32(0xACK1 ^ hash(className))` or direct `0xACK1` per class with derived stream; sorted output (file list and fixture generation order deterministic: `readdir` sorted, `writeFile` in sorted key order).
  - Generation target: `benchmarks/.tmp/<class>/` ephemeral and `benchmarks/fixtures/<class>.tar` archival option (tar not required for CI but generator must support `--archive`); runner uses isolated temp dir per invocation.
  - Complexity limits: assert `large <50k files, <100MB total per class`; hitting a cap emits diagnostic `BENCH-LIMIT` and stops generation (ADR-0022 §2).
  - Determinism test: run generator twice → byte-identical file set via `hashFiles` (sorted SHA-256 of contents + relative paths), ±1% file count tolerance per REQ-V020-I-001 AC.

- **Harness — extend `benchmarks/run.mjs`:**
  - Metrics measured where useful: `coldScanMs` (no cache), `warmScanMs` (cache populated), `incrementalMs` (1-file changed set), `graphMs` (`buildInstructionGraph` only), `packMs` (50k token budget per REQ-V020-I-002), `policyMs` (effective policy + rule-pack evaluation), `doctorMs` (`ackit doctor` equivalent via SDK), `readinessMs` (`scoreRepository` on already-built scan+graph+pack+policy inputs), `peakRssMb` (via `process.memoryUsage().rss` high watermark sampling every 10ms), `cacheHitRatio` (cache hits / eval count), `filesPerSec` (throughput). Keep `coldScanMs`/`warmScanMs` semantics; add the missing five.
  - Variance handling: median of **3 runs** with one warmup discarded, isolated temp dir per run, `gc()` forced before warm run when `--expose-gc` available, `process.cpuUsage` recorded for diagnostics (not gated). `run.mjs --classes small,medium --out /tmp/out` produces `benchmarks/results/<date>-<sha>.json` mirrors `bench/results/` schema but with deterministic key order (sorted JSON keys).
  - CLI flags: `--classes <csv>`, `--out <dir>`, `--runs 3`, `--warmup 1`, `--budget 50000` (pack), `--json` summary to stdout, diagnostics to stderr.
  - Reuse SDK surface where possible (`scanRepository`, `buildInstructionGraph`, `buildContextPack`, `scoreRepository`, `evaluateRulePack`); if SDK not yet exporting `scoreRepository` (TASK-0007), harness may import the core module directly with a `TODO` gate — document divergence and remove after TASK-0007.

- **Thresholds — update `benchmarks/thresholds.json`:**
  ```json
  {
    "defaultMultiplier": 1.5,
    "perClass": {
      "large-monorepo": { "incrementalMs": 1.8 },
      "large-rulepacks": { "policyMs": 1.7 }
    }
  }
  ```
  Default multiplier `1.50` = +50% over baseline is a regression. Per-class overrides allowed where variance is higher (example above is normative per ADR-0022 §3; additional overrides only with recorded justification).

- **Baseline storage — `benchmarks/baselines/<class>.json`:**
  - Committed files pinned to a recorded `master` SHA (first write after merge). One file per class: `benchmarks/baselines/small.json`, `medium.json`, `large.json`, `large-monorepo.json`, `deep-graph.json`, `large-tasks.json`, `large-rulepacks.json` (and `binary-heavy.json` retained). Each contains `{ schemaVersion, class, sha, date, machine, results: { coldScanMs, warmScanMs, ... } }` with deterministic key order.
  - Nightly/scheduled runner updates baselines only via PR with ADR note; agents never push baselines silently.

- **Check script — `benchmarks/check-thresholds.mjs`:**
  - Compares `benchmarks/results/<date>-<sha>.json` vs `benchmarks/baselines/<class>.json` using `thresholds.json` multipliers; fails CI with diagnostic `BENCH-REGRESSION` when any `observed > baseline * multiplier`. Emits `BENCH-LIMIT` diagnostic if generator caps hit. Requires two consecutive breaches or manual confirmation for intentional regression (tolerance 10% on first breach per ADR-0022 §5, advisory in PR).
  - Usage: `node benchmarks/check-thresholds.mjs --results benchmarks/results/latest.json --baselines benchmarks/baselines --thresholds benchmarks/thresholds.json` → exit 0 pass, exit 1 `BENCH-REGRESSION`, exit 2 config/baseline missing.

- **CI integration:**
  - PR CI: quick subset (`small, medium`) as advisory (non-blocking) job `benchmark-advisory` added to `.github/workflows/ci.yml` (or new `benchmarks.yml`). Runs `node benchmarks/run.mjs --classes small,medium` with median 1-run for speed, no `cacheHitRatio` strict gate. Reports median table in job summary (markdown table of class × metrics).
  - Scheduled / manual: full suite (all 7+v0.2.0 classes) on `schedule: cron 0 3 * * *` (or `workflow_dispatch` fallback if org blocks cron) on `ubuntu-latest` only (host variance controlled by median; no Windows+POSIX matrix for perf). Uploads `benchmarks/results/<sha>.json` artifact + generates `benchmarks/report.md` markdown report. Both attached as PR comments when workflow is triggered manually.
  - Evidence format: `benchmarks/results/<date>-<sha>.json` mirrors existing schema but with deterministic key order and `machine` block.

- **Docs & schemas:**
  - Expand `docs/reference/benchmarks.md` with thresholds policy (multiplier vs absolute), baseline update process, and metric definitions (including new `policyMs`, `doctorMs`, `readinessMs`).
  - Update `benchmarks/README.md` with expanded class table and new running modes.
  - JSON schemas for results/baselines/thresholds if not already present (strict, `additionalProperties: false`).

## Out of scope

- Absolute-ms gates (rejected per ADR-0022 — runner variance on GitHub Actions is too high); thresholds are multipliers only.
- External bench providers (e.g., `codspeed`, `bencher`) — rejected (adds cloud/account/telemetry, violates offline-first).
- `vitest bench` microbenchmarks — bench fixtures need real FS + git + workspaces, not in-process micro loops; dedicated `benchmarks/run.mjs` is the harness.
- Implementing `scoreRepository` or `evaluateRulePack` engine logic itself (owned by TASK-0007 and TASK-0011); this task only *calls* them via harness and records timing.
- Changing `package.json` version (still `0.1.1`) or `release.yml` publish path.
- Windows+POSIX perf matrix (perf measured only on `ubuntu-latest`; cross-platform correctness already covered by fs/instruction tests).
- New runtime dependencies for benchmarking (no `benchmark`, `clinic`, `0x`); stdlib only (`node:perf_hooks`, `node:fs`, `node:os`, `process.memoryUsage`).

## Technical design

### Fixtures: 7 classes (REQ-V020-I-001, ADR-0022 §1)

| Class | Spec | Rationale |
|---|---|---|
| `small` | 100 files | PR advisory baseline, fast (<50ms) |
| `medium` | 1k files | PR advisory, moderate |
| `large` | 5k files | Release gate, stress |
| `large-monorepo` | 3 workspaces × 1.5k = 4.5k + shared `node_modules` ignored via `.gitignore` | Monorepo scoping perf |
| `deep-graph` | 50 nested `AGENTS.md` levels + 100 copilot `.instructions.md` (verify `maxNodes` limit) | Graph depth, `maxNodes` diagnostic |
| `large-tasks` | 200 tasks under `docs/tasks/active/` (generated markdown, `schemaVersion: 2`) | Task hydration cost |
| `large-rulepacks` | 100 declarative rules (pack size limit 200, split `1×100 + 1×100`) | Policy evaluation cost |

- **Determinism contract:** generator uses seeded `xorshift32` (`seed 0xACK1`), not `Math.random`. Implementation:

  ```js
  function xorshift32(seed) {
    let x = seed >>> 0 || 0xACK1;
    return () => {
      x ^= x << 13; x >>>= 0;
      x ^= x >>> 17; x >>>= 0;
      x ^= x << 5;  x >>>= 0;
      return (x >>> 0) / 4294967296;
    };
  }
  ```

  Per-class stream seeded as `0xACK1 ^ hash(className)` where `hash` is FNV-1a (existing) to keep class isolation. All file writes in lexicographic order (dirs sorted, files sorted, frontmatter keys sorted). Two generator runs produce byte-identical sets: verified via `hashFiles` = sorted SHA-256 of `relativePath + NUL + contentHash`.

- **Output locations:** `benchmarks/.tmp/<class>/` ephemeral (cleaned after harness run) or `benchmarks/fixtures/<class>.tar` when `--archive` passed. Harness always generates into an OS `mkdtemp` isolated dir (`fs.mkdtempSync(os.tmpdir() + "/ackit-bench-")`) and removes after.

- **Complexity guards:** before generation, assert `expectedFiles <50000` and `expectedBytes <100MB` per class; after generation, assert `actualFiles` within ±1% of spec and total bytes within budget; otherwise emit `BENCH-LIMIT` diagnostic (stderr) and exit 2.

### Harness: `benchmarks/run.mjs` (REQ-V020-I-002, ADR-0022 §2)

- **Phases per run (per class, sequential):**
  1. `coldScanMs` — `runScan(root)` with cold `Map` cache (fresh `lru` or empty) after `gc()` if available; `performance.now()` wall clock; process-wide `peakRssMb` sample before+after.
  2. `warmScanMs` — same scan immediately after (cache hot).
  3. `incrementalMs` — `runScan(root, { filterPaths: Set([oneChangedFile]) })` where changed file is deterministically the lexicographically first file; measures discovery + filter + evaluation of delta set.
  4. `graphMs` — `buildInstructionGraph(root)` only.
  5. `packMs` — `buildContextPack(root, { format: "json", maxTokens: 50000 })` (REQ specifies 50k, not legacy 200k).
  6. `policyMs` — `loadAckitConfig` + `evaluateRulePack` / effective policy resolution (if `policyMs` not yet wired, stub timing with diagnostic `BENCH-POLICY-STUB`).
  7. `doctorMs` — `doctor` diagnostics collection (via SDK `doctor()` or CLI seam).
  8. `readinessMs` — `scoreRepository({ scanResult, graph, pack, policy })` on already-built inputs (pure, should be <5ms; still measured).
  9. `peakRssMb` — high-water mark: start a `setInterval(() => peakRss = Math.max(peakRss, process.memoryUsage().rss / 1e6), 10)` before cold scan and clear after readiness.
  10. `cacheHitRatio` — `hits / evalCount` from cache stats (if cache not instrumented, derive `1 - 1/totalFiles` as legacy approximation with `TODO`).
  11. `filesPerSec` — `totalFiles / warmScanMs * 1000`.

- **Variance handling:** by default `--runs 3 --warmup 1` → run 4 times, discard first warmup, median of remaining 3 (median per metric, not average). PR quick mode uses `--runs 1 --warmup 0`. Isolated temp dir per run (copy fixtures or regenerated). Warmed file cache = second scan in same process counts as warm; cold scan is the first scan after temp dir creation.

- **Output:** `benchmarks/results/<date>-<sha>.json`:

  ```json
  {
    "schemaVersion": "ackit.bench.v0",
    "date": "2026-08-27",
    "sha": "abc1234",
    "machine": { "platform": "linux", "cpus": 4, "model": "…", "node": "v22.0.0" },
    "config": { "runs": 3, "warmup": 1, "budget": 50000, "classes": ["small","medium"] },
    "results": {
      "small": { "files": 100, "coldScanMs": 12.3, "warmScanMs": 6.1, "incrementalMs": 2.4, "graphMs": 1.1, "packMs": 5.5, "policyMs": 2.0, "doctorMs": 3.1, "readinessMs": 0.8, "peakRssMb": 62.1, "filesPerSec": 16393, "cacheHitRatio": 0.99 }
    }
  }
  ```

  Keys sorted deterministically; generator caps and diagnostics included as `diagnostics: [{code:"BENCH-LIMIT", ...}]` if any.

- **Thresholds (`benchmarks/thresholds.json`):**

  ```json
  {
    "$comment": "Multipliers, not absolute ms — default 1.5 = +50% over baseline",
    "defaultMultiplier": 1.5,
    "perClass": {
      "large-monorepo": { "incrementalMs": 1.8 },
      "large-rulepacks": { "policyMs": 1.7 }
    }
  }
  ```

  Baseline storage: `benchmarks/baselines/<class>.json` (one per class), each pinned with `sha` of commit that recorded it (first write after merge). Example `benchmarks/baselines/small.json` → same shape as `results` entry but wrapped with `baseline: { sha, date }`.

- **`benchmarks/check-thresholds.mjs`:** loads results JSON + baselines + thresholds; for each `class × metric` computes `allowed = baseline[metric] * (perClass[class][metric] ?? defaultMultiplier)`; if `observed > allowed` → emit `BENCH-REGRESSION: <class>.<metric> observed=… baseline=… allowed=… multiplier=…` to stderr and exit 1. First breach with ≤10% over allowed is reported as `BENCH-SOFT-BREACH` (stderr) but still exits 0 in PR advisory mode (`--soft 0.10 --advisory`); scheduled full suite uses strict exit 1. Missing baseline → `BENCH-NO-BASELINE` exit 2.

### CI (REQ-V020-I-003, ADR-0022 §4)

```yaml
# .github/workflows/ci.yml addition (or benchmarks.yml)
jobs:
  benchmark-advisory:
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v4 # pinned SHA
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - run: node benchmarks/run.mjs --classes small,medium --out /tmp/bench --runs 1
      - run: node benchmarks/check-thresholds.mjs --results /tmp/bench/*.json --advisory --soft 0.10
      # summary table to $GITHUB_STEP_SUMMARY
```

```yaml
# .github/workflows/benchmarks.yml (scheduled)
on:
  schedule: [{ cron: "0 3 * * *" }]
  workflow_dispatch: {}
jobs:
  benchmark-full:
    runs-on: ubuntu-latest # single runner, no matrix
    steps:
      - uses: actions/checkout@v4
      - run: pnpm build
      - run: node benchmarks/run.mjs --out benchmarks/results --runs 3
      - run: node benchmarks/check-thresholds.mjs --results benchmarks/results/*.json
      - run: node benchmarks/report.mjs --results benchmarks/results/*.json --out benchmarks/report.md
      - uses: actions/upload-artifact@v4
        with: { name: "benchmarks-${{ github.sha }}", path: "benchmarks/results/*.json\nbenchmarks/report.md" }
```

- Artifact path: `benchmarks/results/<date>-<sha>.json` + `benchmarks/report.md` markdown table (class × all metrics + pass/fail vs multiplier).
- No flaky absolute-ms gates: thresholds are multipliers (e.g., cold scan < baseline ×1.5), not `coldScanMs < 200`. Release readiness task (REQ-V020-I-003) archives final `report.md` and records `benchmark 0.2.0: OK, multipliers within thresholds (or recorded justification)`.

## User-facing behavior

```powershell
# Generate fixtures alone (optional; run.mjs regenerates per class by default)
node benchmarks/generate-fixtures.mjs
node benchmarks/generate-fixtures.mjs --out ./my-fixtures --classes small,medium,large

# Run harness — quick PR advisory subset
node benchmarks/run.mjs --classes small,medium --out /tmp/bench --runs 1
# → /tmp/bench/2026-08-27-abc1234.json with 8 metrics per class

# Run full suite (scheduled)
node benchmarks/run.mjs --out benchmarks/results --runs 3
# → benchmarks/results/2026-08-27-abc1234.json + benchmarks/report.md

# Check thresholds (CI)
node benchmarks/check-thresholds.mjs --results benchmarks/results/2026-08-27-abc1234.json
# exit 0 pass, exit 1 BENCH-REGRESSION, exit 2 config/baseline missing

# Advisory soft mode (PR — first breach ≤10% is warning not failure)
node benchmarks/check-thresholds.mjs --results /tmp/bench/*.json --advisory --soft 0.10
```

- Machine output to stdout is pure JSON (results JSON or median table JSON with `--json`); diagnostics to stderr (`BENCH-REGRESSION`, `BENCH-LIMIT`, `BENCH-SOFT-BREACH`).
- No `ackit` CLI subcommand is added; benchmarks are `node benchmarks/*.mjs` scripts (documented in `docs/reference/benchmarks.md` and `benchmarks/README.md`).

## Security

- **No secret/absolute-path leakage:** results JSON contains only repo-relative `class` names and numeric metrics; `machine` block contains `platform`, `cpus`, `model`, `node` only (no absolute paths, no env vars). Verified by grep gate: `grep -R "process.env" benchmarks/` must be 0 except `process.memoryUsage`.
- **No network:** `generate-fixtures.mjs`, `run.mjs`, `check-thresholds.mjs` make no network calls (`fetch`, `http`, `https` absent); offline-first preserved. CI workflow pins actions to SHAs.
- **Path containment:** generator `outDir` is resolved vs `benchmarks/` root; `--out` outside repo is denied unless explicit `--allow-outside` (not exposed); `rmSync` only under temp dir (never `rm -rf /`).
- **Size limits enforce denial-of-service guard:** generator caps (`<50k files, <100MB per class`) prevent exhaustive FS fill; `check-thresholds.mjs` caps pattern length not applicable but file reads are bounded.
- **No executable plugin code:** rule-pack count test uses declarative fixtures only.

## Performance

- Generator for `large` (5k) must complete in <2 s on CI (sequential `writeFileSync` with seeded content, sorted).
- Harness overhead: harness scaffolding adds ≤10ms beyond measured phases; `peakRssMb` sampling (10ms interval) adds ≤1% wall clock.
- `small` class `warmScanMs` expected <20ms on CI; threshold multipliers (1.5) absorb host variance; absolute gates are forbidden.
- Dashboard/report impact: none (benchmarks are offline scripts).

## Compatibility

- Node `>=22` only (LTS); uses `node:perf_hooks`, `process.memoryUsage`, `fs.mkdtempSync`, `import()` dynamic ESM, no optional native deps.
- Windows/macOS/Linux: all paths POSIX-normalized (`path.relative(...).split(path.sep).join("/")`); seeded output identical across platforms (no `Date.now` in fixtures, no platform-dependent sort).
- ESM-only (`"type": "module"`); scripts invoked via `node benchmarks/*.mjs` (not via `pnpm bench` alias that might differ).
- Backward compat: existing `thresholds.json` `defaultMultiplier: 3.0` migrates to `1.5` with a `CHANGELOG` note; old `small: {coldScanMs:6}` overrides removed or kept as deprecated with comment. Existing `results/baseline-*.json` remain readable; new baselines per-class under `benchmarks/baselines/` are additive.

## Acceptance criteria

- [ ] `benchmarks/generate-fixtures.mjs` generates all 7 v0.2.0 classes with file counts within ±1% of spec: `small` 100, `medium` 1k, `large` 5k, `large-monorepo` 3×1.5k (4.5k) + ignored `node_modules`, `deep-graph` 50 nested AGENTS + 100 copilot instructions, `large-tasks` 200, `large-rulepacks` 100. Running generator twice into two temp dirs produces byte-identical sets (`hashFiles` diff 0) — proven by `tests/e2e/benchmarks/benchmarks.test.ts` fixture determinism test (wired to new classes and remains green).
- [ ] Generator uses `xorshift32` seeded `0xACK1` (grep `xorshift32` and `0xACK1` in `generate-fixtures.mjs`) and produces sorted output (all `readdir` and generation loops sorted); `binary-heavy` retained for classification benchmark (200×5MB or documented size migration).
- [ ] Generator complexity limits enforced: `large` cap `<50k files, <100MB per class`; hitting a cap emits diagnostic `BENCH-LIMIT` and exits non-zero (tested via synthetic cap fixture).
- [ ] `benchmarks/run.mjs --classes small,medium --out /tmp/out` produces results JSON containing all 8+ metrics per class: `coldScanMs`, `warmScanMs`, `incrementalMs`, `peakRssMb`, `filesPerSec`, `packMs`, `graphMs`, `cacheHitRatio` all `>0`; plus `policyMs`, `doctorMs`, `readinessMs` present (or `BENCH-POLICY-STUB` diagnostic if engine not yet wired). `packMs` uses 50k token budget (assert `maxTokens === 50000` in code).
- [ ] Harness implements median-of-3 runs with one warmup discarded, isolated temp dir per run, `gc()` forced when `--expose-gc`, `process.cpuUsage` also recorded for diagnostics (not gated). Proof: `--runs 3` produces 4 invocations with first discarded; median table logged; temp dirs listed as `mkdtemp` under `os.tmpdir`.
- [ ] `benchmarks/thresholds.json` has `defaultMultiplier: 1.5` and `perClass` overrides `large-monorepo: { incrementalMs: 1.8 }`, `large-rulepacks: { policyMs: 1.7 }` (or superset with justification comment). No absolute-ms gates.
- [ ] Baselines stored as committed `benchmarks/baselines/<class>.json` (one per class) pinned to a recorded master SHA; first baseline SHA recorded in file `sha` field.
- [ ] `benchmarks/check-thresholds.mjs` exists and fails CI with `BENCH-REGRESSION` when any `observed > baseline * multiplier`; soft advisory mode (`--advisory --soft 0.10`) exits 0 on first ≤10% breach (warning). Exit codes stable: 0 pass, 1 regression, 2 missing baseline/config.
- [ ] CI: PR quick subset (`small,medium`) as advisory non-blocking job `benchmark-advisory` added to `.github/workflows/ci.yml` (or new `benchmarks.yml`) running `--classes small,medium` with median 1-run, no `cacheHitRatio` strict gate, reports median table in job summary (`$GITHUB_STEP_SUMMARY`). Scheduled/manual full suite (all classes) defined with `workflow_dispatch` fallback, uploads `benchmarks/results/<sha>.json` artifact + `benchmarks/report.md`; both attached as artifact.
- [ ] No flaky absolute-ms gates remain: grep `thresholds.json` contains no absolute `maxMs` outside multipliers; docs state thresholds are multipliers (`cold scan < baseline ×1.5`).
- [ ] `pnpm lint`, `pnpm format:check`, `pnpm typecheck` green for `benchmarks/*.mjs` (or lint scope excludes `.mjs` but `node --check` passes); `pnpm test` green including `tests/e2e/benchmarks/benchmarks.test.ts` (determinism + 8-metric contract).

## Tests

- **Integration — fixture determinism (existing, extended):** `tests/e2e/benchmarks/benchmarks.test.ts` first test generates into two temp dirs and asserts sorted file lists and sizes identical; extend to assert `xorshift32` seed `0xACK1` appears in `generate-fixtures.mjs` and that new classes `large-monorepo`, `deep-graph`, `large-tasks`, `large-rulepacks` each have correct file counts (±1%).
- **Contract — 8-metric harness:** second test runs `run.mjs --classes small --out <tmp>` and asserts `coldScanMs`, `warmScanMs`, `incrementalMs`, `peakRssMb`, `filesPerSec`, `packMs`, `graphMs`, `cacheHitRatio` all `>0`; add assertions for `policyMs`, `doctorMs`, `readinessMs` (or stub diagnostic present).
- **Contract — threshold mechanism:** third test asserts `thresholds.json` `defaultMultiplier === 1.5`, `perClass["large-monorepo"].incrementalMs === 1.8`, `perClass["large-rulepacks"].policyMs === 1.7`, all multipliers `>=1`.
- **Integration — median variance handling:** run `run.mjs --classes small --runs 3 --warmup 1` and assert output `config.runs === 3` and median computed (result JSON stable across two invocations within multiplier 1.5, not absolute).
- **Unit — `check-thresholds.mjs`:** synthetic results JSON with `observed = baseline * 2.0` → `check-thresholds.mjs` exits 1 with `BENCH-REGRESSION`; `observed = baseline * 1.03` with `--advisory --soft 0.10` → exits 0 with `BENCH-SOFT-BREACH`; missing baseline → exits 2 `BENCH-NO-BASELINE`.
- **Unit — complexity limits:** generator invoked with synthetic spec exceeding `<50k/<100MB` cap emits `BENCH-LIMIT`.
- **CI-config:** `benchmark-advisory` job exists in workflow YAML and is advisory (no `needs` gate that blocks merge); `benchmarks.yml` scheduled job exists with `workflow_dispatch` fallback and artifact upload.
- **Cross-platform:** same `toPosix` normalization on win32 path; fixture determinism holds on `win32` and `linux`.

## Documentation

- **Update `docs/reference/benchmarks.md`:** expand with thresholds policy (multiplier vs absolute), baseline storage (`benchmarks/baselines/<class>.json` pinned SHA, update-via-PR process), full metric definitions (`coldScanMs`, `warmScanMs`, `incrementalMs`, `graphMs`, `packMs` 50k, `policyMs`, `doctorMs`, `readinessMs`, `peakRssMb`, `cacheHitRatio`, `filesPerSec`), complexity limits, running modes (quick vs full), no-flaky-gate rationale.
- **Update `benchmarks/README.md`:** expanded class table (7+1 classes with counts), seeded RNG (`xorshift32` `0xACK1` sorted output), harness flags (`--classes`, `--out`, `--runs`, `--warmup`, `--budget`), `check-thresholds.mjs` usage, CI jobs description.
- **Update `docs/v0.2.0/REQUIREMENTS.md` trace:** REQ-V020-I-001..003 remain `TASK-0015` (this task is TASK-0018 in active numbering — record alias `TASK-0018 ≙ TASK-0015 (TRACEABILITY)` in completion notes).
- **Keep `docs/decisions/ADR-0022-benchmark-and-regression-policy.md`:** no change (already normative); task cites it.

## Evidence

Record (copy exact outputs into completion notes):

- `node benchmarks/generate-fixtures.mjs --out /tmp/bench-fixtures` log + `hashFiles` determinism proof (two runs diff 0, file counts table).
- `node benchmarks/run.mjs --classes small,medium --out /tmp/bench --runs 1` output log + produced JSON path + median table (`cat /tmp/bench/*.json | jq .results`).
- Full suite run: `node benchmarks/run.mjs --out benchmarks/results --runs 3` log + generated `benchmarks/results/<date>-<sha>.json` + `benchmarks/report.md` preview (first 20 lines).
- `node benchmarks/check-thresholds.mjs --results ...` pass log; plus synthetic regression fixture showing `BENCH-REGRESSION` (expected failure) and `--advisory --soft 0.10` soft-breach log.
- `benchmarks/thresholds.json` cat + `benchmarks/baselines/*.json` listing (`ls -R benchmarks/baselines`).
- Workflow file excerpts: `grep -n benchmark .github/workflows/ci.yml` or `cat .github/workflows/benchmarks.yml` showing `benchmark-advisory` and scheduled jobs, `workflow_dispatch` fallback.
- `pnpm test` green (files+tests, including `tests/e2e/benchmarks/benchmarks.test.ts`), `pnpm typecheck` green, `pnpm lint` / `pnpm format:check` green (or `node --check benchmarks/*.mjs`).
- `grep -R "xorshift32" benchmarks/` + `grep -R "0xACK1" benchmarks/` proofs.

## Completion gate

No `--force`. Dependencies `TASK-0013` must be `completed` before start (SDK frozen). Task not `completed` until: `tests/e2e/benchmarks/benchmarks.test.ts` green for determinism + 8+ metrics, `thresholds.json` `defaultMultiplier === 1.5` with per-class overrides present, `benchmarks/baselines/<class>.json` committed and pinned, `check-thresholds.mjs` emits `BENCH-REGRESSION` on synthetic breach and passes on real run, CI `benchmark-advisory` (PR quick `small,medium` non-blocking) and scheduled full jobs exist with artifact upload. Next tasks (`TASK-0024` release readiness) require this gate.

## Requirement IDs

REQ-V020-I-001, REQ-V020-I-002, REQ-V020-I-003

## Related ADRs

ADR-0022 — Performance Benchmark / Regression Policy (normative)
ADR-0015 — v0.2.0 Consolidated Release Architecture
ADR-0023 — Multi-Artifact Version / Release Strategy
