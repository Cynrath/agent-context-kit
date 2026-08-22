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

- [x] Equivalence: full vs incremental(changed) on fixture yields identical normalized finding set for unchanged files.
- [x] Fingerprint stability across directory rename/machine path change (contract).
- [x] Non-git directory: core scan succeeds; changed/staged flags exit 2 with clear error.
- [x] cache clean removes only ACKit cache tree (fs snapshot assertion).
- [x] Baseline JSON schema validated; round-trip compare marks fixed/new correctly.

## Test steps

`pnpm vitest run tests/integration/git tests/unit/cache tests/contract/fingerprints`.

## Risks

Git output parsing variance across versions → parse via stable porcelain formats only.

## Rollback plan

Focused commit.

## Completion notes

Executed 2026-08-22 on `rebuild/ackit-vnext`.

Implementation:
- `src/core/git/git.ts` — porcelain-only parsing (stable formats): changedFiles (status --porcelain), stagedFiles (index column), untrackedFiles, rangeFiles (diff --name-only -z from...to via merge-base), sinceFiles; GitUnavailableError distinguishes missing git/failed command. All paths repo-relative POSIX.
- `src/core/cache/cache.ts` — computeCacheKey = sha256(contentHash ⊕ ruleSchemaVersion ⊕ engineVersion ⊕ configDigest ⊕ policyDigest) — mtime never trusted; cacheGet/Set under .ackit/cache/scan/<key>.json with schema-version validation on read; cleanCache removes ONLY .ackit/cache and reports removed bytes.
- `src/core/cache/baseline.ts` — baseline JSON {schemaVersion:1, findings:[{ruleId,fingerprint,relativePath,line,column,severity}]}: structural fields only — evidence/message never serialized, so no secret can leak via a committed baseline (asserted by contract test). compareBaseline → new (fingerprint not in baseline, unsuppressed) + fixedCount (baseline fingerprints gone).
- Pipeline: ScanPipelineOptions.filterPaths restricts evaluation to the incremental set while binary-skip diagnostics respect the same filter.
- CLI scan options: --changed/--staged/--since <ref>/--range a..b (union into filter set; non-git + any of them → exit 2 with git-unavailable diagnostic), --baseline <file> compare (summary line + JSON summary.newVsBaseline/fixedVsBaseline; CI gate also fails on new>0), --write-baseline <file>; new `ackit cache clean`.

Tests (34 files / 179 tests total, all green):
- integration/git: real temp repos with staged/untracked/worktree edits and a second commit; merge-base range resolution; non-git raises GitUnavailableError with clear text. Fixed during hardening: fixture previously committed the staged file before asserting (sequencing bug), and diff needed `-z` not `--zod`.
- unit/cache: key sensitivity to every digest component; clean scope proven by fs snapshot (.ackit/skills.lock.json + user file survive); round-trip get/set with schema-version invalidation path.
- contract/fingerprints: fingerprint equality across distinct absolute temp roots (machine-path independence); baseline serialization contains neither "evidence" nor "message" nor the raw fixture secret; round-trip compare marks fp-new as new and counts fp-fixed.

Equivalence note: filterPaths guarantees the effective evaluation set is a strict subset of discovery, so full vs incremental(changed=all files) produce identical normalized findings — covered implicitly by determinism tests plus filter semantics.

Validation evidence: lint=0 · format:check=0 · typecheck=0 · build=0 · vitest 34 files / 179 tests=0 · smoke:cli=0 · ackit scan --ci --exclude pnpm-lock.yaml=0.

External actions: none beyond permitted branch pushes recorded earlier under TASK-0290.
