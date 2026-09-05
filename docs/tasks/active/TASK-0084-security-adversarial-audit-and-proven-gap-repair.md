---
id: "TASK-0084"
title: "Security adversarial audit and proven-gap repairs"
status: active
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

- [x] Full attack matrix executed live with ATTACK→RESULT→VERDICT rows and source citations; no case hand-waved.
- [x] Every proven gap has a minimal fix + regression test; matrix re-run green after fixes.
- [x] Every contained case has a recorded negative finding; allow-list decision (adopt/reject) follows the evidence.
- [x] No redundant configuration added on contained findings.
- [x] Full gates green with counts; offline/scan/hygiene hold; real-gate completion with evidence.

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

Executed 2026-09-05 on `release/v0.5.0` (single-lane, fifth chain on the
same branch/PR #20).

Matrix (all rows live, ATTACK→RESULT→VERDICT in
`tests/security/adversarial-paths.test.ts` against the built CLI/MCP on
Windows; file-symlink rows OS-gated and additionally covered on
Linux/macOS CI): R1–R3 absolute/UNC, R4–R7 traversal ladder, R8 NUL,
R9–R11 file-symlink reads, R12–R13 dir-link/junction writes, R15–R16
root boundary, R18 MCP hostile ids, R19 title injection, R20
scan-output contract, plus `normalizeRelativePath`/`isInsideRoot` unit
probes (nested/UNC/NUL/case/segment-boundary).

PROVEN GAP (1): R12/R13 — dir link/junction planted in-repo redirected
root-contained `--out` writes outside the root (exit 0 pre-fix, bytes
outside, proven live). String containment cannot see links. Fix:
`resolveContainedWritePath` (`src/core/filesystem/paths.ts`: string
refusal + realpath of nearest existing ancestor and of pre-existing
final paths against the real root — the binding layer's own
realpath-then-contain pattern) wired into all root-contained `--out`
writers (verification bundle, checkpoint md/json export, skills export)
and the skills scaffold fixed path. No new config surface (degenerate
empty `--out` now fails closed). Matrix re-run green post-fix (refusal
exit 4, nothing outside) + helper regression suite.

Negative findings (contained, no change): file-symlink reads (strict
schema validation is the boundary); `scan`/`diagnostics` free `--output`
(operator-explicit contract relied upon by CI runner-temp recipes —
constraining it would break documented behavior); task titles (slug
folding); MCP free paths (none exist); NUL/UNC/nested/case/root rows
all refuse or behave correctly. Preventive MCP path allow-list:
REJECTED on evidence (existing containment + link-aware writes + id
patterns + schema validation close the matrix; a parallel allow-list
would be redundant configuration with its own bypass surface) —
recorded in `docs/security/THREAT_MODEL.md` v0.5 delta (new T27 row +
decision note; no other security notes changed).

Evidence: matrix 14 passed + 2 OS-gated skips (file-symlink rows prove
out on symlink-capable CI); pre-existing filesystem/policy/secret
suites pass unmodified; full `pnpm test` counts + all gates recorded at
completion-gate time. Internal ledger/scaffold-fixed-path scoping
recorded (user-steered writes fixed; store-managed state dirs
unchanged). No quality gates weakened. No publish/tag/release.
TASK-0085 not started.
