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
- [x] CLI monolith split into modules without public behavior change — completed 2026-08-25 (see Closure update below; the earlier "P2 ADVISORY DEBT" characterization was wrong and is preserved here only as chronology of the premature closeout)
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

- CLI module split: initially rejected during the first audit round as "purely mechanical refactor" — that rejection was a judgment error; the ~1800-line monolith violated REQ-ARCH-008 and blocked closure. It has since been completed (see Closure update below).
- Docs site (VitePress): adds build machinery; deferred until after first publish.
- Property-based fuzz testing (fast-check): justified but requires dependency evaluation; advisory debt.

## Advisory debt (P2)

- ~~CLI monolith (~1700 lines in src/cli/index.ts)~~ — RESOLVED: split completed (see Closure update).
- Coverage thresholds not yet enforced in vitest.config.ts.
- SchemaStore submission pending npm publish.

## Closure update (2026-08-25): CLI monolith split + pack JSON parity + MCP behavioral cancellation

The three items left open by this audit were completed under `docs/tasks/active/TASK-0002`:

1. CLI split: `src/cli/index.ts` reduced from 1,821 lines / 63,151 bytes to a 23-line bootstrap;
   `src/cli/program.ts` (367 lines) owns Commander registration; 15 cohesive command/shared modules
   under `src/cli/commands/` + `src/cli/{context,errors,output,root}.ts`; largest command module
   183 lines; dependency direction program → commands → shared → core; no cycles; guarded by
   `tests/contract/cli-architecture.test.ts`. Public behavior pinned by existing contract tests.
2. Pack JSON semantic parity: canonical orchestration extracted to
   `src/core/context/orchestrate.ts` (`buildCanonicalContextSections`) used by BOTH the CLI pack
   command and the MCP `ackit_pack` tool; JSON now carries all five context sections plus included
   file content/hash/tokens/bytes; markdown↔JSON semantic selection proven equal by
   `tests/integration/context/pack-parity.test.ts`.
3. Behavioral cancellation: abort checkpoints added through the pack hot path (before/after
   discovery, per section, per candidate before/after reads, before ranking/rendering);
   `tests/integration/mcp/cancellation.test.ts` proves pre-abort refusal, transport-level request
   cancellation with no result returned, and post-cancel server health.

Installed-tarball E2E (`scripts/package-smoke.mjs`) now launches the MCP server from the installed
package over stdio: initialize → tools/list → ackit_scan/ackit_pack/ackit_doctor calls →
resources/list+read → prompts/list+get → clean stdin shutdown, with stdout JSON-RPC purity asserted.
Runs in CI on ubuntu/windows/macos.

## Verification evidence

HISTORICAL (earlier closure state, superseded by the final-evidence block below):

- Full chain: install(frozen)=0 · lint=0 · format:check=0 · typecheck=0 · build=0 · gen:schemas=0 · vitest **51 files / 260 tests** =0 · smoke:cli=0 · smoke:package=0 · self-scan --ci = 0
- Hosted CI run `32722086366`: **all 10 jobs green** at commit `6afcf87`
- External actions: fast-forward pushes of rebuild/ackit-vnext only; no master push/tag/release/npm publish/workflow dispatch/deployment

