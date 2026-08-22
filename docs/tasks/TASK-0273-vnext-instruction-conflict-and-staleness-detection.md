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

- [ ] MS§8.5 canonical example (AGENTS.md pnpm vs CLAUDE.md npm) produces instruction-conflict finding deterministically.
- [ ] Near-duplicate detection tier thresholds unit-tested (exact hash vs normalized similarity).
- [ ] Broken reference fixture yields stale-reference finding with correct path.
- [ ] Hidden Unicode/zero-width fixture flagged advisory; clean file not flagged (no FP regression).
- [ ] No rule emits critical severity without a deterministic-evidence justification comment reviewed in task evidence.

## Test steps

`pnpm vitest run tests/unit/instruction-analysis`.

## Risks

Convention extraction brittleness → conservative pattern set; misses are acceptable, wrong conflicts are not (documented principle).

## Rollback plan

Focused commit.

## Completion notes

(placeholder)
