# AgentContextKit v0.2.0 — Traceability Matrix

Companion to `REQUIREMENTS.md` (forward map). This file provides the inverse index, ADR linkage, verification class matrix, and the deterministic coverage invariants enforced before implementation starts and at the final gate.

## Coverage invariants (must hold at all times)

```text
unmapped requirements                        = 0
tasks without acceptance criteria            = 0
implementation tasks without test plan       = 0
unknown task dependencies                    = 0
dependency cycles                            = 0
tasks referencing nonexistent REQ IDs        = 0
REQ IDs referencing nonexistent tasks        = 0
no v0.3/v0.4 split                           = 0  (every task release: v0.2.0)
```

Check scripts: `node dist/cli/index.js task doctor` (ID allocation + deps) + custom `scripts/check-v020-traceability.mjs` (REQ↔task ↔ ADR ↔ docs cross-check) + dependency-cycle detection via `scripts/check-execution-order.mjs` (topological sort). All green is a prerequisite for execution start.

## Requirement → Task forward index (from REQUIREMENTS.md) — ACTUAL ALLOCATED IDs

| Requirement | Epic | Task | Title (shorthand) |
|---|---|---|---|
| REQ-V020-GOV-001..010 | GLOBAL | all impl tasks TASK-0007..0024 | offline/determinism invariants (asserted continuously) |
| REQ-V020-A-001..006 | A Readiness | TASK-0008 | Readiness / context-quality scoring engine |
| REQ-V020-B-001..005 | B Optimize v2 | TASK-0009 | Optimize v2: explain + fix plan with filters and waste estimates |
| REQ-V020-C-001..005 | C Profiles | TASK-0010 | Provider-aware context profiles |
| REQ-V020-D-001..003 | D Graph v2 | TASK-0011 | Instruction graph v2 |
| REQ-V020-E-001..003 | E Rule packs | TASK-0012 | Declarative rule packs / policy packs |
| REQ-V020-F-001..003 | F GitHub Action | TASK-0014 | Official GitHub Action |
| REQ-V020-G-001 | G Watch (engine) | TASK-0015 | Watch / incremental live engine |
| REQ-V020-G-002..004 | G Dashboard | TASK-0016 | Local dashboard / report server |
| REQ-V020-H-001..002 | H Diagnostics | TASK-0017 | Diagnostics / observability (sanitized bundle) |
| REQ-V020-I-001..003 | I Benchmarks | TASK-0018 | Performance benchmark system |
| REQ-V020-J-001..003 | J SDK | TASK-0013 | Public SDK v1 stabilization |
| REQ-V020-K-001/003 | K VS Code (found) | TASK-0019 | VS Code extension — foundation & packaging |
| REQ-V020-K-002 | K VS Code (feat) | TASK-0020 | VS Code extension — feature integration |
| REQ-V020-L-001..002 | L Security | TASK-0021 | Cross-cutting security hardening |
| REQ-V020-M-001..002 | M Docs/Examples | TASK-0022 | Documentation / examples / migration |
| REQ-V020-N-001..002 | N Release | TASK-0024 | v0.2.0 release readiness & evidence |
| cross-cutting | — | TASK-0007 | v0.2.0 requirements + architecture baseline (planning roll-up, execution preflight) |
| cross-cutting | — | TASK-0023 | Full integration & consumer test matrix |

Note: TASK-0007 is the short bootstrap implementation after planning completes: it re-confirms the architecture baseline, pins any last dependency versions, and unblocks the wave. It is distinct from this planning-only commit. SDK task TASK-0013 is the shared-contract gate unlocking phase 2 engines.

## Inverse index — Task → Requirements (authoritative — ACTUAL)

