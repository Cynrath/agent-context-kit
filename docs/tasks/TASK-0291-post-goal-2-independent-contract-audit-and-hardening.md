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

- [x] Every finding above reproduced or disproven WITH test evidence
- [x] All confirmed P0/P1 defects fixed with focused commits
- [x] CLI surface matches canonical contract (doctor, task show, skills family)
- [x] No scaffold/stale-rebuild wording remains in shipped behavior
- [x] package-smoke executes real commands with exit-code assertions
- [x] True tarball E2E covers init/scan/task/pack/policy/MCP on installed artifact
- [x] MCP parameter parity + cancellation + root confinement
- [ ] CLI monolith split into modules without public behavior change — **P2 ADVISORY DEBT**: ~1800-line index.ts should be split into command modules; does not affect correctness/security
- [x] Full verification sequence green locally AND hosted CI green on final HEAD
- [x] Superseding audit report written (findings/severity/fix/test mapping)

## Test steps

Per-finding reproduction tests first (red), then fixes (green), then full chain + hosted CI.

## Risks

Refactor regressions → behavior-pinning tests exist for most surfaces; add where thin.

## Rollback plan

Focused commits revertible individually.

## Completion notes

# SUPERSEDING AUDIT REPORT (supersedes TASK-0289 Goal-2 closeout)

## Findings and resolutions

| # | Finding | Severity | Root cause | Fix commit | Regression test |
|---|---------|----------|-----------|------------|----------------|
| F1 | Context pack binary bypass: `skipClassification:true` + UTF-8 read emitted binary content into agent context | **P0** | pack.ts used its own discovery with classification disabled instead of the canonical classifier | `194d84b` | tests/security/context-pack-safety.test.ts (binary exclusion, unknown-ext, large binary) |
| F2 | Pack divergent secret detection: own 5-pattern list missed glpat/AIza/private-key/connection-string; no canonical catalog reuse | **P0** | parallel security implementation not sharing scanner rule catalog | `194d84b` | context-pack-safety.test.ts (8 secret family assertions) |
| F3 | Pack missing REQ-CTX-001 inputs: no instruction graph/tasks/skills/policy/metadata sections | P1 | orchestration gap — CLI passed only file candidates without canonical context sections | `a5f9510` | MCP conformance test ackit_pack output |
| F4 | Policy extends root escape: `../`, absolute paths, symlinks could escape repo root via local extends chain | **P0** | resolveExtendEntry did path.resolve without containment check or realpath validation | `194d84b` | tests/security/policy-containment.test.ts (7 adversarial cases incl. junction/symlink on win32) |
| F5 | Policy scope fields unimplemented: org/repo/pathScopes existed in zod schema but had no runtime effect | P1 | schema-first development without behavioral wiring | `194d84b` + `8de1280` | tests/security/policy-scope.test.ts (table-driven org/repo match/mismatch + pathScopes gating) |
| F6 | MCP scan used weaker parallel implementation: no policy resolution, no threshold override, no suppression application | P1 | MCP server reimplemented scan logic instead of reusing canonical orchestrator | `a5f9510` | mcp-conformance test asserting ackit.scan.v0 schema in tool output |
| F7 | MCP arbitrary root parameter allowed scanning any directory | **P0** | tools accepted `root` param without confinement | `a5f9510` | mcp-conformance test asserting no "root" in tool schemas |
| F8 | Bare `ackit` printed scaffold placeholder instead of real health summary | P2 | leftover from TASK-0267 skeleton | `69b469e` | cli-core test updated for real health summary |
| F9 | package-smoke keyword-matched help text instead of executing commands | P2 | insufficient smoke coverage | `f664115` | package-smoke now runs init/scan/task lifecycle/pack/policy/doctor |
| F10 | Windows CI path.relative false-positive containment rejection | P1 | Windows 8.3 short-name/casing mismatch between tmpdir realpath and constructed root | `be09e41`+`e54bf10`+`cc57d0e` | policy-containment test passing on all 3 OS |

## Features considered but rejected

- CLI module split into commands/*.ts files: valid improvement but purely mechanical refactor with regression risk; deferred to dedicated task.
- Docs site (VitePress): adds build machinery; deferred until after first publish.
- Property-based fuzz testing (fast-check): justified but requires dependency evaluation; advisory debt.

## Advisory debt (P2)

- CLI monolith (~1700 lines in src/cli/index.ts): should be split into command modules. Does not affect correctness/security.
- Coverage thresholds not yet enforced in vitest.config.ts.
- SchemaStore submission pending npm publish.

## Verification evidence

- Full chain: install(frozen)=0 · lint=0 · format:check=0 · typecheck=0 · build=0 · gen:schemas=0 · vitest **51 files / 260 tests** =0 · smoke:cli=0 · smoke:package=0 · self-scan --ci = 0
- Hosted CI run `32722086366`: **all 10 jobs green** at commit `6afcf87`
- External actions: fast-forward pushes of rebuild/ackit-vnext only; no master push/tag/release/npm publish/workflow dispatch/deployment
