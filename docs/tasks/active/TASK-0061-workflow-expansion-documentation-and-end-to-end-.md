---
id: "TASK-0061"
title: "workflow expansion documentation and end-to-end examples"
status: completed
schemaVersion: 2
dependencies: ["TASK-0059", "TASK-0060"]
createdAt: "2026-08-31"
completedAt: 2026-09-01
---

## Purpose

Deliver the complete documentation for the expansion (§24): what ACKit is and is not, every new concept, and a reproducible end-to-end example — with no marketing of deferred features.

## Scope

- `docs/concepts/workflows.md` (new): workflow profiles (quick/standard/high-risk) with stage diagrams, machine-readable selection, required artifacts per profile, verify/fix loop semantics, completion gating.
- `docs/concepts/intent.md` (new): the intent contract, fields, fingerprinting, when an intent is required vs over-bureaucracy.
- `docs/concepts/checkpoints.md` (new): checkpoint model, resume/handoff flows (context compaction, new chat, model switch, provider switch, terminal/agent restart), staleness.
- `docs/concepts/evidence-verification.md` (new): evidence contract v2, evidence types, the implementation≠verified principle, verification bundle, verdict schema, independent-verifier protocol, role contracts.
- `docs/reference/` updates: `cli.md` (all new command families with flags), `schemas.md` (new schema files + schema-id table), `policy.md` (autonomy tiers + review policy), `drift.md` (new — finding-code reference with severities and exit semantics).
- `docs/guides/workflow-adoption.md` (new): migration/adoption guide for existing repositories (opt-in per task, legacy behavior unchanged, config surface, when to choose which profile).
- End-to-end example: `docs/guides/workflow-example.md` — the full canonical flow (user request → intent → validation → plan/tasks → implementation → evidence → verification bundle → fresh verifier verdict → checkpoint → completion), written as a reproducible command transcript on a minimal fixture, including the Agent A → Agent B provider-switch resume transcript.
- README updates: feature table row for workflow/evidence/verification/resumability; "Why" section updated with the harness boundary statement; explicit "ACKit is not an autonomous coding agent" paragraph; docs-links table additions. README/docs parity tests updated.
- Boundary honesty pass: audit all new docs for claims about deferred features (browser runtime, eval platform, autonomous loops, provider interception) — each is either absent or explicitly marked not shipped.

## Out of scope

- Any code changes except doc-parity test expectations.
- CHANGELOG/release notes (owned by release tasks, none authorized here).

## Affected files

- `docs/concepts/workflows.md`, `intent.md`, `checkpoints.md`, `evidence-verification.md` (new)
- `docs/reference/cli.md`, `schemas.md`, `policy.md`, `drift.md` (new), `docs/reference/mcp.md`, `docs/reference/sdk.md`
- `docs/guides/workflow-adoption.md`, `docs/guides/workflow-example.md` (new)
- `README.md`, `tests/contract/readme-current.test.ts`, `tests/contract/readme-parity.test.ts`, `tests/contract/docs-gate.test.ts` (if thresholds/links require)
- `docs/architecture/overview.md` (system diagram + new modules)

## Acceptance criteria

- [x] Every concept in the mandated list has accurate documentation matching shipped behavior (spot-checked against CLI `--help` and schema files).
- [x] The end-to-end example is reproducible: its commands run verbatim on a clean fixture (verified during authoring) and include the provider-switch resume transcript.
- [x] README + docs parity/contract tests green; no internal traceability tokens in user-facing docs.
- [x] Deferred/excluded features are never described as shipped; the docs include the explicit "is not" list.
- [x] `node dist/cli/index.js scan --ci` green after doc commits (no leaked paths/secrets in docs).

## Test steps

1. `pnpm lint && pnpm format:check` (docs included in biome scope via scripts/examples? verify scope; else manual review)
2. `pnpm test` (docs-gate, readme-parity, readme-current)
3. `node dist/cli/index.js doctor && node dist/cli/index.js scan --ci`

## Security considerations

- Docs contain no machine-specific absolute paths, no secrets, no internal identifiers (scan verifies).

## Risks

- Docs drifting from behavior — mitigated by parity tests and the TASK-0062 verification pass.

## Rollback plan

Focused revert of documentation commits.

## Completion notes

- New concept docs: `docs/concepts/workflows.md` (profiles, stage machine,
  advancement gates, completion gate, lifecycle gates, policy v2 boundaries),
  `docs/concepts/intent.md` (contract, when required vs over-bureaucracy,
  document shape, fingerprints, task referencing), `docs/concepts/checkpoints.md`
  (model, commands, staleness, provider switch, handoff pack),
  `docs/concepts/evidence-verification.md` (evidence v2, types, manual-only
  insufficiency, bundle, verdicts, completion behavior).
- New reference: `docs/reference/drift.md` (all eight finding codes with
  severities, exit semantics, exclusions). New guides:
  `docs/guides/workflow-adoption.md` (legacy preserved; step-by-step adoption;
  config surface; when NOT to adopt) and `docs/guides/workflow-example.md` —
  the full end-to-end transcript, REPRODUCIBLE: every command was executed
  verbatim on a fresh fixture during authoring (two runs; the second included
  the criterion-tick step) and outputs in the doc are the real outputs,
  including the provider-switch resume transcript, the DENIED completion
  before the verdict, and the final `TASK-0001: completed` + journal tail.
- Updated: `docs/reference/cli.md` (all new families — done in TASK-0059,
  re-verified), `docs/reference/sdk.md` + `mcp.md` (TASK-0059), README —
  four new feature-table rows for workflows+intent, evidence+verification,
  checkpoints+resume, drift+policy v2, each explicitly marked
  "(experimental branch)" because the work ships on `feat/workflow-expansion`
  and is unreleased; and a "What ACKit is not" boundary paragraph (not an
  autonomous coding agent, model runtime, browser automation framework, agent
  router, or cloud service — model execution stays with the user's agent).
- Boundary honesty: no deferred/excluded feature is described as shipped —
  the README rows carry the experimental-branch marker, and the concept docs
  document provider-interception and tier-4 limitations explicitly.
- Verification: docs-gate, readme-current, readme-parity (tarball README
  parity included) and cli-help contract tests all green (86/86 across the
  contract directory); no internal traceability tokens in user-facing docs
  (cli-help contract enforces); scan findings unchanged after doc commits
  (same pre-existing set; readiness 88 pass; no new leaked paths/secrets).
- Gates: lint 0 problems (docs outside biome src/tests scope — manual review
  recorded); format:check clean.
