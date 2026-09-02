# Intent

An intent is a committed, schema-versioned record of *why* work is being done
(`ackit.intent.v1`, ADR-0025). It survives context compaction, new chats,
model switches, and provider switches — any fresh agent can load it and
understand the original problem, desired outcome, and acceptance criteria.

ACKit validates, normalizes, fingerprints, and references intents. It never
generates or infers them — that is the coding agent's job.

## When you need one

- `quick` profile: no intent required.
- `standard`: the `intent` stage requires an accepted intent referenced by
  the task (`intentRef`).
- `high-risk`: same, and the `spec` stage additionally requires `specRefs`.

Do not create intent documents for trivial operations when the selected
profile does not require one.

## Document shape

Intent documents live in `docs/intent/INTENT-####-slug.md` with strict
frontmatter:

```yaml
schemaId: "ackit.intent.v1"
id: "INTENT-0003"
title: "Cut cold scan time on large repositories"
status: accepted          # draft | accepted | superseded
createdAt: "2026-09-01"
source: "user request #42"
problem: "Cold scans exceed the CI budget on 10k-file repositories."
desiredOutcome: "Cold scan under 10s on the medium fixture class."
constraints:
  - "No network access (offline-first invariant)"
nonGoals:
  - "No rewrite of the ignore engine"
affectedSystems:
  - "src/core/scanner"
  - "src/core/cache"
acceptanceCriteria:
  - id: "AC-001"
    requirement: "Cold scan < 10s on the medium fixture"
  - id: "AC-002"
    requirement: "Zero behavior changes to findings"
openQuestions: []
risks:
  - "Cache invalidation complexity"
```

The prose body below the frontmatter carries human context. Validation is
strict: unknown fields are rejected, and secret-shaped content fails
validation (`ackit intent validate`) so an intent can never leak a credential
into packs, checkpoints, or verifier bundles.

## Fingerprints

`ackit intent fingerprint INTENT-0003` prints a sha256 over the *normalized*
intent (whitespace collapsed, lists deduped + sorted, criteria ordered). The
fingerprint is machine-path-independent: identical content yields the same
value on any machine, and any semantic change changes it. Bundles embed it so
a verifier can confirm the intent it reviewed matches the registered one.

## Referencing from tasks

```
ackit task create "Faster cold scans" --intent INTENT-0003 \
  --spec docs/specs/perf.md --plan docs/plans/scan-perf.md
```

`ackit task doctor` validates that `intentRef` resolves to an existing intent
and that spec/decision/plan references exist inside the repository
(containment-checked — traversal and absolute paths are rejected).