| Task | Epic | Requirement IDs | ADR linkage | Verification classes |
|---|---|---|---|---|
| TASK-0007 | — (meta) | REQ-V020-GOV-* (baseline re-confirm) | ADR-0015..0024 (all) | docs-review, ci-config |
| TASK-0008 | A | REQ-V020-A-001..006, REQ-V020-GOV-003/004/005 | ADR-0016 (readiness) | unit, contract, integration, security (redaction) |
| TASK-0009 | B | REQ-V020-B-001..005, REQ-V020-GOV-003/004/006 | ADR-0016/0017/0018 (optimize) | unit (fixture per class), integration, cli-smoke, contract, security |
| TASK-0010 | C | REQ-V020-C-001..005, REQ-V020-GOV-001/005 | ADR-0016 (profiles) | unit, integration, contract |
| TASK-0011 | D | REQ-V020-D-001..003, REQ-V020-GOV-003/005 | ADR-0017 (graph v2) | unit, integration (symlink/monorepo), contract, security |
| TASK-0012 | E | REQ-V020-E-001..003, REQ-V020-GOV-001/003/007 | ADR-0018 (rule packs) | unit, integration, contract, security (limits, ReDoS) |
| TASK-0013 | J | REQ-V020-J-001..003, REQ-V020-GOV-008/009 | ADR-0021 (SDK boundary) | contract (api-surface), integration (AbortSignal), e2e consumer |
| TASK-0014 | F | REQ-V020-F-001..003, REQ-V020-GOV-001/010 | ADR-0020 (action) | ci-config (actionlint), integration (smoke), contract |
| TASK-0015 | G (engine) | REQ-V020-G-001, REQ-V020-GOV-003/005/006 | ADR-0019 (dashboard) | unit, integration |
| TASK-0016 | G (dashboard) | REQ-V020-G-002..004, REQ-V020-GOV-001/003/004/005 | ADR-0019 | integration, e2e, contract, security (XSS/binding/headers), perf |
| TASK-0017 | H | REQ-V020-H-001..002, REQ-V020-GOV-004 | ADR-0024 (diagnostics) | unit, integration, security (redaction proof), e2e |
| TASK-0018 | I | REQ-V020-I-001..003 | ADR-0022 (benchmarks) | integration, contract, perf, ci-config |
| TASK-0019 | K (found) | REQ-V020-K-001, REQ-V020-K-003, REQ-V020-GOV-001/002/008 | ADR-0021 (VS Code) | unit (vscode tests), integration, contract, security |
| TASK-0020 | K (feat) | REQ-V020-K-002, REQ-V020-GOV-002/004/008 | ADR-0021 | integration (vscode), e2e, security |
| TASK-0021 | L | REQ-V020-L-001..002, all GOV | ADR-0024 (security hardening) | security (per-surface), ci-config, unit |
| TASK-0022 | M | REQ-V020-M-001..002, REQ-V020-GOV-010 | — | docs-review, integration (guide fixtures) |
| TASK-0023 | — | all (integration matrix) | — | integration, e2e, contract, security, perf (matrix) |
| TASK-0024 | N | REQ-V020-N-001..002, REQ-V020-GOV-010 | ADR-0015..0024 (multi-artifact 0023) | e2e, ci-config, docs-review, security (audit) |
| TASK-0007..0024 | — | REQ-V020-GOV-OUT-001 enforced | — | grep-gate at TASK-0021/0022 |

## ADR linkage (v0.2.0 additions vs reuse)

Reuse where possible — do not duplicate existing decisions:

