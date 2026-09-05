# ADR-0031: Verifier Independence and Replay/Staleness Hardening

Status: Accepted · Date: 2026-09-05 · Governs: TASK-0080

## Context

ADR-0030 binds every verdict to the exact state it approved
(`VERDICT-BUNDLE-MISMATCH` at registration, `VERDICT-STATE-STALE` at
completion). Binding answers *what was approved*; it does not answer *who
reviewed it, and with what proof*. Three gaps remain, all structural (no
identity crypto exists or is wanted):

1. `verifier.context: "fresh"` is a self-declared string. The implementer,
   in the same process, can author `context: "fresh"` and the completion
   gate — which already says it requires an *independent* verdict — cannot
   tell the difference. Self-issued artifacts silently qualify.
2. `--bundle` (the only proof the verifier reviewed a specific bundle) is
   optional, and its success path was never proven: the bundle/verdict
   files themselves are working-set state, so a bundle exported to a
   non-excluded path can never match at registration (§5).
3. Re-presenting an already-registered verdict file re-binds it to current
   state with a new id: an old judgment is laundered as current review.

## Decision

Harden independence structurally on top of the unchanged TASK-0079 digest
contract (no digest rule changes, no schema-id bump, no PKI, no
model/session identity, no signing infrastructure).

### 1. Reviewed-bundle reference on every bound verdict

`ackit.verdict.v2` gains one optional field, `reviewedBundleDigest`
(hex or null; optional — not required — so TASK-0079-era v2 records stay
readable and classify exactly like `null`: no proof, never independent).
It records the digest of the v2 bundle JSON the verifier reviewed, or
`null` for same-context verdicts registered without bundle proof. The
registration caller supplies it; a supplied proof that differs from the
recomputed CURRENT bundle digest is refused with
`VERDICT-BUNDLE-MISMATCH` (defense in depth behind the CLI match check).

### 2. Structural independence rule

Pure function `assessVerdictIndependence(record)` — no IO, no clock:

| Record | Classification | Code |
|---|---|---|
| `context: "fresh"` + reviewed digest == bound bundle digest | **independent** (`reviewed-bundle`) | — |
| `context: "fresh"`, no reviewed digest | non-independent (`self-issued`) | `VERDICT-INDEPENDENCE-UNPROVEN` |
| `context: "same"` (with or without bundle proof) | non-independent (`same-context`) | `VERDICT-INDEPENDENCE-UNPROVEN` |
| reviewed digest != bound digest (hand-edited ledger) | non-independent (`self-issued`) | `VERDICT-BUNDLE-MISMATCH` |
| legacy unbound v1 | non-independent (`legacy-unbound`) | `VERDICT-BINDING-MISSING` |

A same-context verdict that reviewed the bundle is still same-context:
reviewing does not make the implementer a second party. Independence is
*proven review by a fresh context*, not *a fresh string in the file*.

### 3. Replay rejection at registration

The authoring subset
`{verdict, verifier, findings, checkedCriteria, summary}` is digested
through the TASK-0079 canonical module (new domain `verdict-content`;
store-allocated id/taskId, the binding, and the reviewed reference never
participate — they describe registration, not judgment). Re-presenting
already-registered content for the same task is refused with
`VERDICT-REPLAY-REJECTED`, even when the state moved on (the fresh binding
would otherwise launder the old judgment) and even when it did not
(redundant duplicates are replay too). A genuine re-verification authors
new content (a new summary at minimum) and registers normally.

### 4. Enforcement points

- **Registration** (fail-fast, explicit, actionable): fresh-context claim
  without reviewed-bundle proof → `VERDICT-INDEPENDENCE-UNPROVEN` with the
  exact remedy (export the JSON bundle, re-register with `--bundle`, or
  declare `context: "same"`). Replay → `VERDICT-REPLAY-REJECTED`.
  Refused registrations leave no record behind.
- **Completion** (where independence is required — the `requiresVerdict`
  branch): freshness is checked first (existing `VERDICT-STATE-STALE` /
  `VERDICT-BINDING-MISSING` behavior unchanged, including no
  double-reporting for legacy records), then a non-independent latest
  PASS-family verdict blocks with `VERDICT-INDEPENDENCE-UNPROVEN`, naming
  the basis and the remedy. Profiles that do not require a verdict are
  unaffected.
- **Inspection**: `verification show --json` reports `independent`,
  `reviewedBundleDigest`, and `independenceCode` alongside the existing
  bound/fresh trust state (informational; completion rechecks
  independently). `record --json` reports the same for the new verdict.

### 5. Review-artifact lifecycle (the §7 gap fixed here)

Files written after a bundle export — *including the bundle JSON and the
verdict YAML themselves* — are working-set state and move the digest, so
`record --bundle` with artifacts under a bound path can never match.
This is not a digest bug; it is the binding working as designed. The
contract therefore is:

- Keep transient review artifacts (exported bundle JSON, authored verdict
  YAML) under `.ackit/` (excluded from source-state binding, gitignored):
  export → review → author → register → complete stays fresh.
- The `VERDICT-BUNDLE-MISMATCH` diagnostic says this explicitly.
- The digest contract itself is untouched: no new exclusions, no
  input-file carve-outs (carve-outs would need path persistence into the
  binding record to stay completion-consistent — rejected as complexity
  against a convention that already exists for exactly this purpose).

### 6. Stable codes (new; all existing codes frozen)

| Code | Meaning |
|---|---|
| `VERDICT-INDEPENDENCE-UNPROVEN` | fresh claim without bundle proof (registration), or non-independent latest where independence is required (gate) |
| `VERDICT-REPLAY-REJECTED` | identical verdict content already registered for this task |

## Explicit non-claims

No proof of verifier identity. No PKI. No signing or key infrastructure.
No proof that a person or model actually read the bundle, nor which one.
No defense against a local operator who fabricates the whole chain
(an operator who can write arbitrary files can already rewrite the
gitignored ledger — same threat model as ADR-0030). What is proven:
every accepted fresh verdict references the exact bundle digest its
reviewer saw; self-issued artifacts are flagged and refused where
independence is required; replayed content is refused; stale bundles are
refused — all deterministically, offline, and across processes.

## Consequences

- `verdict.schema.json` gains the optional `reviewedBundleDigest`
  (regenerated, idempotent); no schema-id change.
- Existing verdict-registration call sites move to the new contract:
  same-process tests declare `context: "same"` or carry proof; the
  end-to-end flows (CLI round-trip, cross-process fixture, core product
  e2e) prove independence through `--bundle` with artifacts under
  `.ackit/reviews/`.
- Cross-process fixture (`node dist/cli/index.js` spawns, zero shared
  memory) proves: independent end-to-end accept, stale-bundle refusal,
  unproven-fresh refusal, replay refusal, and same-context
  register-but-blocked — the exact bundle/state reference traveling
  across process boundaries on digests alone.
- TASK-0081 (status) consumes `latestVerdictSummary`'s
  `independent`/`independenceCode` fields; TASK-0082 (handoff) carries
  `reviewedBundleDigest` as part of verification state.
