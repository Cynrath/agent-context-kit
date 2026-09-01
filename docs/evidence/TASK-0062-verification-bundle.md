schema: ackit.verification-bundle.v1
task: TASK-0062

# ACKit Verification Bundle

You are an INDEPENDENT verifier with a fresh context. Review the material
below, judge semantic compliance against the acceptance criteria, and emit
an ackit.verdict.v1 verdict (PASS | PASS_WITH_WARNINGS | REWORK_REQUIRED |
BLOCKED). You should not implement the feature you are judging.

## Intent

(no intent referenced)

## Workflow

(no workflow state — legacy task)

## Task document

source: docs/tasks/active/TASK-0062-final-integration-verification-and-go-no-go.md [active]

````

## Purpose

Dogfood the new verifier flow against the expansion itself (§28) and render the final decision: run the CORE PRODUCT TEST end-to-end, build the verification bundle for this final integration task, obtain a fresh-context independent verifier verdict, and record GO or NO-GO with the verdict stored. A blocking verdict means NO-GO and the implementation agent must not overwrite it.

## Scope

- Run the CORE PRODUCT TEST scenario end-to-end on a controlled fixture repository: Agent A (intent → tasks → partial implementation → evidence → checkpoint), simulate session end (fresh processes only), Agent B (resume context → continue from recorded next action → finish), evidence verification, verification bundle, fresh verifier verdict, completion gate pass; and the two denial paths (missing evidence → denied; REWORK_REQUIRED verdict → denied).
- Build `ackit verification bundle TASK-0062` for this very task with the real repository state (intent/ADR refs, task chain, diff range, evidence from TASK-0060 gate run, benchmark numbers).
- Use a fresh-context verifier agent (background subagent with no shared conversation) to review the bundle and emit `ackit.verdict.v1`; register the verdict via `ackit verification record`; store the verdict file durably (export path under `docs/` evidence location committed for auditability of the final decision).
- Produce the final report (architecture, tasks/dependencies/statuses, new contracts, CLI/SDK/MCP additions, resumability evidence, verification behavior, drift codes, security results, test commands + pass counts, benchmark values, CI evidence, remaining limitations, GO/NO-GO).
- Final gate run on the final SHA: lint, format:check, typecheck, build, full test, gen:schemas diff-clean, smoke:cli, smoke:package, offline-egress, doctor, task doctor, scan --ci, git diff --check; push feature branch and record CI run IDs if network/gh available (feature-branch push only; master/publish/tag actions remain user-authorized and out of scope).

## Out of scope

- Any master merge/push, tag, publish, release, or history rewrite (user-authorized only).
- Any new feature code — integration/verification only; discovered defects loop back through the owning task.

## Affected files

- `tests/e2e/core-product-test.mjs` (new, or vitest e2e spec) — the scripted scenario
- Verdict export file (committed under `docs/evidence/` or exported bundle artifact as designed in TASK-0052)
- Final report location: task completion notes + goal completion report

## Acceptance criteria

- [ ] CORE PRODUCT TEST passes end-to-end as an automated/reproducible scenario including both denial paths and the provider-switch resume (no conversation-state dependence).
- [ ] Verification bundle for TASK-0062 built; fresh-context verifier verdict registered and stored; verdict is `PASS`/`PASS_WITH_WARNINGS` with no blocking findings (else NO-GO with the concrete blockers recorded).
- [ ] Full final gate suite green on the final SHA with recorded outputs; CI evidence recorded if push possible.
- [ ] Final report complete per §29 with actual measured values and explicit remaining limitations.

## Test steps

1. `node tests/e2e/core-product-test.mjs` (or `pnpm vitest run tests/e2e`) — scenario green
2. Full gate sequence as in TASK-0060 step list on the final SHA
3. `ackit verification bundle TASK-0062 --out ...` → fresh verifier → `ackit verification record`
4. Record GO/NO-GO with evidence.

## Security considerations

- The verifier must be genuinely fresh-context (no shared conversation with the implementer); the implementation agent must not edit/soften the verdict file after issuance (append-only store semantics enforce this).

## Risks

- Blocking verdict from the verifier — by design: it means NO-GO and concrete rework; not a process failure.
- E2E scenario flakiness on git-dependent assertions — deterministic fixture git repo (init + fixed commits) avoids environment coupling.

## Rollback plan

No code rollback expected; a NO-GO produces a rework task chain instead.

## Completion notes

(placeholder)

````

## Acceptance criteria + evidence

(no evidence registry — run 'ackit evidence sync')

## Registered verdicts

(no verdicts registered yet — you are the fresh verifier)

## Latest checkpoint

(no checkpoint)

## Implementation surface

declared affected areas: `tests/e2e/core-product-test.mjs` (new, or vitest e2e spec) — the scripted scenario, Verdict export file (committed under `docs/evidence/` or exported bundle artifact as designed in TASK-0052), Final report location: task completion notes + goal completion report
current changed/untracked files (2): docs/tasks/active/TASK-0062-final-integration-verification-and-go-no-go.md, tests/e2e/core-product-test.test.ts

## Implementation diff

(diff omitted — pass --diff for the capped full diff)

## Verification-point gate requirements

- artifacts: task
- note: verification bundles carry the task's declared requirements

## Verifier role contract

verifier: Independent Verifier (ackit.role.v1)
Judges the implementation against the acceptance criteria with a fresh context; never implements what it judges.
required inputs: intent, spec, plan, task, diff, tests, evidence
allowed: inspect intent, spec, plan, task, diff, tests, and evidence; read repository content; emit an ackit.verdict.v1 verdict
forbidden: implement or modify the feature under judgment; edit source files; register evidence for the task being judged
required outputs: ackit.verdict.v1 verdict

## Verdict instructions

- Compare the implementation surface, diff, and evidence against every criterion.
- Blocking findings must carry the criterion id and a stable upper-snake code.
- PASS-family verdicts cannot carry blocking findings (registration rejects them).
- Register your verdict with: ackit verification record <task> --verdict <file>