| ADR | Area | Status | Primary verifying tasks |
|---|---|---|---|
| ADR-0001 | TS/Node/pnpm/Biome toolchain · Node ≥22 CI 22+24 | Reused (no change) | TASK-0007 (re-confirm), all |
| ADR-0002 | Single-package (core remains single npm package; extensions are separate artifacts) | Extended in ADR-0021 | TASK-0019, TASK-0024 |
| ADR-0003 | Offline-first / no-telemetry invariant | Reused | all |
| ADR-0004 | Config file identity `ackit.yml` schemaVersion 1 → 2 (add `readiness`, `profile`, `rulePacks`) | Extended in ADR-0015/0018 | TASK-0007/0010/0012 |
| ADR-0005 | Filesystem root boundary model | Reused | TASK-0011, TASK-0015 |
| ADR-0006 | Instruction graph model | Extended in ADR-0017 (v2) | TASK-0011 |
| ADR-0007 | CLI exit codes 0–5 | Reused (add `--fail-below` still maps to 1/2) | all CLI |
| ADR-0008 | Official MCP TS SDK stdio | Reused | TASK-0013 |
| ADR-0009 | Scan engine & rule ID namespace | Extended in ADR-0018 (packs add `ACKIT400-600` namespace slice) | TASK-0012 |
| ADR-0010 | Agent Skills model | Reused | TASK-0013 |
| ADR-0011 | Policy engine & plugin boundary | Extended in ADR-0018 (declarative packs) | TASK-0012 |
| ADR-0012 | Context budget + cache | Extended in ADR-0016 (readiness) | TASK-0008 |
| ADR-0013 | Distribution/versioning | Extended in ADR-0023 (multi-artifact 0.2.0: npm + VSIX) | TASK-0024 |
| ADR-0014 | Task system | Reused | TASK-0007 |
| **ADR-0015** | v0.2.0 consolidated release architecture | **New** | TASK-0007 |
| **ADR-0016** | Readiness scoring model + provider profile model | **New** | TASK-0008, TASK-0010 |
| **ADR-0017** | Instruction graph v2 model | **New** | TASK-0011 |
| **ADR-0018** | Rule-pack format & security boundary | **New** | TASK-0012 |
| **ADR-0019** | Local dashboard architecture | **New** | TASK-0015, TASK-0016 |
| **ADR-0020** | GitHub Action architecture (composite vs Node vs Docker) | **New** | TASK-0014 |
| **ADR-0021** | Public SDK boundary + VS Code integration | **New** | TASK-0013, TASK-0019, TASK-0020 |
| **ADR-0022** | Benchmark/regression policy | **New** | TASK-0018 |
| **ADR-0023** | Multi-artifact version/release strategy | **New** | TASK-0024 |
| **ADR-0024** | Cross-cutting security hardening (dashboard, packs, action, diagnostics) | **New** | TASK-0021 |

## Global invariants ownership (v0.2.0)

| Invariant | Enforced by |
|---|---|
| REQ-V020-GOV-001/002 (offline/no telemetry) | every impl task code review + network-spy tests (refuse fetch) + final gate `scripts/check-no-network.mjs` |
| REQ-V020-GOV-003/006 (root safety/cycles) | fs engine + consumers (`src/core/filesystem`, graph, packs) |
| REQ-V020-GOV-004/005 (path/secret leakage, determinism) | redaction boundary (scanner, pack, diagnostics) + determinism snapshot |
| REQ-V020-GOV-006 (safe writes) | `--fix` fenced tasks + grep for bare `writeFile` without dry-run guard |
| REQ-V020-GOV-007 (no plugin exec) | grep-gate + pack sandbox |
| REQ-V020-GOV-008 (no process.exit from SDK) | sdk lint rule + consumer test |
| REQ-V020-GOV-009 (stable contracts) | contract tests (api-surface, cli-help, schemas, SARIF) |
| REQ-V020-GOV-010 (help leak) | cli-help-contract test extended for v0.2.0 surfaces |
| REQ-V020-GOV-OUT-001 | scope sections of every task; grep-gate at TASK-0021 |

## Verification class matrix (v0.2.0 — actual task IDs)

| Class | Applied in |
|---|---|
| unit | 0008, 0009, 0010, 0011, 0012, 0015, 0017, 0018, 0021 |
| integration | 0008, 0009, 0010, 0011, 0012, 0014, 0015, 0016, 0017, 0018, 0020, 0021, 0022, 0023 |
| security fixtures | 0008, 0009, 0011, 0012, 0016, 0017, 0021, 0023 |
| contract/snapshot | 0008, 0009, 0011, 0012, 0014, 0016, 0018, 0013, 0019, 0021 |
| e2e/tarball | 0013, 0018, 0023, 0024 |
| cli-smoke | 0008, 0009, 0010, 0011, 0016, 0013, 0023 |
| ci-config | 0014, 0018, 0021, 0023, 0024 |
| docs-review | 0022, 0007, 0024 |
| perf | 0016, 0018, 0023 |
| vscode | 0019, 0020 |

