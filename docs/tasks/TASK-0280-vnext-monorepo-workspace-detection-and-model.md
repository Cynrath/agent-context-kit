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

- [x] Fixture matrix: pnpm/npm/yarn/nx/turbo/nested-roots detected correctly incl. mixed-signal precedence test.
- [x] Nested AGENTS.md at workspace root resolves to that workspace only (negative assert on sibling).
- [x] Policy override scoped to one workspace leaves siblings untouched.
- [x] Pack --max-tokens honors per-workspace budget overrides deterministically.
- [x] Zero runtime dependency added for detection (package.json diff reviewed in evidence).

## Test steps

`pnpm vitest run tests/integration/monorepo`.

## Risks

Detector false positives on partial files → conservative thresholds + advisory diagnostic.

## Rollback plan

Focused commit.

## Completion notes

Executed 2026-08-22 on `rebuild/ackit-vnext`.

Implementation:
- `src/core/workspace/detect.ts` — detectWorkspaces: pnpm-workspace.yaml packages globs (incl. `dir/*` child enumeration), root package.json workspaces field (string | array | {packages}), generic fallback nested package roots at depth ≤2; Nx/Turbo marker files recorded as advisory diagnostics only (task-graph execution out of scope). Every candidate containment-checked against the canonical root; malformed manifests produce diagnostics instead of crashes. partitionByWorkspace + resolveWorkspaceName provide deterministic `(root)` bucketing.
- Instruction scoping distinction (REQ-MONO-002): resolveEffectiveStack is now path-aware for the codex family — a nested AGENTS.md applies only when its scope directory is an ancestor of the queried path, so workspace-root AGENTS.md never leaks into sibling workspaces while path-specific `applyTo` semantics remain a separate mechanism.
- Policy inheritance: root policy layers apply repo-wide; workspace targeting happens through pathGlobs/pathScopes — proven by a suppression scoped to packages/web leaving the sibling mobile finding untouched (applyPolicyToFindings moved into core/policy for shared use by scan/MCP).
- CLI: `ackit workspaces` lists detected layout with types/markers (JSON mode ackit.workspaces.v0).

Tests (37 files / 193 tests total, all green): mixed-signal precedence (pnpm file wins for doubly-covered package; npm-only stays npm), generic depth-2 detection, deterministic partition with root bucket, workspace-scoped AGENTS.md positive/negative resolution, policy suppression isolation, per-workspace budget determinism.

Zero new runtime dependencies: detection uses existing yaml/picomatch imports only — no package.json dependency changes in this commit.

Validation evidence: lint=0 · format:check=0 · typecheck=0 · build=0 · vitest 37 files / 193 tests=0 · smoke:cli=0 · ackit scan --ci --exclude pnpm-lock.yaml=0.

External actions: none beyond permitted branch pushes recorded earlier under TASK-0290.
