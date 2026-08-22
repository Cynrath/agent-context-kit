# TASK-0280: vNext monorepo workspace detection and model

## Metadata

- Parent epic: TASK-0264
- Dependencies: TASK-0272 (graph scoping), TASK-0269 (config workspaces)
- Unlocks: TASK-0288 (monorepo benchmark fixture)
- Requirement IDs: REQ-MONO-001, REQ-MONO-002, REQ-TEST-002 (monorepo integration)
- Related ADR/spec: ADR-0006; MS§19

## Purpose

First-class workspace support: detection of common JS monorepo layouts plus generic nested package roots, per-workspace resolution of instructions/skills/context/findings, and root-policy inheritance.

## Scope

- Detectors: pnpm-workspace.yaml, npm/yarn workspaces fields, nx.json/turbo.json presence signals, fallback nested package roots — all via lightweight metadata parsing, zero framework deps.
- Workspace model objects: root/name/type + resolved instructions subset, skills subset, context budget override, findings partition.
- Root policy inheritance into workspaces; path-specific instruction semantics explicitly NOT conflated with workspace boundaries (documented + tested distinction).
- Scan/instructions/pack commands accept workspace-aware output partitioning.

## Out of scope

Non-JS ecosystem workspace concepts beyond generic nested roots; Nx/Turbo task-graph execution.

## Affected files

- `src/core/repository/workspaces/**` (or core/workspace), command wiring
- `tests/integration/monorepo/**`, fixtures

## Data/database impact

None.

## Security impact

Workspace roots validated inside canonical repo root (fs engine reuse).

## Permission/auth impact

None.

## Localization impact

English.

## UX impact

Findings/packs carry workspace labels for large-repo readability.

## Logging/audit impact

None new.

## Acceptance criteria

- [ ] Fixture matrix: pnpm/npm/yarn/nx/turbo/nested-roots detected correctly incl. mixed-signal precedence test.
- [ ] Nested AGENTS.md at workspace root resolves to that workspace only (negative assert on sibling).
- [ ] Policy override scoped to one workspace leaves siblings untouched.
- [ ] Pack --max-tokens honors per-workspace budget overrides deterministically.
- [ ] Zero runtime dependency added for detection (package.json diff reviewed in evidence).

## Test steps

`pnpm vitest run tests/integration/monorepo`.

## Risks

Detector false positives on partial files → conservative thresholds + advisory diagnostic.

## Rollback plan

Focused commit.

## Completion notes

(placeholder)
