---
schemaId: "ackit.intent.v1"
id: "INTENT-0001"
title: "Final validation of the workflow expansion feature branch"
status: accepted
createdAt: "2026-09-01"
source: "user final-validation session mandate (expansion prompt §0/§10/§14)"
problem: "The feature branch feat/workflow-expansion was reported GO, but the reported final SHA has no CI evidence, the scan --ci gate exits 1 on the branch while master exits 0 (a regression the prior report mislabeled as baseline parity), the prior GO relied on a dogfood task (TASK-0062) that was itself not workflow-enabled (no intent, no workflow state, no evidence registry at bundle time), and the CORE PRODUCT TEST exercises the fresh-process resume property only through in-process CLI invocations."
desiredOutcome: "The branch is genuinely merge-ready: scan --ci exits 0 on the branch exactly as on master; a real workflow-enabled repository task with intent, workflow state, evidence registry, fresh independent verdict, and completion-gate enforcement dogfoods the new system on this very validation; the core product e2e proves at least one actual child-process resume path; a PR to master exists with green required CI on the exact final SHA; and a fresh independent verifier issues a non-blocking ackit.verdict.v1 registered through the real flow."
constraints:
  - "task-first: no implementation before the corrective task is fully populated and committed"
  - "no merge to master, no publish, no tags, no force-push, no history rewrite"
  - "master scan baseline must remain green; the fix may not weaken or suppress the scanner rule"
  - "no network/telemetry in product code; offline-egress gate must stay green"
  - "legacy repository behavior must remain identical (compat tests green)"
nonGoals:
  - "Browser Companion (paused, separate branch, fully out of scope)"
  - "new product features beyond the narrowly scoped corrections this validation requires"
  - "changing the scan policy definition or CI gate structure"
affectedSystems:
  - "src/core/intent (finding-code constant refactor only, public surface unchanged)"
  - "src/core/scanner (no change)"
  - "tests/e2e (child-process resume scenario)"
  - "tests/contract (readme-parity pack race)"
  - "docs/tasks, docs/intent, docs/evidence"
acceptanceCriteria:
  - id: "AC-001"
    requirement: "scan --ci exits 0 on the feature branch with the same command that exits 0 on master, without weakening the scanner or its policy; the diff of unsuppressed findings between branches is zero"
  - id: "AC-002"
    requirement: "At least one real workflow-enabled repository task (intent ref, workflow state, evidence registry, verdict, completion gate) dogfoods the new system end-to-end for this validation and its bundle shows non-empty intent and workflow sections"
  - id: "AC-003"
    requirement: "The core product e2e demonstrates a genuine child-process resume (spawned OS process, no shared JS memory) producing the same resume result, or an explicit documented limitation if technically unreasonable"
  - id: "AC-004"
    requirement: "A PR from feat/workflow-expansion to master exists and every required check is green on the exact final SHA; the final report records run IDs, job names, and conclusions"
  - id: "AC-005"
    requirement: "A fresh independent verifier issues ackit.verdict.v1 PASS or PASS_WITH_WARNINGS with zero blocking findings on the final candidate SHA, registered through the real ACKit verification flow"
  - id: "AC-006"
    requirement: "Stale/misleading claims in prior task completion notes and TASK-0062 report text are corrected in committed documentation; final report format of the validation session is complete"
openQuestions: []
risks:
  - "PR CI may surface platform-specific failures (Windows/mac/linux matrix) not visible locally; fix task-first if they appear"
  - "child-process e2e on Windows requires shell quoting care"
  - "readme-parity pack race fix must not weaken the parity assertion itself"
---

# Final validation of the workflow expansion feature branch

## Notes

- Governing prompt: final validation session for the Workflow / Verification /
  Evidence / Resumability expansion (feat/workflow-expansion → master).
- §0 of the mandate identified three unresolved facts: missing exact-SHA CI
  evidence, a mislabeled scan --ci failure, and an incomplete self-dogfood.
- Deterministic master-vs-feature scan comparison (JSON fingerprints,
  rule|relativePath|line|column) established that master exits 0 with
  159 findings and the feature branch exits 1 with 164 findings: four new
  suppressed ACKIT001 fixture rows (tests) plus one new unsuppressed ACKIT003
  HIGH finding in `src/core/intent/types.ts:69`. The prior "identical
  pre-existing finding set" claim in TASK-0060/0062 notes is therefore false
  and this intent exists to correct it.
