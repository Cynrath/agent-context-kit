# Evidence and Independent Verification

ACKit separates *implementing* from *proving*. Implementation existing is
never the same as an acceptance criterion being verified (ADR-0026).

## Evidence contract (`ackit.evidence.v2`)

Each workflow task can have an evidence registry — a local ledger at
`.ackit/workflow/TASK-####/evidence.yaml` linking every acceptance criterion
to typed proof:

```yaml
schemaId: "ackit.evidence.v2"
taskId: "TASK-0007"
criteria:
  - id: "AC-001"
    requirement: "Cold scan under 10s"
    status: verified
    evidence:
      - type: benchmark
        ref: "benchmarks small/medium — coldScanMs under target"
        recordedAt: "2026-09-01"
```

Evidence types: `test`, `build`, `lint`, `typecheck`, `benchmark`, `runtime`,
`e2e`, `ci`, `git`, `static-analysis`, `security-scan`, `manual`, `external`,
`verifier-verdict`.

The task document's `## Acceptance criteria` section is the criterion source
of truth; `ackit evidence sync` derives registry criteria from it in document
order. Checkbox state is never copied — checking a box records intent, not
verification. **Manual-only evidence is insufficient by default** (configurable
via `allowedTypes`). Secret-shaped evidence refs are rejected at registration
and validation.

```
ackit evidence sync TASK-0007
ackit evidence verify TASK-0007 --criterion AC-001 --type test \
  --ref "pnpm vitest run (26 passed)"
ackit evidence validate TASK-0007   # gate semantics: exit 1 when incomplete
```

## Independent verification

ACKit supports independent verification without becoming the verifier model
itself. It builds a deterministic, **bounded** verification bundle for a
fresh-context agent:

```
ackit verification bundle TASK-0007 [--out file] [--diff]
```

The bundle (now `ackit.verification-bundle.v2`) contains exactly the
relevant material — intent summary + fingerprint, workflow profile/stage +
gate requirements, the full task document, criteria + evidence, registered
verdicts, the latest checkpoint, the implementation surface (declared scope
vs changed files; capped optional diff), the embedded verifier role
contract, and — new in v2 — a **state binding** section: SHA-256 digests
over the exact source, contract, intent, artifact, workflow, config,
policy, and evidence state the verdict will be bound to (ADR-0030). It is
never a repository dump, and the canonical secret gate runs over its
output.

## Verdicts (`ackit.verdict.v2` bound, `v1` legacy)

A fresh verifier reviews the bundle and emits a verdict file:

```yaml
schemaId: "ackit.verdict.v1"
taskId: "TASK-0007"
verdict: "PASS_WITH_WARNINGS"   # PASS | PASS_WITH_WARNINGS | REWORK_REQUIRED | BLOCKED
verifier:
  agent: "fresh-verifier/1.0"
  context: "fresh"
  issuedAt: "2026-09-01"
findings: []
checkedCriteria: ["AC-001", "AC-002"]
summary: "criteria met; minor benchmark variance noted"
```

Registration validates structure and references — wrong schemaId, unknown
task, forged criterion ids, unknown fields, and blocking findings on a
PASS-family verdict are all rejected with stable codes. Registration binds
the verdict to the CURRENT state (computed by ACKit, never trusted from
the verdict file): with `--bundle <bundle.json>`, a bundle generated
before the state moved on is refused with `VERDICT-BUNDLE-MISMATCH`. The
store is append-only: a REWORK verdict is never overwritten, only
superseded by a later registered verdict. Stored verdicts are
`ackit.verdict.v2` (v1 fields + binding + reviewed-bundle reference);
pre-existing v1 files stay readable as legacy history but never satisfy a
state-bound completion.

```
ackit verification bundle TASK-0007 --format json --out .ackit/reviews/bundle-7.json
# ... fresh verifier reviews the bundle, authors .ackit/reviews/verdict-7.yaml ...
ackit verification record TASK-0007 --verdict .ackit/reviews/verdict-7.yaml --bundle .ackit/reviews/bundle-7.json
ackit verification show TASK-0007            # --json adds bound/fresh/problemCode + independent/reviewedBundleDigest/independenceCode
```

## Verifier independence (ADR-0031)

`context: "fresh"` in the verdict file is a claim; the reviewed bundle is
the proof. A verdict is **independent** iff it claims a fresh context AND
references the exact bundle digest it is bound to
(`reviewedBundleDigest`). Everything else is flagged, never silently
accepted where independence is required:

- fresh claim without `--bundle` proof → registration refused with
  `VERDICT-INDEPENDENCE-UNPROVEN` (self-issued artifacts cannot silently
  qualify as independent);
- `context: "same"` verdicts register fine without proof but are marked
  non-independent — and block `task complete` with
  `VERDICT-INDEPENDENCE-UNPROVEN` wherever the effective profile requires
  a verdict;
- re-presenting already-registered verdict content is refused with
  `VERDICT-REPLAY-REJECTED` (replay is about content, not staleness — an
  unchanged state does not make a duplicate a re-verification);
- a genuine re-verification authors new content and registers normally.

Review-artifact lifecycle: files written after a bundle export — including
the bundle JSON and verdict YAML themselves — are working-set state and
move the digest. Keep transient review artifacts under `.ackit/`
(excluded from source-state binding, gitignored): export → review →
author → register → complete then stays fresh. The mismatch diagnostic
says so explicitly.

What independence is NOT: no proof of verifier identity, no PKI, no
signing infrastructure, no proof that a person/model actually read the
bundle. Deterministic local proof-of-review linkage only — a fresh
verdict provably references the exact bundle its reviewer saw, across
processes, offline.

## State binding (ADR-0030)

A verdict is only as fresh as the state it approved. After registration,
any relevant change — implementation bytes (including staged/unstaged/
untracked work, not just HEAD), acceptance criteria, intent, plan/spec/
decision contents, verification-relevant workflow/config/policy, material
evidence — makes the stored verdict **stale**, and a stale PASS-family
verdict cannot satisfy `task complete` (`VERDICT-STATE-STALE`, naming the
changed classes). Bookkeeping-only changes never invalidate: timestamps,
checkbox ticks, completion notes written after verification, status flips,
archive moves, and non-semantic ordering. The lifecycle stays possible:
verify → record → notes → complete → archive, with no circular gate.

## Completion behavior

The completion gate (see `docs/concepts/workflows.md`) denies workflow-task
completion while mandatory evidence is missing or the required verdict is
absent or blocking. A legacy unbound v1 verdict, or a bound verdict whose
state moved on, blocks with `VERDICT-BINDING-MISSING` /
`VERDICT-STATE-STALE` — re-verify (fresh bundle + fresh verdict) to restore
eligibility. Where the effective profile requires a verdict, it requires an
INDEPENDENT one: a same-context or otherwise unproven latest verdict blocks
with `VERDICT-INDEPENDENCE-UNPROVEN`. The verifier role contract says it
plainly: the verifier may inspect intent/spec/plan/diff/tests/evidence,
should not implement the feature it judges, and must emit
`ackit.verdict.v1`. ACKit validates structure and references; semantic
judgment belongs to the fresh verifier.
