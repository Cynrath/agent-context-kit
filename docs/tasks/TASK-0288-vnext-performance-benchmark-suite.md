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

- [ ] All 7 fixture classes generate deterministically via script.
- [ ] All 8 metrics collected per class; results table committed.
- [ ] Threshold mechanism exists and demonstrates pass on baseline; deliberate 10% regression demo documented then reverted.
- [ ] No correctness/security shortcut introduced for speed (code review note).

## Test steps

Benchmark run commands recorded; deterministic fixture generation asserted.

## Risks

Noisy CI timing → benchmarks advisory in CI, strict locally; noted in docs.

## Rollback plan

Focused commit.

## Completion notes

(placeholder)