## Completion evidence (to be filled per task during execution — actual IDs)

| Task | Scope | Evidence slots |
|---|---|---|
| TASK-0007 | baseline | dependency pin audit, ADR placeholder grep 0, architecture re-confirm |
| TASK-0008 | readiness engine | golden fixture score JSON, readiness.schema v1 snapshot, ci --fail-below gate run |
| TASK-0009 | optimize v2 | fixture-per-class finding list, --explain snapshot, --fix dry-run diff mtime proof |
| TASK-0010 | profiles | 5 profile YAMLs, pack delta snapshot, unknown-provider diagnostic PROFILE-UNKNOWN |
| TASK-0011 | graph v2 | 4-level nesting fixture, symlink graph, --explain provenance, limit diagnostics INSTR-LIMIT-* |
| TASK-0012 | rule packs | 2-pack collision POL-PACK-COLLISION, presence/pattern fixtures, url refusal POL-NETWORK-REFUSED |
| TASK-0013 | sdk | api-surface exact list snapshot, AbortSignal 200ms, isolated consumer tarball ESM import |
| TASK-0014 | action | actionlint, uses: ./ smoke annotations + sarif 2.1.0 artifact, SHA pins |
| TASK-0015 | watch engine | debounce coalescing 3-writes->1-batch proof, ignored dirs, graceful SIGINT exit 0 |
| TASK-0016 | dashboard | localhost-only refusal (non-loopback exit 2), port 0 random, UI findings render, CSP headers, XSS escaped |
| TASK-0017 | diagnostics | --json schema diagnostics.schema v1, bundle zip deterministic manifest + 5 secrets [REDACTED] proof |
| TASK-0018 | benchmarks | 7 fixtures deterministic hash, run.mjs 8 metrics, thresholds.json default 1.5 multipliers |
| TASK-0019 | vscode foundation | vsix <2MB whitelist, version alignment warning, activation @vscode/test-electron smoke |
| TASK-0020 | vscode features | Problems ACKITxxx diagnostics, current-file stack view via resolveEffectiveStack, palette commands |
| TASK-0021 | security hardening | per-surface fixtures T16-T20 + grep gates + THREAT_MODEL delta, fake-secret sanitization proof |
| TASK-0022 | docs/examples | guide→fixture scan matrix, dead-link gate, CHANGELOG [0.2.0] entry |
| TASK-0023 | integration matrix | full matrix log scan/pack/sdk/mcp/action/dashboard/diagnostics/pack/profile/benchmark/vsix at one SHA |
| TASK-0024 | release readiness | exact-SHA CI 10/10, tarball/VSIX audit, registry E404, tag absent, explicit auth sentence with SHA |

At closeout: unmapped requirements = 0 · dependency cycles = 0 · tasks without acceptance criteria = 0 · implementation tasks without test plan = 0.

## Historical note

vNext `docs/rebuild/VNEXT_REQUIREMENTS.md` / `VNEXT_TRACEABILITY.md` remain verbatim as Goal-2 evidence; they are not overwritten. v0.2.0 traceability lives here and in `REQUIREMENTS.md`. Former `docs/tasks/TASK-0264..0291` and `PROJECT-CONTROL-*` are archived evidence of the vNext rebuild and are not reopened.

Release immutability guardrails inherited: published npm versions/tags/releases (`0.1.0`, `0.1.1`, legacy NuGet `1.0.0-rc.1`) remain untouchable; new release `0.2.0` follows ADR-0013/0023 controlled path via `release.yml` tag trigger only.
