---
id: "TASK-0044"
title: "workflow-expansion architecture: ADRs, terminology, threat model"
status: pending
schemaVersion: 2
dependencies: []
createdAt: "2026-08-31"
completedAt: null
---

## Purpose

Establish the accepted architecture, terminology, and security threat model for the workflow/verification/evidence/resumability expansion before any subsystem implementation begins. This task authorizes and freezes the design decisions that TASK-0045..TASK-0062 implement.

## Scope

- Author `docs/decisions/ADR-0025-workflow-profiles-and-stage-contract.md`: first-class workflow concept (quick/standard/high-risk profiles), explicit machine-readable profile + stage selection, additive evolution of task frontmatter (no `schemaVersion` bump; optional reference fields), per-profile required artifacts, stage advancement rules, and the principle that ACKit never calls an LLM and never runs autonomous loops.
- Author `docs/decisions/ADR-0026-evidence-and-independent-verification.md`: evidence contract v2 (acceptance criteria linked to typed evidence), verification bundle, `ackit.verdict.v1`, completion-gate requirements, and the rule that ACKit validates structure/references only — semantic judgment belongs to an independent verifier.
- Author `docs/decisions/ADR-0027-checkpoints-and-local-workflow-store.md`: deterministic checkpoint model, `.ackit/workflow/` local state root (gitignored, never committed), resume/handoff commands, intent documents under `docs/intent/` (committed, docs-first), and staleness detection.
- Author `docs/decisions/ADR-0028-policy-v2-autonomy-tiers-roles-hooks.md`: risk-tiered autonomy contract (tier0..tier4 × allow/ask/deny), review policy, declarative lifecycle gates (no executable hooks from repository YAML), portable role contracts, skills interoperability projections, and the local execution journal.
- Extend `docs/security/THREAT_MODEL.md` with the new threat rows (T16+): malicious workflow-state alteration, forged evidence, forged verdict, artifact-ref path traversal, stale checkpoint reuse, task-ID collision, cross-repository artifact confusion, manipulated git state, policy bypass, and metadata spoofing — each with its deterministic mitigation and planned regression surface.
- Add a terminology section to `docs/architecture/overview.md`: intent, workflow profile, stage, required artifact, evidence, verdict, checkpoint, resume, handoff pack, drift finding, autonomy tier, role contract.
- Record the schema-id naming convention to be used by all new durable contracts (`ackit.intent.v1`, `ackit.workflow.v1`, `ackit.checkpoint.v1`, `ackit.evidence.v2`, `ackit.verification-bundle.v1`, `ackit.verdict.v1`, `ackit.role.v1`, `ackit.execution-journal.v1`), consistent with existing `ackit.pack.v0` / `ackit.diagnostics.v1` / `ackit.readiness.v1`.

## Out of scope

- Any implementation code, schema files, or CLI surface (owned by TASK-0045..TASK-0062).
- Browser Companion, agent runtime, cloud systems, and eval platform (permanently out of scope for this expansion).
- Release actions: no version bump, tag, publish, or protected-branch merge.

## Affected files

- `docs/decisions/ADR-0025-workflow-profiles-and-stage-contract.md` (new)
- `docs/decisions/ADR-0026-evidence-and-independent-verification.md` (new)
- `docs/decisions/ADR-0027-checkpoints-and-local-workflow-store.md` (new)
- `docs/decisions/ADR-0028-policy-v2-autonomy-tiers-roles-hooks.md` (new)
- `docs/security/THREAT_MODEL.md` (extend)
- `docs/architecture/overview.md` (extend)
- `docs/decisions/README.md` (index update)

## Acceptance criteria

- [ ] ADR-0025..0028 exist, are indexed, and cover every numbered requirement area of the expansion (workflow profiles §1, intent §2, spec/task refs §3, plan-first checks §4, evidence §5, verification §6, checkpoints §7, packs §8, drift §9, policy §10-§11, hooks §12, roles §13, skills §14, journal §15, verify/fix loop §16).
- [ ] Each ADR states the invariant-preserving decision, the reuse-over-duplicate mapping to existing subsystems (tasks, policy packs, context packs, skills, MCP), and the backward-compatibility stance for legacy task documents and configs.
- [ ] THREAT_MODEL.md gains the new threat rows with deterministic mitigations and named regression-surface owners (which future task's tests close each threat).
- [ ] The terminology section defines every new term without marketing deferred features as shipped.
- [ ] `node dist/cli/index.js doctor`, `node dist/cli/index.js task doctor`, and `node dist/cli/index.js scan --ci` pass after the document commits.

## Test steps

1. `node dist/cli/index.js task doctor` — task graph integrity OK.
2. `node dist/cli/index.js doctor` and `node dist/cli/index.js scan --ci` — no new findings caused by the documents (no leaked absolute paths, no internal traceability tokens in user-facing docs).
3. `pnpm lint && pnpm format:check` — documentation formatting clean.

## Security considerations

- The ADRs must explicitly reject executable hooks from untrusted repository YAML; only declarative gate requirements are allowed in core.
- Threat rows must state that repository content is untrusted input for every new workflow surface (state files, evidence, verdicts, intent docs).

## Risks

- Architecture drift between ADRs and later implementation — mitigated by acceptance criteria in every downstream task referencing the ADRs as governing contract.
- Over-engineering the lifecycle for small tasks — mitigated by the quick profile requiring only task+implement+verify.

## Rollback plan

Focused revert of the document commits; no runtime state exists yet.

## Completion notes

(placeholder)
