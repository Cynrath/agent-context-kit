# AgentContextKit vNext — Traceability Matrix

Companion to `VNEXT_REQUIREMENTS.md` (forward mapping lives there, one owner per requirement row). This file provides the inverse index, ADR linkage, verification classes, evidence slots, and the deterministic coverage invariants enforced before Goal 2 may start and at every final gate.

## Coverage invariants (must hold at all times)

```text
unmapped requirements                        = 0
tasks without acceptance criteria            = 0
implementation tasks without test plan       = 0
unknown task dependencies                    = 0
dependency cycles                            = 0
tasks referencing nonexistent REQ IDs        = 0
REQ IDs referencing nonexistent tasks        = 0
```

Check: `docs/rebuild/scripts/check-traceability.ps1` (or manual table audit recorded in evidence) — verifies every `REQ-*` token appearing in a task Metadata exists in requirements, and every owner listed in requirements appears in some task.

## Inverse index — Task → Requirements

| Task | Domain | Requirement IDs |
|---|---|---|
| TASK-0264 | epic | ALL (container; completes when FIN gates pass) |
| TASK-0265 | preflight | REQ-GOV-010, REQ-ARCH-001, REQ-ARCH-002 |
| TASK-0266 | architecture | REQ-ARCH-001/002/003/005/006/010/012, REQ-CFG-001, REQ-DX-004 |
| TASK-0267 | skeleton | REQ-ARCH-001/004/005/007/008, REQ-DX-001/002/003, REQ-DOC-003 |
| TASK-0268 | filesystem | REQ-FS-001..FS-006 (explicit in task), REQ-GOV-003/006/007, REQ-SEC-003 |
| TASK-0269 | config | REQ-CFG-001..005 |
| TASK-0270 | scan core | REQ-SCAN-001/002/007, REQ-DX-001 |
| TASK-0271 | rules/secrets | REQ-SCAN-003/004/005, REQ-FS-004 |
| TASK-0272 | instruction graph | REQ-INSTR-001..005 |
| TASK-0273 | conflicts/staleness | REQ-INSTR-006, REQ-SCAN-006 |
| TASK-0274 | skills parser | REQ-SKILL-001/005/006 |
| TASK-0275 | skills install/builtins | REQ-SKILL-002/003/004, REQ-GOV-008 |
| TASK-0276 | init/onboarding | REQ-INSTR-007/008/009, REQ-ONB-001/002 |
| TASK-0277 | context pack | REQ-CTX-001..004, REQ-GOV-004 |
| TASK-0278 | optimize | REQ-CTX-005 |
| TASK-0279 | git/cache/baseline | REQ-BASE-001..004 |
| TASK-0280 | monorepo | REQ-MONO-001/002 |
| TASK-0281 | task system | REQ-TASKS-001..004 |
| TASK-0282 | policy | REQ-POL-001..003 |
| TASK-0283 | MCP | REQ-MCP-001..004 |
| TASK-0284 | reporting/watch/hooks | REQ-RPT-001/002, REQ-WATCH-001/002 |
| TASK-0285 | package/API | REQ-API-001, REQ-PKG-001, REQ-ARCH-009, REQ-CI-003 |
| TASK-0286 | CI/supply chain | REQ-CI-001/002, REQ-SEC-004/005 |
| TASK-0287 | README/docs | REQ-DOC-001..004, REQ-SEC-001/002 |
| TASK-0288 | performance | REQ-PERF-001 |
| TASK-0289 | final gate | REQ-FIN-001..003, REQ-GOV-012 |
| TASK-0290 | bootstrap CI | REQ-CI-001 (minimal matrix subset), REQ-GOV-010, REQ-GOV-011 |

## Global invariants ownership

Global invariants are not single-task features; they are asserted continuously:

