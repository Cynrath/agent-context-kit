# Post-v0.2.2 Maintenance Mode

AgentContextKit is in a stabilization and evidence-gathering phase after `v0.2.2`.

This is not abandonment and it is not a feature freeze forever. The purpose is to let real usage, issues, Discussions, and reproducible benchmark evidence determine the next product work instead of immediately creating a new version roadmap from assumptions.

## Current policy

- Keep `v0.2.2` tag, npm package, GitHub Release, VS Code Marketplace release, and Action release immutable.
- Do not create a new version for documentation, test-only, CI-only, or community-process maintenance.
- Accept narrowly scoped bug fixes when evidence shows a product defect.
- Treat security, data-loss, correctness, offline-first, deterministic-output, release-integrity, and cross-platform regressions as priority maintenance.
- Avoid speculative feature work until enough user evidence exists to justify it.

## Where feedback goes

| Feedback | Preferred channel |
| --- | --- |
| Reproducible product bug | GitHub Issue → Bug report |
| Concrete experience from a real repository | GitHub Issue → Real-world usage feedback |
| Reproducible performance/benchmark evidence | GitHub Issue → Benchmark or performance report |
| Questions, ideas, workflows, comparisons, show-and-tell | GitHub Discussions |
| Documentation defect | GitHub Issue → Documentation improvement |
| Security vulnerability | Private process in `SECURITY.md` / GitHub Security policy |

Do not post secrets, credentials, private source code, raw secret findings, private URLs, or machine-specific absolute paths in public reports.

## Evidence we care about

The maintainer should prioritize repeated evidence rather than raw request count. Useful signals include:

1. The same failure or workflow friction reproduced by multiple independent repositories.
2. A finding category that users consistently mark as noisy, misleading, or high-value.
3. Cross-platform differences across Windows, Linux, and macOS.
4. Measurable regressions in cold/warm/incremental scan time, memory, graph/pack time, or cache behavior.
5. Missing provider/repository patterns that block otherwise normal agent workflows.
6. Security or privacy behavior that violates the documented offline-first contract.

## Benchmark requirements

Canonical public methodology remains `docs/benchmarks/public-evidence.md`.

External benchmark reports should, where practical:

- pin ACKit version;
- pin a public repository commit SHA, or provide sanitized aggregate-only private-repository context;
- record OS, Node version, repository ecosystem, and relevant machine class;
- use median-of-3 or more for performance claims;
- compare tools or versions only under equivalent conditions;
- never publish raw secret findings or private repository content.

## Triage cadence

During maintenance mode, group incoming evidence rather than opening a new implementation task for every suggestion.

A reasonable review pass should classify new reports as:

- `confirmed-product-bug`
- `needs-reproduction`
- `documentation`
- `performance-evidence`
- `workflow-friction`
- `future-product-signal`
- `not-actionable-yet`

Repository labels may differ; these are decision categories, not a requirement to create matching labels.

## Gate for the next product version

Do not start a new feature release merely because time has passed.

Open the next product-version planning cycle when at least one of these conditions is met:

- a repeated real-world problem has enough evidence to justify a coherent feature theme;
- a correctness/security/platform gap requires changes larger than a maintenance patch;
- benchmark evidence identifies a material, reproducible product limitation;
- several independently reported workflow gaps point to the same missing capability.

Before implementation, write a short evidence summary linking the supporting issues/Discussions/benchmarks and explicitly state why the work belongs in a new version rather than maintenance.

## What does not trigger a new release by itself

- lint/format cleanup;
- flaky-test stabilization;
- CI/ruleset hardening;
- typo/documentation-only edits;
- community templates;
- benchmark methodology documentation with no runtime change;
- task/evidence bookkeeping.

The default state after `v0.2.2` is therefore: **stable release, active maintenance, evidence first, no release churn**.
