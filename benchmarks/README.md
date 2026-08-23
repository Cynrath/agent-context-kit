# Benchmarks

Measured performance baselines (REQ-PERF-001). Numbers come exclusively from
`run.mjs` executions; nothing here is marketing copy.

## Metric definitions

| Metric | Meaning |
|---|---|
| coldScanMs | first full scan of the class fixture in this process |
| warmScanMs | second scan, modules + fs cache hot |
| incrementalMs | discovery + filter to one changed file + evaluation |
| peakRssMb | max RSS observed across phases (process-wide) |
| filesPerSec | warm throughput = files / warmScanMs·1000 |
| packMs | `buildContextPack(format json, budget 200k)` |
| graphMs | `buildInstructionGraph` |
| cacheHitRatio | 1 − changedFiles/totalFiles for the incremental pass |

## Fixture classes

small · medium · large · monorepo (pnpm) · instruction-heavy · skill-heavy ·
binary-heavy — all generated deterministically by `generate-fixtures.mjs`
(seeded PRNG); two generations are byte-identical (contract-tested).

## Running

```bash
pnpm build
node benchmarks/generate-fixtures.mjs   # optional; run.mjs regenerates per class
node benchmarks/run.mjs                 # all classes → benchmarks/results/baseline-<date>.json
node benchmarks/run.mjs --classes small,medium
```

## Regression thresholds

`thresholds.json` holds advisory multipliers vs the committed baseline.
CI treats breaches as warnings (timing noise across shared runners); local
runs may enforce strictly. The mechanism is contract-tested via the small
class self-comparison.

## Machine context for the committed baseline

See `results/baseline-*.json` header (`machine` block). Baseline recorded on
the development machine: Windows 11, AMD Ryzen 9, NVMe SSD, Node 24 — treat
cross-machine comparisons as directional only.
