# End-to-End Workflow Example

This walkthrough is a **reproducible command transcript** — every command below
was executed verbatim on a fresh fixture repository (git init + one commit +
`README.md`), and the outputs shown are the real outputs. It exercises the
entire lifecycle: user request → intent → validation → task → workflow →
implementation → evidence → checkpoint → resume (provider switch) →
verification bundle → fresh verifier verdict → completion gate.

Setup for the fixture:

```
git init && git config user.email a@b.c && git config user.name a
echo "# demo" > README.md && git add . && git commit -m init
```

## 1. Agent A records the intent

```
$ ackit intent new "Ship the deployment guard"
created INTENT-0001 — Ship the deployment guard (docs/intent/INTENT-0001-ship-the-deployment-guard.md)
```

The agent authors the frontmatter (ACKit validates, never infers):

```yaml
schemaId: "ackit.intent.v1"
id: "INTENT-0001"
title: "Ship the deployment guard"
status: accepted
createdAt: "2026-09-01"
source: "user request"
problem: "Deployments run untested changes."
desiredOutcome: "The gate blocks completion without evidence and a fresh verifier verdict."
nonGoals: ["No deployment automation"]
affectedSystems: ["src/deploy"]
acceptanceCriteria:
  - id: "AC-001"
    requirement: "The guard blocks unevidenced completions"
  - id: "AC-002"
    requirement: "A fresh verifier verdict gates completion"
```

```
$ ackit intent validate
all intents OK
$ ackit intent fingerprint INTENT-0001
INTENT-0001: 41f6da4e9143ba4c069e1a86c322db667c1e468331749eb9de56000bf664feec
```

## 2. Task + workflow selection

```
$ ackit task create "Deployment guard" --intent INTENT-0001
created TASK-0001 — Deployment guard (docs/tasks/active/TASK-0001-deployment-guard.md)
$ ackit workflow set TASK-0001 --profile standard
TASK-0001: workflow set to standard (stage intent)
$ ackit task start TASK-0001
TASK-0001: started
```

The agent fills the task body (scope, criteria, notes) and adds a plan
reference (`planRef: docs/plans/guard.md` in the frontmatter; the plan file
must exist — doctor validates it).

## 3. Plan-first advancement (presence-gated)

```
$ ackit workflow advance TASK-0001
TASK-0001: advanced to plan
$ ackit workflow advance TASK-0001
TASK-0001: advanced to tasks
$ ackit workflow advance TASK-0001
TASK-0001: advanced to implement
```

## 4. Implementation + evidence

```
$ ackit evidence sync TASK-0001
TASK-0001: evidence registry synced (2 criterion/criteria)
$ ackit evidence verify TASK-0001 --criterion AC-001 --type test \
    --ref "pnpm test (guard suite green)"
TASK-0001: AC-001 verified with test evidence
$ ackit evidence verify TASK-0001 --criterion AC-002 --type test \
    --ref "verification record flow exercised"
TASK-0001: AC-002 verified with test evidence
```

## 5. Agent A checkpoints and the session ends

```
$ ackit checkpoint create TASK-0001 \
    --next-objective "Advance to verify and obtain the fresh verdict" \
    --next-path "src/deploy/guard.ts" \
    --next-command "ackit verification bundle TASK-0001" \
    --next-expected "bundle emitted"
TASK-0001: checkpoint CP-0001 created (1 completed / 1 pending)
```

Completion is **denied** at this point — evidence is recorded but no verdict
exists and the stage is still `implement`:

```
$ ackit task complete TASK-0001
completion gate blocked: MISSING_VERIFIER_VERDICT: profile 'standard' requires
an independent verdict (run 'ackit verification bundle' + record);
WORKFLOW_STAGE_INVALID: stage 'implement' is before completion stage 'verify'
```

## 6. Agent B (different model/provider) resumes

No conversation history exists. Agent B loads the same repository state:

