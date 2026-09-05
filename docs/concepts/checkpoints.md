# Checkpoints and Resumability

Long-running work must not depend on conversation history surviving. A
checkpoint is a deterministic snapshot of where a task stands that any fresh
process — new chat, different model, different provider, restarted terminal —
can load and continue from exactly the recorded next action
(`ackit.checkpoint.v1`, ADR-0027).

## What a checkpoint contains

- task id, workflow snapshot (profile/stage), `intentRef`/`planRef`
- `completedWork` / `pendingWork` — extracted from the task document's
  acceptance-criteria checkboxes at creation time
- `decisions`, `failures`, `blockers` — from the task document's sections
- `evidenceRefs`, `changedAreas` (git changed-file snapshot), `gitHead`
- `nextAction { objective, path?, command?, expectedResult? }` — the exact
  instruction the next agent continues from
- explicit `gitUnavailable` marker when git was missing (never a fabricated state)

Checkpoints are local state under `.ackit/workflow/TASK-####/checkpoints/`
(gitignored by design — the task document remains the committed source of
truth). Cross-machine transfer uses the handoff pack export.

## Commands

```
ackit checkpoint create TASK-0007 \
  --next-objective "Implement the pending criterion" \
  --next-path src/pending.ts --next-command "pnpm test" \
  --next-expected "all tests green"

ackit checkpoint show TASK-0007          # latest (or a specific CP-####)
ackit checkpoint validate TASK-0007      # staleness detection
ackit checkpoint export TASK-0007 --out docs/handoff-7.md
ackit checkpoint export TASK-0007 --format json --out .ackit/reviews/handoff-7.json
ackit checkpoint import .ackit/reviews/handoff-7.json   # validate + resume (read-only)
ackit task resume TASK-0007              # concise deterministic resume context
ackit pack --task TASK-0007 --resume     # task-aware context pack + resume section
```

## Staleness

`ackit checkpoint validate` flags `STALE_CHECKPOINT` when the recorded git
head is no longer reachable from current HEAD, or when a next-action path
that was in the recorded changed set has vanished from the working state.
A next-action path that never was in the changed set (a future target) is
correctly NOT stale. Git-unavailable is an explicit advisory.

## Provider switch

Resume correctness is a property of the repository + local state, not
conversation: Agent A creates a checkpoint; Agent B — a different model or
provider — loads the same files and continues from the exact recorded next
action. This is proven by the mandated scenario test: a fresh store/process
reads identical state with zero conversation dependence.

## Handoff pack

`checkpoint export --out` writes a single self-contained markdown document
(resume context + full task document + checkpoint summary) for a fresh
implementer or verifier on any machine. Output paths are containment-checked;
traversal attempts exit 4. The markdown shape is the v1 handoff: readers
keep working unchanged.

## Portable bound handoff (`ackit.handoff.v2`)

`checkpoint export --format json` wraps the v1 pack with a machine-readable
section binding the full handoff list: task/workflow state, the checkpoint
record, evidence presence + problems, the verification binding
(state/bundle/component digests) with the latest verdict's trust summary,
checkpoint staleness at export time, the TASK-0081 status contract
(verbatim blockers + derived next actions), a redaction manifest, and
provider-neutral resume instructions. Same state exports byte-identical
handoffs (deterministic).

`checkpoint import <file>` validates a handoff against CURRENT disk state
and renders its resume context — read-only: it never mutates
task/workflow/evidence/verdict/ledger state (no auto-execution, no cloud
sync). Fresh handoffs exit 0; moved state refuses with
`VERDICT-STATE-STALE` (naming the changed classes, exit 1); v1 markdown
carries no digests and is refused with `HANDOFF-V1-UNBOUND` (re-export as
JSON — the migration); malformed files refuse with `HANDOFF-INVALID`;
unknown tasks with `HANDOFF-TASK-UNKNOWN` (exit 2).

Redaction: rendered surfaces pass the canonical secret gate (fail-closed)
and machine-local absolute paths are scrubbed with the shared pack
scrubber; the manifest states the scrub count. Review files written after
a handoff export change state like any other file — keep transient review
artifacts under `.ackit/` as usual.
