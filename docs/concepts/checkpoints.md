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
traversal attempts exit 4.