```
$ ackit task resume TASK-0001
# Resume TASK-0001
Task: TASK-0001 — Deployment guard [active]
Workflow: standard (stage implement)
Intent: INTENT-0001
Intent summary: Deployments run untested changes. → The gate blocks completion
without evidence and a fresh verifier verdict.
## Completed work
- The guard blocks unevidenced completions
## Pending work
- A fresh verifier verdict gates completion
## Next action
Advance to verify and obtain the fresh verdict
File: src/deploy/guard.ts
Command: ackit verification bundle TASK-0001
Expected result: bundle emitted
```

`ackit pack --task TASK-0001 --resume` builds the full task-aware context pack
with this resume section embedded.

For a portable, verification-bound transfer (digests travel with the
context), export and re-validate instead of copying prose:

```
$ ackit checkpoint export TASK-0001 --format json --out .ackit/reviews/handoff-1.json
handoff written to .ackit/reviews/handoff-1.json
$ ackit checkpoint import .ackit/reviews/handoff-1.json
TASK-0001: handoff CP-0001 fresh (bundle 9f2c…)
# ... resume context renders ...
```

The import refuses moved state with `VERDICT-STATE-STALE` (exit 1) instead
of resuming silently stale work; see `docs/concepts/checkpoints.md`.

## 7. Verification + fresh verdict

```
$ ackit evidence validate TASK-0001
TASK-0001: evidence complete — all criteria verified
$ ackit workflow advance TASK-0001
TASK-0001: advanced to verify
$ ackit workflow verify TASK-0001 --outcome pass
TASK-0001: verification attempt recorded (pass); stage verify
$ ackit verification bundle TASK-0001 --out docs/bundle-1.md
verification bundle written to docs/bundle-1.md
```

A **fresh-context verifier** consumes the bundle (intent + fingerprint,
workflow + gate requirements, task doc, criteria + evidence, verifier role
contract) and emits `ackit.verdict.v1`:

```yaml
schemaId: "ackit.verdict.v1"
taskId: "TASK-0001"
verdict: "PASS"
verifier: { agent: "fresh-verifier/1.0", context: "fresh", issuedAt: "2026-09-01" }
findings: []
checkedCriteria: ["AC-001", "AC-002"]
summary: "both criteria verified with recorded evidence"
```

```
$ ackit verification record TASK-0001 --verdict docs/verdict-1.yaml
TASK-0001: verdict VR-0001 registered (PASS)
```

## 8. Completion gate passes

The agent ticks the second criterion checkbox in the task doc (the human
checklist still applies), then:

```
$ ackit task complete TASK-0001
TASK-0001: completed
```

The sanitized local journal captured every observable transition:

```
$ ackit journal show --limit 8
11 task-transition      {"to":"completed","taskId":"TASK-0001"}
10 verdict-registered   {"taskId":"TASK-0001","verdict":"PASS"}
9  verification-attempt {"taskId":"TASK-0001","outcome":"pass"}
8  workflow-stage       {"taskId":"TASK-0001","profile":"standard","stage":"verify"}
7  checkpoint-created   {"taskId":"TASK-0001","checkpoint":"CP-0001"}
6  evidence-registered  {"taskId":"TASK-0001","criterion":"AC-002","type":"test"}
5  evidence-registered  {"taskId":"TASK-0001","criterion":"AC-001","type":"test"}
4  workflow-stage       {"taskId":"TASK-0001","profile":"standard","stage":"implement"}
```

## The denial paths (by design)

- Missing mandatory evidence → completion denied (exit with
  `REQUIRED_EVIDENCE_MISSING` / `CRITERION_UNVERIFIED`).
- Verdict `REWORK_REQUIRED` or blocking findings → completion denied
  (`VERDICT_BLOCKING`).
- Latest verification attempt `fail` → denied (`VERIFICATION_ATTEMPT_FAILED`).

`VERIFY failed → task completed` is structurally impossible for
workflow-enabled tasks.