| Invariant group | Enforced by |
|---|---|
| REQ-GOV-001/002 (offline/no telemetry) | every impl task code review + network-spy tests (TASK-0282 pattern), final gate sweep |
| REQ-GOV-003/006 (root safety/cycles) | TASK-0268 engine + consumers |
| REQ-GOV-004/005 (path/secret leakage) | TASK-0270 redaction boundary + per-artifact security tests |
| REQ-GOV-007 (no silent errors) | shared diagnostics module (TASK-0267) |
| REQ-GOV-008 (no overwrite default) | TASK-0275/0276 write boundaries |
| REQ-GOV-009 (out-of-scope) | scope sections of every task; grep-gate at TASK-0289 |
| REQ-GOV-010 (external actions ban) | standing rule; asserted in TASK-0265/0289 evidence |
| REQ-GOV-011 (continuous loop discipline) | Goal 2 operating procedure |
| REQ-GOV-012 (self-dogfood) | TASK-0281 schema test on own repo + TASK-0289 gate |

## ADR linkage

| ADR | Area | Primary verifying tasks |
|---|---|---|
| ADR-0001 | TS/Node/toolchain | 0266, 0267 |
| ADR-0002 | single package | 0267, 0285 |
| ADR-0003 | offline-first | all; spy tests 0282; gate 0289 |
| ADR-0004 | config identity | 0269 |
| ADR-0005 | fs boundary | 0268 (+consumers) |
| ADR-0006 | instruction graph | 0272, 0273 |
| ADR-0007 | exit codes | 0267 plumbing; asserted by all command tests |
| ADR-0008 | official MCP SDK | 0283 |
| ADR-0009 | scan/rule IDs | 0270, 0271 |
| ADR-0010 | skills model | 0274, 0275 |
| ADR-0011 | policy/plugin boundary | 0282 |
| ADR-0012 | context/cache | 0277, 0279 |
| ADR-0013 | distribution/versioning | 0266, 0285 |

## Verification class matrix

| Class | Applied in |
|---|---|
| unit | 0268, 0269, 0271, 0272, 0273, 0274, 0277, 0279, 0281, 0282, 0284 |
| integration | 0268, 0270, 0272, 0275, 0276, 0278, 0279, 0280, 0281, 0282, 0284 |
| security fixtures | 0268 (cross-platform via TASK-0290 CI), 0271, 0273, 0274, 0277, 0284, final sweep 0289 |
| contract/snapshot | 0270, 0272, 0279, 0281, 0283, 0285 |
| e2e/tarball | 0285, 0289 |
| cli-smoke | 0267, 0270, 0277, 0284, 0285, 0289 |
| ci-config | 0290 (bootstrap), 0286 (final hardening) |
| docs-review | 0266, 0287, 0289 |

## Completion evidence

Each task records detailed evidence in its own Completion notes (commands +
exit codes + artifact paths under gitignored `artifacts/`). Closeout summary
(Goal 2, branch `rebuild/ackit-vnext`):

| Task | Evidence summary | Commit / Run |
|---|---|---|
| TASK-0265 | preflight baseline artifacts + doctor/scan exit 0 | b6d02b7 |
| TASK-0266 | ADRs accepted; Node/MCP/npm registry verification | 84272d8 |
| TASK-0267 | TS skeleton; 20 tests; removal list | b58cd66 |
| TASK-0290 | bootstrap CI 6/6 green (run 32591587589) | f6e6f19 |
| TASK-0268 | fs engine; security fixtures; cross-platform fixes | 7adf832 + d9f4904 |
| TASK-0269 | config engine + schemas + config check CLI | cefc010 |
| TASK-0272 | instruction graph + provider adapters | 3b27f43 |
| TASK-0274 | skills parser/validator | 29fe9d2 |
| TASK-0270 | scan pipeline + finding contract + reporters | 8837041 |
| TASK-0271 | rule catalog ACKIT001..099 + suppression advisory | ed34678 |
| TASK-0273 | instruction analysis ACKIT300..314 | cea05ff |
| TASK-0275 | builtin skills + ownership lock | ba9929f |
| TASK-0281 | task system commands + completion gate | 44ae0d5 |
| TASK-0276 | init lifecycle + managed blocks | 75a2186 |
| TASK-0277 | context pack engine | ba6daf1 |
| TASK-0279 | git incremental/cache/baseline | 22a08a1 |
| TASK-0282 | offline policy engine + digest | bdd85a9 |
| TASK-0280 | monorepo detection + path scoping | 3e9fda2 |
| TASK-0278 | optimize advisor + fenced fix | 83bbb49 |
| TASK-0283 | MCP official SDK stdio server | ec18093 |
| TASK-0284 | SARIF/MD/HTML reports + watch + hooks | 547cb24 |
| TASK-0285 | public API + files whitelist + tarball smoke | 9125319 |
| TASK-0287 | README/canonical docs/threat model | fa4147c |
| TASK-0286 | CI hardening; hosted run 32607804222 all green | 2063daf/34ae00c |
| TASK-0288 | benchmark suite + baseline JSON | 586ab23 |
| TASK-0289 | final gate + MS§48 report | see task doc |

