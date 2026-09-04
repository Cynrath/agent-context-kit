---
id: "TASK-0084"
title: "Security adversarial audit and proven-gap repairs"
status: pending
schemaVersion: 2
dependencies:
  - "TASK-0078"
createdAt: "2026-09-04"
completedAt: null
---

## Purpose

Settle the contested MCP path allow-list proposal with evidence, not assumption: run a focused adversarial audit of path containment (absolute path, `../` traversal, symlink escape, Windows junction/case behavior, repo root boundary, MCP read paths) against ACKit's claimed realpath containment, root-escape refusal, read-only MCP, and offline/no-network posture. If a real gap is proven, fix it. If containment already blocks the scenario, record the negative finding and do NOT add redundant configuration.

## Consensus basis

Single-report proposal (MUST in one audit) contested by the product-boundary weighting rule: a new MCP path allow-list must not be accepted without a live source audit. Current claimed posture (realpath containment, root-escape refusal, read-only MCP, offline) is the baseline to attack.

## Scope

- Adversarial matrix, each case executed live against the built CLI/MCP: absolute path inputs, `../` traversal at multiple depths, symlink escape (file + dir), Windows junction/case-insensitivity behavior, repo-root boundary (at root, above root), MCP read-path equivalents of each.
- For each case: ATTACK (exact command/fixture) → RESULT (allowed/refused + exact code/message) → VERDICT (gap or contained, with source line citations).
- Proven gaps only: minimal fix + regression test per gap; re-run the full matrix after each fix.
- Negative findings recorded with the same rigor (what was tried, what blocked it, where).
- Explicit allow-list decision: adopt if and only if the matrix proves containment insufficient; otherwise record why the allow-list is redundant.

## Out of scope

- Preventive allow-list (or any new config surface) without a proven gap.
- MCP mutation/write paths (none exist; MCP stays read-only; out of scope by product boundary).
- Network/telemetry additions; cloud-backed analysis.
- Unrelated hardening beyond the matrix.

## Dependencies

- TASK-0078 (baseline only; audit itself is independent of feature tasks).

## Affected files / expected areas

- Containment/read-path code under `src/core/filesystem/`, MCP server read paths (as the audit finds them)
- `tests/` adversarial suites (per-case attack fixtures + assertions)
- Threat-model/ADR note recording the matrix + allow-list decision
- `docs/` security notes (only what the findings change)

## Acceptance criteria

- [ ] Full attack matrix executed live with ATTACK→RESULT→VERDICT rows and source citations; no case hand-waved.
- [ ] Every proven gap has a minimal fix + regression test; matrix re-run green after fixes.
- [ ] Every contained case has a recorded negative finding; allow-list decision (adopt/reject) follows the evidence.
- [ ] No redundant configuration added on contained findings.
- [ ] Full gates green with counts; offline/scan/hygiene hold; real-gate completion with evidence.

## Test steps

1. `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm build`.
2. Adversarial suites (Windows semantics included), then `pnpm test` (record counts).
3. Manual attack spot-checks against `dist/` CLI for each matrix row (record exit codes/messages).
4. `node scripts/check-offline-egress.mjs`, `scan --ci`, `doctor`, `task doctor`, `git diff --check`.

## Security considerations

- Attack fixtures use synthetic paths/values only; no real user directories touched (isolated temp roots).
- Findings must not include absolute local paths or machine-identifying details in committed artifacts.

## Risks

- Platform-specific escapes (junctions, case folding) not reproducible on all CI OSes → OS-tagged cases + CI matrix coverage where the repo already runs (ubuntu/windows/macos).
- Fix overreach (breaking legitimate workflows) → minimal patches + existing-suite green as gate.

## Rollback plan

- Focused revert on the task branch before merge; after merge, forward fix.

## Completion notes

(placeholder)