FINAL EVIDENCE OF THE POST-TASK-0002 CANDIDATE (recorded chronologically by TASK-0003; still not the current HEAD after TASK-0003's repairs):

- vitest at b35ca59c94e78213f31a31e7920fe2f7c42af649: **57 files / 282 tests** green
- Hosted CI run `32787110952`: **all 10 jobs green** at commit `b35ca59`
- An independent audit of this state identified remaining defects (REQ-GOV-007 pack/policy silent catches, false-positive MCP cancellation test, tarball E2E --force success path); repair is owned by docs/tasks/active/TASK-0003-final-independent-closure-repair.md, whose own verification block is the authoritative latest evidence.

## Final MUST audit re-run (2026-08-25, TASK-0003)

Authoritative requirement source: `docs/rebuild/VNEXT_REQUIREMENTS.md` — **114 MUST rows** (the earlier "113" figure undercounted; recount below is generated from the table itself).

| Domain | MUSTs | Evidence class | Concrete artifacts |
|---|---|---|---|
| REQ-GOV (11) | 11 | behavioral + static + process | filesystem-boundary (003/006), context-pack-safety + redact + secrets (004/005), pack-diagnostics + diagnostics + scanner pipeline diagnostics + tasks/lifecycle doctor + watch-rescan diagnostic (007 — repaired this session), init/install no-overwrite (008), POL-OFFLINE-BLOCKED + dependency/static sweep (001/002), session Git record (010), operating procedure (011), live self-dogfood battery exit 0 on this repo (012) |
| REQ-ARCH (12) | 12 | contract tests + static + docs | cli-architecture (008/011), version-single-source (009), cli-dist-contract + tarball-smoke (002/005), tsconfig strict + typecheck (004), engines/matrix (003), ADRs + docs-gate (010/012), package.json dep/tooling review (006/007), build artifacts (001) |
| REQ-FS (6) | 6 | behavioral/security fixtures | walk-limits, classify, ignore, paths, filesystem-boundary |
| REQ-CFG (5) | 5 | behavioral + contract | config schema/load/merge/suggestions, config-check-cli, config-schema |
| REQ-SCAN (7) | 7 | behavioral + contract | scanner pipeline, rules catalog, secrets, findings schema, fingerprints, reports, scan-cli/empty-set |
| REQ-BASE (4) | 4 | behavioral | git, cache hot-path, cache unit, fingerprints |
| REQ-INSTR (9) | 9 | behavioral + contract | instruction primitives/providers/codex/analysis, init managed blocks, docs-gate own-repo shipping |
| REQ-SKILL (6) | 6 | behavioral + e2e | skills validate/install units+integration, cli-scaffold smoke builtins |
| REQ-CTX (5) | 5 | behavioral + security | pack, pack-parity, pack-diagnostics (new), optimize, context-pack-safety |
| REQ-TASKS (4) | 4 | behavioral | tasks lifecycle incl. completion gate + unparsable-doc doctor surfacing (new) |
| REQ-POL (3) | 3 | behavioral + security | policy resolve/forbidden-pattern/wiring/scope/containment |
| REQ-MONO (2) | 2 | behavioral | workspaces |
| REQ-MCP (4) | 4 | behavioral + contract | mcp-conformance, stdio-smoke, cancellation (rewritten deterministic mid-flight this session) |
| REQ-RPT (2) | 2 | behavioral | reports, documents |
| REQ-WATCH (2) | 2 | behavioral | watch, hooks |
| REQ-API (1) | 1 | contract | api-surface |
| REQ-PKG (1) | 1 | e2e | tarball-smoke + package-smoke normal-completion rewrite (this session) |
| REQ-DX (4) | 4 | behavioral + contract | cli-core, cli-dist-contract, exit-codes, version-single-source |
| REQ-ONB (2) | 2 | behavioral + e2e | init integration, cli-scaffold smoke |
| REQ-SEC (5) | 5 | security + contract | THREAT_MODEL coverage gate (001/002), terminal sanitation unit (003), ci-pinning (004/005) |
| REQ-CI (3) | 3 | contract + hosted CI | ci-pinning matrix/job assertions + green hosted runs |
| REQ-TEST (8) | 8 | meta | suite inventory (58 files / 289 tests), focused suites, 3 consecutive green full-suite runs |
| REQ-PERF (1) | 1 | e2e | benchmarks |
| REQ-DOC (4) | 4 | contract | docs-gate |
| REQ-FIN (3) | 3 | gate execution | full local gate + hosted CI executed at closure |

**Matrix result: total MUST = 114 · VERIFIED = 114 · PARTIAL = 0 · MISSING = 0 · STALE-CONTRACT = 0.**

Basis: behavioral verification = the vitest suite plus the two smoke scripts plus the live CLI/MCP battery executed in TASK-0003; deterministic static contracts where runtime behavior is not applicable (architecture budgets, CI pinning, schemas); docs-review only for intrinsically governance/process requirements (REQ-GOV-010/011). Traceability ownership lives in this file's matrices above; behavioral truth lives in the named suites. The final hosted-CI run for the documentation-inclusive HEAD of the repair is recorded in TASK-0003.