Invariants at closeout: unmapped requirements = 0 · dependency cycles = 0 ·
tasks without acceptance criteria = 0 · implementation tasks without test plan = 0.

## Post-goal closure addendum (2026-08-25)

Post-goal-2 audit work is tracked outside the historical wave table:

| Task | Scope | Location |
|---|---|---|
| TASK-0291 | independent contract audit + hardening; superseding report | `docs/tasks/TASK-0291-*.md` |
| TASK-0001 | round-2 P0/P1 repairs; records an invalid forced close (historical evidence, remains `blocked` truthfully) | `docs/tasks/active/TASK-0001-*.md` |
| TASK-0002 | final closure: CLI monolith split, pack JSON semantic parity, MCP behavioral cancellation, tarball MCP E2E | `docs/tasks/active/TASK-0002-*.md` |

Historical vNext wave tasks (`docs/tasks/TASK-0264..0291`) are flat-format
documents from the Goal-2 era; the vNext TaskStore lifecycle (active/archive,
start/complete gate) governs only the `docs/tasks/active` set. Both eras coexist
as documented history; neither pretends to be validated by the other's tooling.

## Old v1 task classification (`docs/tasks/TASK-0001..0263`, `PROJECT-CONTROL-*`)

302 historical files reviewed by name/domain; none block vNext. vNext child IDs are exclusively the new ackit-generated TASK-0264..0290 (TASK-0290 added post-planning with a tool-allocated ID to close the CI sequencing gap) — no v1 ID is reused for different work.

| Class | Items | Disposition |
|---|---|---|
| REUSE | none at ID level; concepts only (task-first/docs-first workflow, exit-code standardization experience from TASK-0019, report UX lessons from TASK-0020/0025) | carried into requirements/ADRs |
| REFERENCE_ONLY | TASK-0019, TASK-0020, TASK-0022, TASK-0040..0045 (release hygiene evidence), TASK-0233 (perf evidence method), TASK-0044 (codex integration learnings) | cite if needed during implementation; never reopen |
| SUPERSEDED_BY_VNEXT | TASK-0001..0257 product-line tasks; TASK-0258..0262 ackit-optimize (C#); PROJECT-CONTROL-0001..0110 control series | archived evidence of frozen v1 line (v1.0.0-rc.1 immutable) |
| OBSOLETE_FOR_VNEXT | TASK-0030, TASK-0031 (optional LLM provider abstraction — contradicts REQ-GOV-009 out-of-scope), PROJECT-CONTROL-0109/0110 custom MCP prototype steps (contradict REQ-MCP-001 official-SDK-only) | do NOT port; decisions superseded by ADR-0008/GOV-009 |
| BLOCKER | none | — |

Release immutability guardrails inherited unchanged: published NuGet versions/tags/releases for v1 remain untouchable regardless of branch rebuild.
