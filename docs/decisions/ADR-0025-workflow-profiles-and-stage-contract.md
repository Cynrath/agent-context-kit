# ADR-0025: Workflow Profiles, Intent, and the Machine-Checkable Stage Contract

Status: Accepted · Date: 2026-08-31 · Governs: TASK-0045..0047, 0049, 0053, 0055

## Context

ACKit enforces task-first discipline procedurally (AGENTS.md), but nothing in the product
makes the discipline machine-checkable: no explicit workflow selection, no required-artifact
contract, no deterministic stage ordering, and no normalized intent artifact that survives
context compaction or provider switches. The workflow expansion must add these without
breaking any existing repository, without an LLM, and without duplicating the task/policy
subsystems.

## Decision

1. **First-class workflow concept with three built-in profiles** — `quick`, `standard`,
   `high-risk` (kebab-case ids, frozen set; config may tune required artifacts, not invent
   profiles). Canonical stage orders:

   - `quick`: `task → implement → verify`
   - `standard`: `intent → plan → tasks → implement → verify → review`
   - `high-risk`: `intent → spec → plan → tasks → implement → verify → independent-review → release-evidence`

   Selection is explicit and machine-readable: `ackit workflow set <task> --profile <id>`
   writes a per-task state file. No inference, no defaults applied silently to legacy tasks.

2. **Per-task local workflow state** — `.ackit/workflow/TASK-####/state.yaml`,
   schema id `ackit.workflow.v1`, strict unknown-field rejection, deterministic
   serialization, date-only timestamps. `.ackit/` is gitignored local state by existing
   repository policy: workflow state is deliberately NOT committed; the task document
   remains the committed source of truth for what a task is, while workflow state captures
   where execution stands. A task is "workflow-enabled" iff this state file exists — the
   single switch that scopes every new gate so legacy tasks keep exact v0.2.2 behavior.

3. **Stage machine** — forward-only within a profile. The single sanctioned regression is
   `verify → implement` via `ackit workflow verify --outcome fail` (the verify/fix loop);
   every other backward or skipping transition is `WORKFLOW_STAGE_INVALID`. Advancement past
   a stage requires that stage's required artifacts to exist (deterministic existence checks
   only; no semantic judgment).

4. **Intent as a committed, schema-versioned artifact** — `docs/intent/INTENT-####-*.md`
   documents, schema id `ackit.intent.v1`, frontmatter carries the normalized machine
   fields (`problem`, `desiredOutcome`, `constraints[]`, `nonGoals[]`, `affectedSystems[]`,
   `acceptanceCriteria[] {id: AC-###, requirement}`, `openQuestions[]`, `risks[]`, `source`).
   Committed (docs-first like tasks) because intent is a planning artifact that must precede
   implementation in git history (AGENTS.md Rule 3). ACKit validates, normalizes,
   fingerprints (sha256 over canonical JSON, machine-path independent), and references;
   it never generates or infers intent. Quick-profile tasks require no intent.

5. **Additive task-frontmatter evolution, no version bump** — `TaskMetaSchema` gains optional
   `intentRef`, `specRefs[]`, `decisionRefs[]`, `planRef`. `schemaVersion` stays `2`: the
   fields are optional, old documents parse identically, and serialized output for
   ref-less tasks is byte-identical. A schema-version bump would break every existing task
   document for zero benefit — rejected. Migration guidance: none needed (opt-in per task).

6. **Plan-first machine checks are deterministic only** — reference existence, dependency
   order (existing doctor logic), declared-scope parsing, and a git-based ordering check
   (plan file's first commit not after first implementation commit, best-effort with
   git-unavailable advisory). No semantic claims; semantic review belongs to the
   independent verifier (ADR-0026).

7. **Reuse, not duplication** — workflow state store mirrors `TaskStore` patterns (id
   validation, containment, deterministic serialization); required-artifact resolution is
   a pure catalog function; task-aware packs extend `buildContextPack` ranking weights and
   the REQ-CTX-001 section mechanism rather than adding a context engine; the
   completion gate composes existing validators instead of adding a second gate engine.

## Consequences

- Legacy repositories see zero behavior change: no state file → no new gates.
- Every durable contract carries an explicit schema id (`ackit.workflow.v1`,
  `ackit.intent.v1`, later `ackit.checkpoint.v1`, `ackit.evidence.v2`,
  `ackit.verification-bundle.v1`, `ackit.verdict.v1`, `ackit.role.v1`,
  `ackit.execution-journal.v1`), strict validation, and stable ordering.
- `ackit.yml` gains an optional strict `workflow:` section; absent section = defaults;
  unknown keys rejected (typo-driven insecure defaults stay impossible).
- ACKit remains deterministic and offline: no LLM, no network, no embeddings, no
  autonomous loop. The coding agent decides; ACKit governs state.

## References

- `docs/tasks/active/TASK-0044..0062` (governing task chain)
- ADR-0006 (instruction graph), ADR-0012 (pack/cache) — reused unchanged
- ADR-0026 (evidence/verification), ADR-0027 (checkpoints), ADR-0028 (policy/roles/hooks)
