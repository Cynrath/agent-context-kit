# Workflows

ACKit gives every task an explicit, machine-checkable lifecycle. Workflows are
opt-in per task: a task without workflow state keeps the exact pre-expansion
behavior (ADR-0025).

## Profiles

Three built-in profiles ship (frozen catalog; config may tune required
artifacts, never invent profiles or stages):

| Profile | Stages | Verdict required | Evidence required |
|---|---|---|---|
| `quick` | task → implement → verify | no | no |
| `standard` | intent → plan → tasks → implement → verify → review | yes | yes |
| `high-risk` | intent → spec → plan → tasks → implement → verify → independent-review → release-evidence | yes | yes |

Selection is explicit and machine-readable:

```
ackit workflow set TASK-0007 --profile standard
ackit workflow show TASK-0007
ackit workflow advance TASK-0007            # forward-only, adjacent
ackit workflow verify TASK-0007 --outcome pass   # verify/fix-loop state
```

Stage transitions are validated deterministically: skipping or moving
backwards is rejected with `WORKFLOW_STAGE_INVALID`. The one sanctioned
regression is the verify/fix loop: recording a `fail` attempt rewinds the stage
to `implement` deterministically; recording the later `pass` unblocks.

## Stage advancement gates

Advancing past a stage requires that stage's declared artifacts to exist
(presence checks only — ACKit never judges semantics):

- `intent` requires an `intentRef` on the task (and an accepted intent document)
- `spec` requires `specRefs`
- `plan` requires `planRef`
- `verify` (standard/high-risk) requires an evidence registry
- `independent-review` (high-risk) requires a registered verdict

## Completion gate

For workflow-enabled tasks, `ackit task complete` additionally blocks on:

1. **Evidence completeness** — every acceptance criterion verified with
   qualifying evidence (manual-only evidence is insufficient by default).
2. **Verifier verdict** — for verdict-requiring profiles, the latest
   registered verdict must be `PASS`/`PASS_WITH_WARNINGS` with zero blocking
   findings.
3. **Stage** — at or past the profile's completion stage.
4. **Verification attempts** — the latest recorded attempt must not be an
   unresolved `fail`. `VERIFY failed → completed` is structurally impossible.
5. **Blocking drift findings** — composed from the same deterministic drift
   core (see `docs/reference/drift.md`).

`--force` remains the explicit, banner-warned escape hatch (tier-2 policy
boundary — see below). Legacy tasks keep the exact pre-expansion rules.

## Lifecycle gates

The declarative gate contract (ADR-0028) wires the same requirements at
ACKit-owned boundaries: `preTaskComplete` mirrors the completion gate, the
verification bundle carries the verification-point requirements, and the
user-installed managed pre-commit block runs `ackit drift check-active --ci`
on the active workflow task (a clean no-op for legacy repositories). The gate
schema is declarative-only: `command`/`script`/`run` fields cannot parse —
there are no executable hooks by construction.

## Policy v2 boundaries

`ackit.yml` (or a policy document) can express risk-tiered autonomy:

```yaml
autonomy:
  tier0: allow   # read/inspect/analyze
  tier1: allow   # local edits / local tests
  tier2: ask     # git mutations / controlled local state changes
  tier3: ask     # external writes
  tier4: deny    # publish / deploy / destructive
```

ACKit enforces tiers only at boundaries it owns (documented limitation:
provider-internal tool calls cannot be intercepted by ACKit). Today:
`task complete --force` is a tier-2 boundary — a resolved `deny` refuses the
override with `POLICY-TIER-DENIED` (exit 4), and `ask` in a non-interactive
context is treated as deny. Deny wins across layers: a later allow can never
reopen a denied tier.
