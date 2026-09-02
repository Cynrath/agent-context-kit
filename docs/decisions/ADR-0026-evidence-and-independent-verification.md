# ADR-0026: Evidence Contract v2 and the Independent Verification Protocol

Status: Accepted · Date: 2026-08-31 · Governs: TASK-0050..0053, 0056, 0059, 0062

## Context

Task completion today trusts checkbox state and prose completion notes. "Implementation
exists" is indistinguishable from "acceptance criterion verified", evidence is unstructured,
and nothing supports handing verification to a fresh-context agent. The expansion must make
completion evidence-backed and support independent verification — without ACKit pretending
to judge semantic correctness, and without a second policy/gate engine.

## Decision

1. **Evidence contract v2 (`ackit.evidence.v2`)** — a per-task registry at
   `.ackit/workflow/TASK-####/evidence.yaml` linking acceptance criteria to typed proof:
   criteria `{id: AC-###, requirement, status: unverified|verified, evidence[]}` where each
   evidence entry is `{type, ref}`. The evidence `type` enum is frozen: `test`, `build`,
   `lint`, `typecheck`, `benchmark`, `runtime`, `e2e`, `ci`, `git`, `static-analysis`,
   `security-scan`, `manual`, `external`, `verifier-verdict`. The task document's
   `## Acceptance criteria` section remains the criterion source of truth (ids assigned in
   document order by `ackit evidence sync`); the registry stores verification state.
   Registry is local state (`.ackit/` is gitignored): it is a working ledger, while the
   committed task doc's completion notes record the evidence summary.

2. **Deterministic completeness validation only** — `validateEvidence` checks structure and
   completeness: every criterion verified with at least one evidence entry of a
   profile-required type (manual-only evidence insufficient unless explicitly configured).
   Finding codes are stable (`REQUIRED_EVIDENCE_MISSING`, `CRITERION_UNVERIFIED`,
   `EVIDENCE_REF_INVALID`). ACKit never executes evidence, never re-runs tests, never
   claims a criterion is semantically satisfied — it validates the recorded proof's
   structure and coverage. Forged criteria (ids absent from the task doc) are rejected.

3. **Verification bundle (`ackit.verification-bundle.v1`)** — `ackit verification bundle
   TASK-XXXX` emits a deterministic, bounded markdown (or JSON) document containing only
   the relevant material: intent summary + fingerprint, workflow profile/stage + required
   artifacts, spec/ADR/plan references, the task document, criteria + evidence registry,
   latest checkpoint summary, implementation surface (changed files vs declared scope;
   diff-stat by default, full diff opt-in with a byte cap), instruction/policy digests,
   known failures/blockers, and the verifier role contract. Never a repository dump; the
   secret gate and absolute-path scrubber run over the final output (defense in depth
   identical to packs).

4. **Verdict contract (`ackit.verdict.v1`)** — strict schema: `verdict:
   PASS | PASS_WITH_WARNINGS | REWORK_REQUIRED | BLOCKED`, `verifier {agent, context:
   fresh|same, issuedAt}`, `findings[] {severity: blocking|warning|info, criterion?, code,
   message}`, `checkedCriteria[]`, `summary`. ACKit validates structure and references
   (task exists, criterion ids exist in the registry, blocking findings are inconsistent
   with PASS) and registers verdicts append-only at
   `.ackit/workflow/TASK-####/verdicts/VR-####.yaml` (latest governs; history preserved).
   ACKit does not judge semantic correctness — the fresh verifier does.

5. **Completion-gate integration** — for workflow-enabled tasks, `task complete` adds
   blockers in deterministic order: evidence findings, verdict requirement (profile/config
   requires verifier → latest verdict must be PASS or PASS_WITH_WARNINGS with zero blocking
   findings), stage must be at/past `verify` (high-risk: `release-evidence`), blocking drift
   findings, and latest-verification-attempt state (`fail` without a later `pass` blocks).
   `VERIFY failed → completed` is structurally impossible for workflow tasks. Quick-profile
   and legacy tasks keep today's rules exactly. `--force` remains the explicit,
   banner-warned, doctor-reported override — the gate is never silently weakened.

6. **Independent verifier protocol** — any fresh-context agent consumes the bundle and
   emits the verdict; ACKit only builds bundles, validates + stores verdicts, and enforces
   the gate. The verifier role contract (ADR-0028) is embedded in every bundle. ACKit
   never spawns agents.

## Consequences

- Evidence is opt-in per task (workflow-enabled), preserving legacy behavior.
- The evidence ledger is local; committed auditability comes from task completion notes and
  exported bundles/verdicts (explicit `--out` paths), keeping git history clean.
- Verdict registration is the only write path for verdicts; a REWORK verdict cannot be
  overwritten — only superseded by a later registered verdict.

## References

- ADR-0025 (workflow profiles/stages), ADR-0027 (checkpoint summaries inside bundles)
- `tests/integration/tasks` gate scenarios (TASK-0053), `tests/security` forgery tests
