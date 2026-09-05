# Demo: the v0.5 trust flow (60 seconds + full test)

ACKit in one arc: a task claims done → completion is blocked until proof
exists → evidence and an independent, state-bound verdict are registered
→ completion becomes eligible → moved state stales the verdict and
blocks again → a fresh bundle and verdict restore eligibility →
completion succeeds → a checkpoint/handoff resumes in a second process
with zero shared memory.

Everything below runs offline with no API key. The flow is executed —
not narrated — by `tests/e2e/trust-flow-demo.test.ts` (runs in CI);
this guide is the same command sequence with what each stage proves.
Hex digests below are per-run values (git state differs per checkout);
what is pinned are the exit codes, the stable codes, and the digest
*relations* (equality vs inequality), all asserted by the test.

## Prerequisites

```bash
git clone https://github.com/Cynrath/agent-context-kit.git
cd agent-context-kit
pnpm install --frozen-lockfile
pnpm build
```

## The flow

```bash
# 1 — the task claims done (criteria ticked, notes real, standard profile).
ackit intent new "Demo the trust flow"
ackit task create "Demo trust fixture" --intent INTENT-0001 --plan docs/plans/demo.md
ackit workflow set TASK-0001 --profile standard
ackit task start TASK-0001
ackit workflow advance TASK-0001   # intent → plan → tasks → implement…

# 2 — BLOCKED: proof and verdict are missing (exit 2).
ackit task complete TASK-0001
# → MISSING_REQUIRED_ARTIFACT (no evidence registry)
# → MISSING_VERIFIER_VERDICT (profile 'standard' requires an independent verdict)

# 3 — evidence added; the verdict blocker stands alone.
ackit evidence sync TASK-0001
ackit evidence verify TASK-0001 --criterion AC-001 --type test --ref "pnpm vitest run (green)"
ackit evidence verify TASK-0001 --criterion AC-002 --type build --ref "pnpm build (green)"
ackit workflow advance TASK-0001 --to verify
ackit task complete TASK-0001
# → MISSING_VERIFIER_VERDICT only (evidence blockers gone — progress is visible)

# 4 — bundle generated; status narrates the next action.
ackit verification bundle TASK-0001 --format json --out .ackit/demo/bundle.json
ackit status TASK-0001
# → blockers: MISSING_VERIFIER_VERDICT
# → next: ackit verification bundle TASK-0001 --format json --out .ackit/reviews/bundle.json

# 5 — state-bound verdict registered; digests match (asserted, not shown).
ackit verification record TASK-0001 --verdict .ackit/demo/verdict.yaml --bundle .ackit/demo/bundle.json
# → verdict VR-0001 registered (PASS), independent
# record --json: bundleDigest == the reviewed bundle's digest (0079 binding + 0080 proof)

# 6 — completion ELIGIBLE (asserted, not yet taken).
ackit --json status TASK-0001
# → blockers: [] · verdict { fresh: true, independent: true }
# → next: [{ command: "ackit task complete TASK-0001" }]

# 7 — a second implementation pass moves reviewed state → STALE blocks (exit 2).
ackit task complete TASK-0001
# → VERDICT-STATE-STALE (changed: sourceState)
ackit status TASK-0001
# → verdict VR-0001 (PASS): STALE (VERDICT-STATE-STALE: sourceState); NOT independent-path unaffected

# 8 — fresh bundle + fresh verdict restore eligibility.
ackit verification bundle TASK-0001 --format json --out .ackit/demo/bundle.json
# → new bundle digest DIFFERS (state-sensitive binding — asserted)
ackit verification record TASK-0001 --verdict .ackit/demo/verdict-2.yaml --bundle .ackit/demo/bundle.json
# → registered (replaying the old file would refuse VERDICT-REPLAY-REJECTED)
ackit --json status TASK-0001
# → blockers: []

# 9 — completion succeeds.
ackit task complete TASK-0001
# → TASK-0001: completed

# 10 — checkpoint + portable handoff exported.
ackit checkpoint create TASK-0001 --next-objective "demo resumed across processes" \
  --next-command "ackit status TASK-0001"
ackit checkpoint export TASK-0001 --format json --out .ackit/demo/handoff.json
# → ackit.handoff.v2 (digests + staleness + status contract + redaction manifest)

# 11 — a SECOND PROCESS resumes (real OS process, zero shared memory).
ackit checkpoint import .ackit/demo/handoff.json
# → TASK-0001: handoff CP-0001 fresh (bundle …); resume context renders
ackit task resume TASK-0001
# → same resume block the exporter embedded (byte-equivalent)
ackit --json status TASK-0001
# → task { id: TASK-0001, status: completed } — both processes agree
```

## What the demo asserts (contracts, not narration)

- `MISSING_REQUIRED_ARTIFACT` / `MISSING_VERIFIER_VERDICT` block
  proof-less completion (evidence contract, ADR-0026).
- Registered `bundleDigest` equals the reviewed bundle's digest, which
  equals current state (state binding ADR-0030 + independence proof
  ADR-0031).
- `VERDICT-STATE-STALE` names the changed classes (`sourceState`);
  replayed verdict content refuses `VERDICT-REPLAY-REJECTED`.
- Fresh bundle digests differ after state moves (binding sensitivity).
- Handoff import in a fresh process validates digests recomputed from
  disk and renders the embedded resume (`ackit.handoff.v2`).
- Review artifacts live under `.ackit/` (excluded from binding), so
  exporting/authoring them never stales the proof (ADR-0031 §5).

## Run it

```bash
pnpm vitest run tests/e2e/trust-flow-demo.test.ts
```

See also: [`docs/concepts/evidence-verification.md`](../concepts/evidence-verification.md),
[`docs/concepts/checkpoints.md`](../concepts/checkpoints.md),
[`ackit status`](../reference/cli.md).
