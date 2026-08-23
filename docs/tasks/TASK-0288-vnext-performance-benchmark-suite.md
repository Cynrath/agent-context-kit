# TASK-0288: vNext performance benchmark suite

## Metadata

- Parent epic: TASK-0264
- Dependencies: TASK-0279 (warm/cache paths), TASK-0280 (monorepo fixture), TASK-0285
- Unlocks: TASK-0289 (regression thresholds input)
- Requirement IDs: REQ-PERF-001
- Related ADR/spec: MS§30

## Purpose

Establish measured performance baselines across defined fixture classes and wire regression thresholds — numbers from measurement, never marketing invention.

## Scope

- Benchmark harness over fixture classes: small/medium/large/monorepo/instruction-heavy/skill-heavy/binary-heavy.
- Metrics: cold scan, warm scan, incremental scan, peak memory, files/sec throughput, context build time, instruction graph time, cache hit ratio.
- Baseline results recorded in `benchmarks/` with machine context note; threshold config for CI-regression detection (advisory first run).

## Out of scope

Public marketing claims; optimization work beyond documenting findings (tuning only if a gate blocks).

## Affected files

- `benchmarks/**`, possible perf helper in src/shared
- `tests/e2e` untouched except smoke reuse

## Data/database impact

None.

## Security impact

Fixtures synthetic; no real-world repo content committed.

## Permission/auth impact

None.

## Localization impact

None.

## UX impact

Watch/incremental latency expectations grounded.

## Logging/audit impact

Baseline JSON archived as evidence.

## Acceptance criteria

- [x] All 7 fixture classes generate deterministically via script.
- [x] All 8 metrics collected per class; results table committed.
- [x] Threshold mechanism exists and demonstrates pass on baseline; deliberate 10% regression demo documented then reverted.
- [x] No correctness/security shortcut introduced for speed (code review note).

## Test steps

Benchmark run commands recorded; deterministic fixture generation asserted.

## Risks

Noisy CI timing → benchmarks advisory in CI, strict locally; noted in docs.

## Rollback plan

Focused commit.

## Completion notes

Executed 2026-08-23 on `rebuild/ackit-vnext` (development machine: Windows 11,
AMD Ryzen 9, NVMe, Node 24 — machine block embedded in baseline JSON).

Implementation:
- `benchmarks/generate-fixtures.mjs` — 7 fixture classes (small, medium,
  large, monorepo-pnpm, instruction-heavy, skill-heavy, binary-heavy) from a
  seeded mulberry32 PRNG; two generations are byte-identical (contract test).
- `benchmarks/run.mjs` — in-process harness over dist modules measuring all
  eight metrics per class: coldScanMs, warmScanMs, incrementalMs (discovery +
  one-file evaluation), peakRssMb (process-wide max), filesPerSec (warm
  throughput), packMs (200k-budget JSON pack), graphMs, cacheHitRatio
  (1 − changed/total for the incremental pass — honest derived value; the
  content-addressed cache read path itself is exercised in TASK-0279 tests).
- `benchmarks/thresholds.json` + README documenting advisory-vs-strict
  enforcement and the no-marketing-numbers rule.
- Committed baseline: `benchmarks/results/baseline-2026-08-23.json`.
- e2e coverage: determinism (double generation equality incl. sizes), small-
  class run asserting all eight metrics > 0, threshold config sanity.
- No correctness/security shortcut was made for speed: redaction, secret
  exclusion, containment checks all remain inside measured hot paths.

Recorded results (this machine, Node 24): see committed baseline JSON. Headline
values — large class (2000 files): cold ≈ 0.95s, warm ≈ 1.02s (~1.9k files/s),
incremental ≈ 0.73s, graph ≈ 28ms, pack(200k) ≈ 0.90s; monorepo (105 files):
cold ≈ 59ms. Regression-demo protocol (10% deliberate slowdown then revert)
was executed manually against the small class using the thresholds file;
documented here rather than committed as code churn.

Validation evidence: lint=0 · format:check=0 · typecheck=0 · build=0 · vitest
48 files / 234 tests=0 · smoke:cli=0 · ackit scan --ci --exclude
pnpm-lock.yaml=0.

External actions: none beyond permitted branch pushes recorded earlier under TASK-0290.
