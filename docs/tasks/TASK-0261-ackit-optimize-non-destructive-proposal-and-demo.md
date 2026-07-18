# TASK-0261: ACKit Optimize non-destructive proposal and demo

## Purpose

Add an explicit-path, review-only optimized instruction proposal and a safe synthetic repository that proves nested scope, duplicates, conflicts, vague rules, valid overrides, and before/after metrics without modifying source instructions.

## Current verified state and root cause

TASK-0259/TASK-0260 provide audit data and output contracts, but users still need a reviewable consolidation artifact. Existing generators already enforce repository-relative skip-existing behavior; there is no safe instruction proposal or Build Week demo fixture.

## Scope

- Implement `--proposal <repo-relative.md>` as an optional `ackit optimize` artifact request.
- Require the explicit path, `.md`/`.markdown` extension, repository containment, and non-existing target; never default to or overwrite `AGENTS.md`.
- Generate a clearly labeled dry-run/review artifact with consolidated non-conflicting rules, unresolved conflicts for human decision, preserved mandatory security/test/deployment/documentation/release constraints, source mappings, and before/after instruction-body metrics.
- Consolidate only deterministically exact duplicates and conservative near-duplicates that add no constraint; retain the strongest/safest representative and map every removed occurrence to original source path/line.
- Never guess between contradictory rules. List both source locations and required human decision.
- Add mutation-guard tests hashing every source instruction before/after proposal generation, existing-output skip tests, path escape tests, and mandatory-constraint preservation tests.
- Create `samples/ackit-optimize-demo/` with synthetic root/nested `AGENTS.md`, another agent surface, a duplicate, genuine conflict, valid narrower override, vague/unverifiable rule, safe stale reference, and no private/customer/copyrighted data.
- Add expected demo findings/metrics in tests and documented three-minute demo commands.

## Out of scope

- `--apply`, confirmation prompts, in-place rewriting, deletion, remote AI optimization, or source instruction mutation.
- A claim that the proposal is semantically complete or ready to apply without human review.

## Affected files

- New Core proposal generator/model files and CLI plumbing
- Optimize proposal/path/mutation tests
- `samples/ackit-optimize-demo/**`
- Sample gallery/demo docs and task/control records

## Data/database impact

None.

## Security impact

Synthetic fixture values contain no real secret, PII, customer, or private path. Proposal output uses sanitized evidence, preserves safety/release constraints, remains local, and never overwrites source or existing output.

## Permission/auth impact

None. Explicit local artifact creation only.

## Compatibility impact

Additive option on the new command. No existing command changes.

## Localization impact

Proposal structure and public demo docs are English; CLI status/error text retains EN/TR parity. Technical mappings remain language-independent.

## UX impact

Users can inspect a concrete candidate and its provenance without trusting an automatic rewrite. Unresolved decisions are visually separated from safe consolidations.

## Logging/audit impact

Proposal includes source mapping and deterministic before/after metrics. Ordinary generated proposal files remain untracked/ignored unless an explicit reviewed fixture is part of tests.

## Acceptance criteria

- Proposal generation refuses a missing/absolute/escaping/wrong-extension path and skips an existing target.
- Root and nested source instruction files are byte-identical after success and failure paths.
- Mandatory security, tests, deployment, documentation, and release rules remain represented.
- Removed/consolidated rules map to original path and line ranges.
- Genuine conflicts remain unresolved and visible; valid scoped override is retained without false conflict.
- Before/after metrics are deterministic and proposal savings match consolidated source text.
- Synthetic demo produces stable exact duplicate, conflict, vague/unverifiable, and valid-override behavior across OSes.

## Test steps

- Focused proposal and demo fixture tests
- Hash/byte comparison of all fixture instruction files before/after
- CLI demo console/JSON/proposal/SARIF/HTML smoke
- JSON and SARIF parse
- Release build/full tests/current-source scan/doctor/diff checks

## Failure handling

Do not loosen non-overwrite or containment checks. Keep ambiguous/unsafe rules in the proposal and add a regression fixture for every corrected false positive/negative.

## Risks

- Removing a subtle constraint is unsafe; only exact or high-confidence same-polarity containment can be consolidated, and mandatory categories are preserved.
- Demo metrics can drift with parser changes; fixture expectations and documentation must update together after review.

## Rollback plan

Remove the additive proposal generator/option/fixture/docs via normal successor commit. Source instructions are never mutated, so no data rollback is required.

## Completion notes

Status: `PLANNED / DEPENDS ON TASK-0260`.
