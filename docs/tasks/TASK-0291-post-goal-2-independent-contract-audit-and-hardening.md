# TASK-0291: Post-Goal-2 independent contract audit and hardening

## Metadata

- Parent epic: TASK-0264
- Dependencies: TASK-0265..TASK-0290 (audit subject)
- Unlocks: superseding final audit report
- Requirement IDs: all MUST rows (independent verification sweep) + REQ-CTX-001..004, REQ-POL-*, REQ-MCP-*, REQ-API-001, REQ-PKG-001, REQ-CI-003, REQ-DX-002
- Related ADR/spec: MS§46–48; independent external review findings

## Purpose

Independently prove the vNext product contract from code and observable behavior — not from task checkboxes. Reproduce/disprove known audit findings, fix P0/P1 defects, complete the canonical CLI contract (doctor/task show/skills sync+doctor+scaffold), remove scaffold remnants, make package smoke behavioral, confine MCP root/policy boundaries, split the CLI monolith into modules, and re-run the full gate with hosted CI green.

## Known findings to reproduce/disprove

1. Context pack binary classification bypass (`skipClassification: true` + UTF-8 read).
2. Pack maintains divergent/weak secret detection vs canonical scanner.
3. Pack missing REQ-CTX-001 input sources (instructions/tasks/skills/policy/metadata).
4. `pack --changed` semantics unclear; git failures silently swallowed.
5. Policy local extends root escape (`../../`, absolute, symlink/junction).
6. Policy scope fields (org/repo/pathScopes) declared but unimplemented.
7. Fake canonical roots `{ canonicalPath: rootPath }` bypassing realpath.
8. Missing top-level `doctor`; missing `task show`; missing skills discover/sync/doctor/scaffold.
9. Bare `ackit` still "scaffold"; JSON summary status "scaffold"; stale help footer.
10. package-smoke keyword-matches help text instead of executing commands.
11. MCP: `changed` param ignored; scan parity weaker than CLI; cancellation not propagated; arbitrary `root` param.
12. CLI monolith ~56KB violating module cohesion.

## Out of scope

Publish/tag/release/npm publish/workflow dispatch; LLM/vector/RAG/cloud features (REQ-GOV-009); NuGet channel restoration (legacy, maintainer-deleted).

## Affected files

src/cli/** (refactor), src/core/{context,policy,skills,tasks}/**, src/mcp/**, scripts/package-smoke.mjs, tests/**, docs/**.

## Data/database impact

None.

## Security impact

Closes context-pack secret/binary leakage paths and policy traversal escapes; confines MCP repository scope.

## Permission/auth impact

None.

## Localization impact

None.

## UX impact

Bare ackit becomes a real health summary; complete command families.

## Logging/audit impact

Audit matrix recorded in this doc; regression tests pin every fix.

## Acceptance criteria

To be filled progressively as findings are confirmed/fixed; each carries its own regression test. Final state:

- [ ] Every finding above reproduced or disproven WITH test evidence
- [ ] All confirmed P0/P1 defects fixed with focused commits
- [ ] CLI surface matches canonical contract (doctor, task show, skills family)
- [ ] No scaffold/stale-rebuild wording remains in shipped behavior
- [ ] package-smoke executes real commands with exit-code assertions
- [ ] True tarball E2E covers init/scan/task/pack/policy/MCP on installed artifact
- [ ] MCP parameter parity + cancellation + root confinement
- [ ] CLI monolith split into modules without public behavior change
- [ ] Full verification sequence green locally AND hosted CI green on final HEAD
- [ ] Superseding audit report written (findings/severity/fix/test mapping)

## Test steps

Per-finding reproduction tests first (red), then fixes (green), then full chain + hosted CI.

## Risks

Refactor regressions → behavior-pinning tests exist for most surfaces; add where thin.

## Rollback plan

Focused commits revertible individually.

## Completion notes

(placeholder)
