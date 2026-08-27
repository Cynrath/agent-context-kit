# ADR-0022: Performance Benchmark / Regression Policy

Status: Accepted · Date: 2026-08-27

## Context

EPIC I requires a deterministic benchmark system with fixture classes (small/medium/large/large monorepo/deep graph/large task set/large rule-pack set) measuring cold scan, warm scan, incremental scan, instruction graph, context pack, policy/rules, doctor, memory/RSS, cache hit ratio, etc. The existing bench (`benchmarks/generate-fixtures.mjs`, `benchmarks/run.mjs`, `benchmarks/thresholds.json`, `benchmarks/results/`) shipped in TASK-0288 covers scan/pack/graph/memory but only for scan-adjacent classes. v0.2.0 adds graph depth, rule-pack scale, readiness scoring cost, dashboard/pack API, and cross-platform variance.

## Decision

1. **Fixtures (additive)** — extend `benchmarks/generate-fixtures.mjs` (or add `benchmarks/generate-v020-fixtures.mjs` merged) with deterministic seeded `PRNG (xorshift32, seed 0xACK1)` + sorted output — same repo as before but expanded classes:
   - `small`: 100 files (kept, backward compat)
   - `medium`: 1k
   - `large`: 5k
   - `large-monorepo`: 3 workspaces × 1.5k = 4.5k + shared node_modules ignored
   - `deep-graph`: 50 nested `AGENTS.md` levels + 100 copilot `.instructions.md` (verify `maxNodes` limit)
   - `large-tasks`: 200 tasks under `docs/tasks/active/` (generated markdown, schemaVersion 2)
   - `large-rulepacks`: 100 declarative rules (pack size limit 200, split 1×100 + 1×100)
   - `binary-heavy`: 200 × 5MB binary random + 100 text (kept for classification benchmark)

   Each class generated under `benchmarks/.tmp/<class>/` or `benchmarks/fixtures/<class>.tar` archived. Generator run twice produces byte-identical file set (checked via `hashFiles`).

2. **Metrics** — `benchmarks/run.mjs` extended:
   - `coldScanMs` (no cache), `warmScanMs` (cache populated), `incrementalMs` (1-file changed set), `graphMs` (buildInstructionGraph only), `packMs` (50k token budget), `policyMs` (effective policy + packs), `doctorMs`, `readinessMs` (scoreRepository on already-built inputs), `peakRssMb` (via `process.memoryUsage().rss` high watermark sampling every 10ms), `cacheHitRatio` (hits/eval count), `filesPerSec` (throughput).
   - Runner variance handling: median of 3 runs with one warmup discarded, isolated temp dir per run, `gc()` forced before warm run when `--expose-gc` is available, `process.cpuUsage` also recorded for diagnostics (not gated).
   - Complexity limits: generator caps are asserted (`large` <50k files, <100MB total per class); hitting a cap emits diagnostic `BENCH-LIMIT` and stops.

3. **Thresholds** — `benchmarks/thresholds.json`:
   - Multipliers, not absolute ms. Default multiplier `1.50` (cold/warm/pack/graph/policy: +50% over baseline is a regression). Per-class overrides allowed where variance is higher (e.g., `large-monorepo: { incrementalMs: 1.80 }` for heavier path scoping). Config shape:
     ```json
     { "defaultMultiplier": 1.5
     , "perClass": { "large-monorepo": { "incrementalMs": 1.8 }, "large-rulepacks": { "policyMs": 1.7 } }
     }
     ```
   - Baseline storage: committed file `benchmarks/baselines/<class>.json` pinned to a recorded `master` SHA (first write after merge). The check script `benchmarks/check-thresholds.mjs` fails CI with `BENCH-REGRESSION` when any `observed > baseline * multiplier`. Nightly/scheduled runner updates baseline via PR with ADR note; agents never push baseline silently.

4. **CI integration**:
   - **PR CI**: quick subset (`small`, `medium`) as advisory (non-blocking) job `benchmark-advisory` added to `.github/workflows/ci.yml` (or new `benchmarks.yml`). Runs with `--classes small,medium`, median 1-run, no `cacheHitRatio` strict gate. Reports median table in job summary.
   - **Scheduled / manual**: Windows+POSIX matrix is not needed for perf (only ubuntu measured) — host variance controlled by median. Full suite (all 8 classes) runs on `schedule: cron 0 3 * * *` (or `workflow_dispatch` if org blocks cron) and uploads `benchmarks/results/<sha>.json` artifact + regenerates a markdown `benchmarks/report.md`. Both are attached as PR comments when the workflow is triggered manually.
   - `evidence format`: `benchmarks/results/<date>-<sha>.json` mirrors `bench/results/` schema but with deterministic key order.

5. **No flaky gates**: Thresholds use multipliers with 10% tolerance on first breach (requires two consecutive breaches or manual confirmation for intentional regression). The release readiness task (REQ-V020-I-003) archives the final `report.md` and records `benchmark 0.2.0: OK, multipliers within thresholds (or recorded justification)`.

## Rationale

Deterministic fixtures + median-of-3 + multiplier thresholds give signal without brittle wall-clock failures. Separating quick PR advisory from full scheduled avoids PR latency while preserving release hardening.

## Alternatives considered

- Absolute ms thresholds: rejected — runner variance on GitHub Actions is high.
- External bench provider (e.g., `codspeed`): rejected — would add cloud/account/telemetry dependency, violates offline-first.
- In-process `vitest bench`: considered but bench fixtures need real FS + git + workspaces, not microbenchmarks; dedicated script (`benchmarks/run.mjs`) is cheaper.

## Consequences

- `benchmarks/` files updated: `generate-fixtures.mjs`, `run.mjs`, `check-thresholds.mjs`, `thresholds.json`, `baselines/*.json`, `report.md` template.
- CI workflow: `benchmark-advisory` job added + nightly `benchmarks.yml`.
- Docs: `docs/reference/benchmarks.md` expanded with thresholds policy.

## Related requirements

REQ-V020-I-001..003.

## References

- `benchmarks/` existing suite (TASK-0288)
- `tests/e2e/benchmarks/benchmarks.test.ts` (fixture determinism + 8-metric contract)
