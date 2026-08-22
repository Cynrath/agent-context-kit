# TASK-0273: vNext instruction conflict and staleness detection

## Metadata

- Parent epic: TASK-0264
- Dependencies: TASK-0272
- Unlocks: TASK-0278 (optimize consumes findings)
- Requirement IDs: REQ-INSTR-006, REQ-SCAN-006, REQ-GOV-007
- Related ADR/spec: ADR-0006; MS§8.5, §12.5

## Purpose

Deterministic conflict/duplicate/staleness detection across the instruction graph plus advisory prompt-security checks — strictly no LLM/NLP verdicts.

## Scope

- Structural conflict rules from explicit key/value convention extraction (package manager, test runner, build tool statements) → `instruction-conflict` findings.
- Duplicate/near-duplicate content detection (normalized hashing tiers).
- Staleness: stale references to moved/deleted files, broken imports/reference links, unreachable instructions.
- Advisory security checks per REQ-SCAN-006: hidden Unicode controls, zero-width chars, suspicious external refs, root-escape refs, massive embedded data, leaked absolute paths/secrets patterns in instruction files.
- Strict vs advisory severity separation encoded in rule metadata.

## Out of scope

Auto-fixing (TASK-0278 boundary); semantic "prompt injection" verdicts (explicitly forbidden without deterministic evidence).

## Affected files

- `src/core/instructions/analysis/**`
- `tests/unit/instruction-analysis/**`, security fixtures

## Data/database impact

None.

## Security impact

Prompt-poisoning surface gets deterministic advisory coverage; zero false-critical policy enforced by tests.

## Permission/auth impact

None.

## Localization impact

English findings.

## UX impact

Conflicts like pnpm-vs-npm example from MS§8.5 reproduce exactly in fixture test.

## Logging/audit impact

Findings integrate into standard scan pipeline outputs.

## Acceptance criteria

- [x] MS§8.5 canonical example (AGENTS.md pnpm vs CLAUDE.md npm) produces instruction-conflict finding deterministically.
- [x] Near-duplicate detection tier thresholds unit-tested (exact hash vs normalized similarity).
- [x] Broken reference fixture yields stale-reference finding with correct path.
- [x] Hidden Unicode/zero-width fixture flagged advisory; clean file not flagged (no FP regression).
- [x] No rule emits critical severity without a deterministic-evidence justification comment reviewed in task evidence.

## Test steps

`pnpm vitest run tests/unit/instruction-analysis`.

## Risks

Convention extraction brittleness → conservative pattern set; misses are acceptable, wrong conflicts are not (documented principle).

## Rollback plan

Focused commit.

## Completion notes

Executed 2026-08-22 on `rebuild/ackit-vnext`.

Implementation (`src/core/instructions/analysis/`):
- `analyze.ts` — analyzeInstructions over the instruction graph; rule block ACKIT300..314 mapped to scan categories (instruction-conflict/scope/staleness + hygiene advisories):
  - ACKIT300 convention conflict (high): explicit key/value extraction only — `package manager [:|=] value` and imperative `use|prefer X as the package manager`, value whitelist {pnpm,npm,yarn,bun}; conflicting values across provider nodes reported with both paths. Conservative-pattern principle documented: misses acceptable, wrong conflicts are not.
  - ACKIT301 exact duplicate (medium): sha256 over normalized content (frontmatter stripped, lowercased, punctuation collapsed); ACKIT302 near-duplicate (low): trigram Jaccard ≥ NEAR_DUPLICATE_THRESHOLD (0.9), thresholds exported and unit-tested.
  - ACKIT303 stale/broken reference (medium) from graph status; ACKIT304 unreachable path-specific applyTo glob (low, requires knownFiles input).
  - Advisory security (REQ-SCAN-006): ACKIT310 hidden Unicode controls (medium), ACKIT311 external URL ref (low), ACKIT313 massive embedded data run ≥8192 chars (medium), ACKIT314 credential-style literal in instructions (high — deterministic regex evidence), ACKIT312 root-escape reference (high — structural).
  - No-critical policy enforced structurally: AnalysisSeverity type = "high"|"medium"|"low"; tests assert the tier set explicitly (TS rejects "critical" comparisons).
- CLI integration: findings available via analysis export for TASK-0278 consumption; graph JSON remains the transport.

Tests (27 files / 149 tests total, all green):
- MS§8.5 canonical pnpm-vs-npm fixture → ACKIT300 with both values named, severity high not critical.
- Duplicate tiers: normalization unit checks; engineered exact pair (case/punctuation variants) → 301; engineered near pair (trigram overlap ≥0.9 asserted numerically) → 302.
- Stale reference path assertion; hidden-unicode flagged vs clean-file negative; unreachable glob advisory with knownFiles; credential-literal high finding; suite-wide no-critical assertions.

Validation evidence: lint=0 · format:check=0 · typecheck=0 · build=0 · vitest 27 files / 149 tests=0 · smoke:cli=0 · ackit scan --ci --exclude pnpm-lock.yaml=0.

External actions: none beyond permitted branch pushes recorded earlier under TASK-0290.
