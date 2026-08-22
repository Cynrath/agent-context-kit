# TASK-0279: vNext git incremental cache and baseline

## Metadata

- Parent epic: TASK-0264
- Dependencies: TASK-0270
- Unlocks: TASK-0284 (watch incremental), TASK-0288 (warm benchmarks)
- Requirement IDs: REQ-BASE-001, REQ-BASE-002, REQ-BASE-003, REQ-BASE-004, REQ-GOV-007, REQ-TEST-006 (fingerprint determinism)
- Related ADR/spec: ADR-0002 area (cache/incremental model per MS§33.11); MS§13

## Purpose

Implement Git-aware incremental scanning, content-based cache, stable fingerprints, and baseline compare/write under `scan` options.

## Scope

- Git module: staged/changed/untracked sets, commit range + merge-base resolution; graceful non-git fallback.
- Scan options: --baseline <file>, --write-baseline, --changed, --staged, --since <ref>, --range a..b.
- Fingerprint: repo-relative semantic tuple (ruleId+normalized path+line anchor+evidence class); machine-path independent contract test across temp-dir renames.
- Cache: key = sha256(content)+ruleVersion+configDigest+policyDigest+engineVersion; store under `.ackit/cache` default; `ackit cache clean` scope-limited with tests proving user files untouched.
- Baseline safety: baseline never stores secret evidence values (asserted).

## Out of scope

Watch loop UX (TASK-0284 consumes APIs).

## Affected files

- `src/core/git/**`, `src/core/cache/**`, scan command options
- `tests/integration/git/**`, `tests/unit/cache/**`, `tests/contract/fingerprints/**`

## Data/database impact

None.

## Security impact

Cache/baseline outputs audited for secret leakage; cache path confined via fs engine.

## Permission/auth impact

None.

## Localization impact

English.

## UX impact

Incremental mode produces identical findings to full scan on same effective set (equivalence test).

## Logging/audit impact

Baseline diff summary = audit of new/fixed findings between runs.

## Acceptance criteria

- [ ] Equivalence: full vs incremental(changed) on fixture yields identical normalized finding set for unchanged files.
- [ ] Fingerprint stability across directory rename/machine path change (contract).
- [ ] Non-git directory: core scan succeeds; changed/staged flags exit 2 with clear error.
- [ ] cache clean removes only ACKit cache tree (fs snapshot assertion).
- [ ] Baseline JSON schema validated; round-trip compare marks fixed/new correctly.

## Test steps

`pnpm vitest run tests/integration/git tests/unit/cache tests/contract/fingerprints`.

## Risks

Git output parsing variance across versions → parse via stable porcelain formats only.

## Rollback plan

Focused commit.

## Completion notes

(placeholder)
