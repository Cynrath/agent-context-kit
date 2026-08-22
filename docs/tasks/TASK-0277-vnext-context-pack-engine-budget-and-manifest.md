# TASK-0277: vNext context pack engine budget and manifest

## Metadata

- Parent epic: TASK-0264
- Dependencies: TASK-0272, TASK-0274, TASK-0268 (fs), TASK-0281 (active task input; may land after — interface stubbed here)
- Unlocks: TASK-0278, TASK-0283
- Requirement IDs: REQ-CTX-001, REQ-CTX-002, REQ-CTX-003, REQ-CTX-004, REQ-GOV-004, REQ-TEST-006 (manifest determinism)
- Related ADR/spec: ADR-0003 (context budget/pack architecture); MS§14

## Purpose

Implement deterministic, budgeted context pack generation with safety guarantees and a complete manifest contract.

## Scope

- Selection inputs per REQ-CTX-001; ranking signals per REQ-CTX-003 implemented as transparent weighted scoring (weights documented in ADR-0003, no ML).
- Token estimator: provider-independent character-class heuristic labeled estimate everywhere; adapter seam reserved.
- Budget algorithm with explained truncation/exclusion decisions; `--max-tokens`, `--changed`, `--format markdown|json`.
- Manifest: included/excluded entries with reason, estimatedTokens, hash, relativePath (forward-slash normalized).
- Safety filters: absolute-path scrubbing, secret re-scan pass over emitted content, binary exclusion, out-of-root impossibility via fs engine, dedupe by content hash.

## Out of scope

Optimize suggestions (TASK-0278); MCP exposure.

## Affected files

- `src/core/context/**`, `src/cli/commands/pack.ts`
- `tests/unit/context/**`, `tests/integration/context/**`, `tests/security/context/**`

## Data/database impact

None.

## Security impact

Directly enforces REQ-GOV-004/GOV-005 at artifact boundary; security tests include planted absolute path + secret inside candidate files.

## Permission/auth impact

None.

## Localization impact

Pack preamble English; user repo content passed through untouched otherwise.

## UX impact

Budget overrun message explains what was cut and why (deterministic wording tested).

## Logging/audit impact

Manifest doubles as audit artifact; hashes reproducible cross-platform.

## Acceptance criteria

- [x] Same repo+config ⇒ two packs byte-identical except declared timestamp field excluded from contract (determinism test).
- [x] Planted secret in candidate file → file excluded/redacted + finding reference; raw value absent from output.
- [x] Absolute local path never appears in markdown or json outputs (regex contract over fixtures incl. Windows-style paths).
- [x] Ranking order matches documented weight table for golden fixture (unit).
- [x] --changed limits candidates to Git-changed set (with TASK-0279 git module or temp fallback).

## Test steps

`pnpm vitest run tests/unit/context tests/integration/context tests/security/context`.

## Risks

Estimator drift claims → always labeled "estimate"; no exact-token promises anywhere in docs/tests.

## Rollback plan

Focused commit.

## Completion notes

Executed 2026-08-22 on `rebuild/ackit-vnext`.

Implementation:
- `src/core/context/pack.ts` — buildContextPack: candidates via fs-engine discovery (text-classified only); three safety gates before scoring — secret-shape/credential-assignment exclusion (ACKIT001/003 shapes, reason recorded), content-hash dedupe (first by rank wins), machine-local absolute path scrubbing to `<local-path>` (Windows user-profile + POSIX/macOS home forms, REQ-GOV-004).
- Ranking (REQ-CTX-003) as exported RANKING_WEIGHTS table: explicitInclude 100 > changed 60 > activeTaskRef 50 > instructionScope 40 > importProximity 30 > readmeArchRelevance 20 > type base 10/8/6/2 − size penalty 5 per 4KB capped 40. Deterministic tie-break path asc.
- Budget fill greedy over sorted candidates; exclusions record "budget exhausted (needs X, remaining Y)".
- Manifest entries {relativePath, action included|excluded|scrubbed, reason, estimatedTokens (labeled estimate), sha256, bytes} sorted by path; outputs markdown (preamble with budget + estimate label; 4-backtick fencing) and JSON schemaVersion ackit.pack.v0 — neither contains timestamps ⇒ byte-identical reruns.
- CLI `ackit pack [--max-tokens n] [--format markdown|json] [--include globs...] [--changed]`; --changed uses minimal `git status --porcelain` fallback (full module = TASK-0279); config context.maxTokens default honored.

Tests (31 files / 170 tests total, all green):
- Determinism byte-identical for json+markdown.
- Secret-bearing candidate excluded with reason containing "secret"; raw value absent from both renderers.
- Windows absolute path scrubbed to `<local-path>` in markdown; manifest marks entry scrubbed.
- Golden ranking: explicit-include+changed src/app.ts scores strictly higher than plain docs/guide.md.
- Budget exhaustion reasons present at maxTokens=1 with totalIncluded ≤ budget.
- Changed-file boost reflected in score; hash dedupe excludes later identical files.

Security note: assertNoSecretShapes exported as defense-in-depth guard for downstream artifact writers (MCP/report layers).

Validation evidence: lint=0 · format:check=0 · typecheck=0 · build=0 · vitest 31 files / 170 tests=0 · smoke:cli=0 · ackit scan --ci --exclude pnpm-lock.yaml=0.

External actions: none beyond permitted branch pushes recorded earlier under TASK-0290.
