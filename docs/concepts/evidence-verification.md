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

The bundle contains exactly the relevant material — intent summary +
fingerprint, workflow profile/stage + gate requirements, the full task
document, criteria + evidence, registered verdicts, the latest checkpoint,
the implementation surface (declared scope vs changed files; capped optional
diff), and the embedded verifier role contract. It is never a repository
dump, and the canonical secret gate runs over its output.

## Verdicts (`ackit.verdict.v1`)

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
PASS-family verdict are all rejected with stable codes. The store is
append-only: a REWORK verdict is never overwritten, only superseded by a
later registered verdict.

```
ackit verification record TASK-0007 --verdict docs/verdict-7.yaml
ackit verification show TASK-0007
```

## Completion behavior

The completion gate (see `docs/concepts/workflows.md`) denies workflow-task
completion while mandatory evidence is missing or the required verdict is
absent or blocking. The verifier role contract says it plainly: the verifier
may inspect intent/spec/plan/diff/tests/evidence, should not implement the
feature it judges, and must emit `ackit.verdict.v1`. ACKit validates structure
and references; semantic judgment belongs to the fresh verifier.
