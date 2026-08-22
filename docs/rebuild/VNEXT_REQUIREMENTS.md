# AgentContextKit vNext — Canonical Requirements Contract

Status: GOAL 1 planning artifact. Authoritative requirements source for the vNext rebuild (Goal 2 execution).
Source: `ACKIT_VNEXT_GOAL_1_PLAN_TASKS.md` §15 "Authoritative Master Specification" (sections referenced as MS§n).
Rule: every normative requirement has a stable ID and an owner task or GLOBAL_INVARIANT tag. Unmapped = 0 is enforced by `VNEXT_TRACEABILITY.md`.

Legend:
- Type: `MUST` (normative, blocking), `SHOULD` (default expectation, deviation requires ADR), `OUT` (explicitly out of scope — implementing it is a violation).
- Priority: P0 release-blocking, P1 required for final gate, P2 advisory.
- Verification classes: `unit`, `integration`, `security`, `contract`, `e2e`, `cli-smoke`, `ci-config`, `docs-review`.

## 1. Global invariants (GLOBAL_INVARIANT)

| ID | Source | Requirement | Type |
|---|---|---|---|
| REQ-GOV-001 | MS§3.4 | Offline-first: no default network calls anywhere in product code. | MUST |
| REQ-GOV-002 | MS§3.4 | No telemetry, no analytics, no sending repository content to third parties. | MUST |
| REQ-GOV-003 | MS§3.4 | Never escape repository root via symlink/junction/reparse during any traversal. | MUST |
| REQ-GOV-004 | MS§3.4 | No local absolute paths leaked into generated context/report/prompt artifacts. | MUST |
| REQ-GOV-005 | MS§3.4 | Secret values are never printed to terminal, reports, logs, or JSON output. | MUST |
| REQ-GOV-006 | MS§3.4 | No recursive infinite symlink loops; cycle handling is deterministic. | MUST |
| REQ-GOV-007 | MS§3.4 | No silent error swallowing; errors surface as diagnostics with stable codes. | MUST |
| REQ-GOV-008 | MS§3.4 | User files are never overwritten by default; writes require explicit intent (`--fix`, `--write`, managed-block scope). | MUST |
| REQ-GOV-009 | MS§36 | Out-of-scope list enforced: no built-in OpenAI/Anthropic/Gemini API, vector DB, embeddings/RAG, multi-agent orchestrator, LLM router, container vuln scanner, SBOM platform, SAST clone, ML PII detector, Jira/Slack/Teams clients, IDE suite, untrusted JS plugin execution, cloud account or central server requirement. | OUT |
| REQ-GOV-010 | MS§3.5, §12(G1) | During Goal 2: no remote push, force push, tag, GitHub Release, npm publish, workflow dispatch, history rewrite; local commits only on rebuild branch. | MUST |
| REQ-GOV-011 | MS§41 | Task-task loop without pausing to ask permission; unfinished tasks never marked completed; checkpoint commits allowed. | MUST |
| REQ-GOV-012 | MS§44 | Self-dogfooding at completion: vNext ACKit passes doctor/scan/task-doctor on its own repo, valid instructions + skills + config, pack producible, MCP starts. | MUST |

## 2. Architecture & stack

| ID | Source | Requirement | Type | Owner |
|---|---|---|---|---|
| REQ-ARCH-001 | MS§5 | Product rewritten as TypeScript + Node.js LTS + ESM; old C# runtime removed from final product path. | MUST | TASK-0266, TASK-0267 |
| REQ-ARCH-002 | MS§5 | CLI executable name is `ackit`; distribution via npm/npx. Package name finalized only after npm registry verification (`agent-context-kit` preferred, else scoped fallback). | MUST | TASK-0266 |
| REQ-ARCH-003 | MS§5.1 | Supported Node version set verified against current LTS + dependency requirements before implementation; CI tests ≥2 Node LTS lines. | MUST | TASK-0266, TASK-0286 |
| REQ-ARCH-004 | MS§5.2 | TypeScript strict mode, no implicit any, strict null checks, modern ESM, Node typings, source maps; `any` only at justified adapter boundaries. | MUST | TASK-0267 |
| REQ-ARCH-005 | MS§5.3 | pnpm for development; `packageManager` pinned exact; lockfile committed; frozen-lockfile CI; single npm package (no artificial @ackit/* splits). | MUST | TASK-0267, TASK-0285 |
| REQ-ARCH-006 | MS§5.4 | Minimal runtime dependencies; each justified (commander-or-equivalent, zod, yaml, picomatch, ignore, official MCP TS SDK). No home-grown MCP protocol. | MUST | TASK-0266 |
| REQ-ARCH-007 | MS§5.5 | Dev tooling: Vitest-or-equivalent, typecheck, single lint/format tool, coverage, package smoke. Tool count kept minimal. | MUST | TASK-0267 |
| REQ-ARCH-008 | MS§6 | Modular source tree per target structure (src/core/* domains, src/cli, src/mcp, src/shared); no giant orchestration files; structure deviations via ADR. | MUST | TASK-0267 |
| REQ-ARCH-009 | MS§34 | Single source of truth for version/identity across CLI help, MCP identity, reports; build artifact behavior contract-tested against source. | MUST | TASK-0285 |
| REQ-ARCH-010 | MS§35 | New version strategy defined in ADR; CHANGELOG explains new start, v1 marked legacy; no publish/tag/release during rebuild. | MUST | TASK-0266 |
| REQ-ARCH-011 | MS§42 | Code standard: small cohesive modules, explicit boundaries, function/module style where natural, no DI container/ORM/event bus/hidden global state, no enterprise cosplay. | MUST | ALL impl tasks |
| REQ-ARCH-012 | MS§33 | ADR coverage for ≥13 decision areas listed in MS§33 (migration, single-package, offline contract, fs boundary, instruction graph, skills, policy, context budget, MCP v2, task docs, cache/incremental, plugin boundary, distribution). | MUST | TASK-0266 |

## 3. Filesystem engine

| ID | Source | Requirement | Type | Owner |
|---|---|---|---|---|
| REQ-FS-001 | MS§11.1 | Every file access validated through requested→normalized→canonical path vs canonical repo root; outside-root resolved targets denied by default. | MUST | TASK-0268 |
| REQ-FS-002 | MS§11.2 | Windows-safe symlink/junction/reparse/cyclic/outside-target/inside-target/deep-loop handling; default "never escape root". | MUST | TASK-0268 |
| REQ-FS-003 | MS§11.3 | Configurable limits: max file size, max scanned file count, max total bytes, optional depth, scan timeout/budget, bounded concurrency, AbortSignal cancellation; limit hits produce diagnostics not silence. | MUST | TASK-0268 |
| REQ-FS-004 | MS§11.4 | Content-based text/binary detection (NUL byte, BOM/encoding, printable ratio heuristics); known extensions only a hint; unknown-extension files are NOT auto-excluded from secret scan. | MUST | TASK-0268, TASK-0271 |
| REQ-FS-005 | MS§11.5 | Correct .gitignore semantics plus `.git`, dependency dirs, build artifacts, user excludes; ignore decisions explainable in debug mode. | MUST | TASK-0268 |
| REQ-FS-006 | MS§29.3 | Security fixtures: outside-root symlink, Windows junction/reparse, cyclic symlink, `../../` traversal, huge file, malformed YAML inputs. | MUST | TASK-0268 |

## 4. Configuration & schemas

| ID | Source | Requirement | Type | Owner |
|---|---|---|---|---|
| REQ-CFG-001 | MS§18 | Canonical config file name decided via ADR (`ackit.yml` vs `.ackit/config.yml`); schema versioned. | MUST | TASK-0266, TASK-0269 |
| REQ-CFG-002 | MS§18.1 | Config covers scan includes/excludes, file limits, severity threshold, instruction/skills behavior, context budget, policy extends, baseline, output, cache, monorepo/workspaces. | MUST | TASK-0269 |
| REQ-CFG-003 | MS§18.2 | Real YAML parser + runtime schema validation; actionable errors with file:line and did-you-mean suggestions. | MUST | TASK-0269 |
| REQ-CFG-004 | MS§18.3 | JSON Schemas exported: ackit config, policy, task schemas usable by editors. | MUST | TASK-0269 |
| REQ-CFG-005 | MS§37 | Error UX bar: stable error codes, precise location/message, received value, remediation pointer; no raw stack traces by default (`--debug` exposes). | MUST | TASK-0269+ all commands |

## 5. Scan engine

| ID | Source | Requirement | Type | Owner |
|---|---|---|---|---|
| REQ-SCAN-001 | MS§12 | Pipeline-based scan: discovery → inventory → ignore/filter → text/binary → rule planning → bounded parallel evaluation → normalize → fingerprint → baseline compare → threshold → report. | MUST | TASK-0270 |
| REQ-SCAN-002 | MS§12.1 | Stable finding schema: ruleId, severity, category, message, relativePath, line/column, fingerprint, evidence (redacted), remediation, documentationKey, suppressed, suppressionReason. | MUST | TASK-0270 |
| REQ-SCAN-003 | MS§12.2 | Stable rule-ID namespace with semantics-change/versioning principle. | MUST | TASK-0271 |
| REQ-SCAN-004 | MS§12.3 | Built-in categories include secrets, unsafe path/root escape, hygiene, instruction conflict/scope/staleness, skill validity, absolute-path leakage, generated-artifact hygiene, binary/text anomalies, large context files, config problems, task/docs integrity, CI/release hygiene, dependency advisory. | MUST | TASK-0271 |
| REQ-SCAN-005 | MS§12.4 | Secret detection: high-risk token formats, private key blocks, generic credential assignments, connection strings, provider tokens, entropy-assisted patterns if confident; values never printed; FP suppression supported; bypass comments designed safely; baseline must not store new secrets. | MUST | TASK-0271 |
| REQ-SCAN-006 | MS§12.5 | Instruction-file security advisories: hidden Unicode controls, zero-width obfuscation, suspicious external refs, root-escape refs, massive embedded data, generated secret/path leaks; no critical verdicts without deterministic evidence. | MUST | TASK-0273 |
| REQ-SCAN-007 | MS§10.3, §21 | Reporters: terminal, JSON, SARIF 2.1.0, Markdown, HTML; machine-readable output clean on stdout, diagnostics on stderr. | MUST | TASK-0270, TASK-0284 |

## 6. Baseline / incremental / cache / git

| ID | Source | Requirement | Type | Owner |
|---|---|---|---|---|
| REQ-BASE-001 | MS§13 | Baseline compare/write and changed/staged/since/range incremental scan modes under `scan` options (no separate top-level command sprawl); Git absent ⇒ core scan still works. | MUST | TASK-0279 |
| REQ-BASE-002 | MS§13.1 | Finding fingerprints machine-path independent (repo-relative semantic data). | MUST | TASK-0279 |
| REQ-BASE-003 | MS§13.2 | Git-aware staged/untracked/range/merge-base support. | MUST | TASK-0279 |
| REQ-BASE-004 | MS§13.3 | Content-based cache keyed by content hash + rule version + config digest + policy digest + engine/schema version; mtime alone insufficient; `cache clean` touches only ACKit cache. | MUST | TASK-0279 |

## 7. Instruction graph

| ID | Source | Requirement | Type | Owner |
|---|---|---|---|---|
| REQ-INSTR-001 | MS§8 | Detect/graph surfaces: AGENTS.md, AGENTS.override.md, CLAUDE.md, GEMINI.md, .github/copilot-instructions.md, .github/instructions/**/*.instructions.md, .agents/skills/**/SKILL.md; verified provider adapters (Cursor/Windsurf/Cline/Roo) only after official semantics validation — no invented behavior. | MUST | TASK-0272 |
| REQ-INSTR-002 | MS§8.1 | Node fields: id, source, provider, relativePath, scopeRoot, applyTo, precedence, depth, managed/unmanaged, checksum, tokenEstimate, status, conflicts, duplicates, references, securityFlags. | MUST | TASK-0272 |
| REQ-INSTR-003 | MS§8.2 | Graph resolves root/nested/provider/path-specific instructions, inheritance, override, precedence, applyTo globs, duplicates, contradictions, stale/broken references, oversized files, token cost, unreachable nodes, provider semantic differences, skill relations. | MUST | TASK-0272, TASK-0273 |
| REQ-INSTR-004 | MS§8.3 | Copilot `.instructions.md` frontmatter `applyTo:` semantics implemented correctly (not mere filename discovery). | MUST | TASK-0272 |
| REQ-INSTR-005 | MS§8.4 | Codex semantics fixtures: global/project discovery, root→cwd merge, nested AGENTS.md, AGENTS.override.md closer-scope override. | MUST | TASK-0272 |
| REQ-INSTR-006 | MS§8.5 | Deterministic conflict detection split into structural rules, duplicate/near-duplicate rules, explicit key/value conventions, heuristic advisory findings; no LLM APIs. | MUST | TASK-0273 |
| REQ-INSTR-007 | MS§9 | Own repo ships AGENTS.md, CLAUDE.md, GEMINI.md, copilot-instructions.md, path-specific *.instructions.md via canonical-workflow + minimal provider shims (no copy-paste duplication). | MUST | TASK-0276 |
| REQ-INSTR-008 | MS§9.1 | Managed blocks (`ackit:managed:start/end`) update only ACKit-owned content, preserve user text, idempotent, no duplicate blocks; even `--force` is not a full-file overwrite default. | MUST | TASK-0276 |
| REQ-INSTR-009 | MS§9.2, §25 | `init`: detect → diff/plan → explicit write lifecycle; non-interactive options for CI; agent-facing guidance lines present in generated files per provider syntax. | MUST | TASK-0276 |

## 8. Agent skills

| ID | Source | Requirement | Type | Owner |
|---|---|---|---|---|
| REQ-SKILL-001 | MS§7 | Agent Skills open standard: `.agents/skills/<name>/SKILL.md`, kebab name matching parent dir, YAML frontmatter name+description, optional scripts/references/assets, progressive disclosure. | MUST | TASK-0274 |
| REQ-SKILL-002 | MS§7.1 | Built-in skills shipped: ackit-workflow, ackit-scan-and-fix, ackit-context-optimization, ackit-policy-authoring with specified activation triggers and steps. | MUST | TASK-0275 |
| REQ-SKILL-003 | MS§7.2 | Skills command family: list/discover/validate/install/sync/doctor/scaffold (final syntax may improve but stay consistent); install idempotent, third-party skills never overwritten, only ACKit-owned updated. | MUST | TASK-0275 |
| REQ-SKILL-004 | MS§7.3 | Ownership lock/manifest (e.g., `.ackit/skills.lock.json`): version/checksum, no absolute paths, no ownership of user content. | MUST | TASK-0275 |
| REQ-SKILL-005 | MS§7.4 | Validation: missing frontmatter, invalid YAML, missing name/description, dir/name mismatch, invalid names, duplicates, long descriptions, broken/missing references, suspicious external paths, root escapes, oversized SKILL.md, deep reference chains; strict vs compatibility-warning separation. | MUST | TASK-0274 |
| REQ-SKILL-006 | MS§26.1 | Skill scripts never executed automatically by ACKit; presence analysis only. | MUST | TASK-0274 |

## 9. Context engine / pack / optimize

| ID | Source | Requirement | Type | Owner |
|---|---|---|---|---|
| REQ-CTX-001 | MS§14 | `pack` builds budgeted context from relevant code/docs, instruction graph result, active task, skills catalog, policy summary, repo metadata. | MUST | TASK-0277 |
| REQ-CTX-002 | MS§14.2 | Provider-independent deterministic token estimator labeled as estimate; tokenizer adapter possible later; no core LLM SDK dependency. Options: --max-tokens, --changed, --format markdown/json. | MUST | TASK-0277 |
| REQ-CTX-003 | MS§14.3 | Deterministic ranking signals: explicit include, changed files, active-task references, instruction scope, import proximity, README/architecture relevance, file type, user policy, size penalty. No vectors/embeddings/remote LLM. | MUST | TASK-0277 |
| REQ-CTX-004 | MS§14.4 | Pack safety: no absolute paths, secrets, ignored binaries, outside-root content; duplicate minimization; budget overruns explained; manifest with included/excluded/reason/estimatedTokens/hash/relativePath. | MUST | TASK-0277 |
| REQ-CTX-005 | MS§15 | `optimize` read-only by default; `--fix` explicit; diff-first for non-managed content; checks redundant/conflicting/huge/stale/duplicate/mis-scoped content, missing workflow skill/tasks, budget overrun. | MUST | TASK-0278 |

## 10. Task system (vNext product feature)

| ID | Source | Requirement | Type | Owner |
|---|---|---|---|---|
| REQ-TASKS-001 | MS§16 | Command family create/list/show/start/complete/archive/doctor with natural syntax. | MUST | TASK-0281 |
| REQ-TASKS-002 | MS§16.1 | Task schema fields incl. dependencies, related ADRs, acceptance criteria, test plan, evidence, completion summary; human-readable Markdown + parseable metadata. | MUST | TASK-0281 |
| REQ-TASKS-003 | MS§16.2 | Location `docs/tasks/active|archive`; no giant handoff accumulation; small canonical status file when needed. | MUST | TASK-0281 |
| REQ-TASKS-004 | MS§16.3 | Completion gate warns/errors on unchecked criteria, missing test evidence, invalid references; `--force` still requires explicit user intent. | MUST | TASK-0281 |

## 11. Policy engine

| ID | Source | Requirement | Type | Owner |
|---|---|---|---|---|
| REQ-POL-001 | MS§17 | Policy-as-code: schemaVersion, extends, local packs, org/repo/path scope, severity overrides, rule enable/disable, lockable rules, thresholds, suppressions (+reason/expiry), policy digest, deterministic merge, conflict diagnostics. | MUST | TASK-0282 |
| REQ-POL-002 | MS§17.2 | Policy resolution stays offline; remote URL auto-fetch forbidden; external package policies require pre-installed package or explicit command. | MUST | TASK-0282 |
| REQ-POL-003 | MS§17.3 | No untrusted arbitrary JS plugin execution in vNext; declarative rule packs first. | MUST | TASK-0282 |

## 12. Monorepo/workspaces

| ID | Source | Requirement | Type | Owner |
|---|---|---|---|---|
| REQ-MONO-001 | MS§19 | Detect pnpm/npm/yarn workspaces, Nx/Turborepo metadata, generic nested package roots without pulling framework deps. | MUST | TASK-0280 |
| REQ-MONO-002 | MS§19.1 | Workspace model: root/name/type/instructions/skills/budget/findings resolvable; root policy inheritance; workspace semantics kept distinct from path-specific instruction semantics. | MUST | TASK-0280 |

## 13. MCP

| ID | Source | Requirement | Type | Owner |
|---|---|---|---|---|
| REQ-MCP-001 | MS§20 | Official Model Context Protocol TypeScript SDK (2026-07-28 spec line, v2 packages) over stdio; custom protocol layer deleted; remote HTTP not core. | MUST | TASK-0283 |
| REQ-MCP-002 | MS§20.1 | Read-only tools exposed (scan, doctor, pack, instruction graph, list/validate skills, list/get tasks, policy check); write tools gated behind explicit capability/config/permission. | MUST | TASK-0283 |
| REQ-MCP-003 | MS§20.2–20.3 | Resources (repository summary, instructions graph, skills catalog, active tasks, effective policy) and useful deterministic prompts (onboarding, task execution, remediation, optimization). | MUST | TASK-0283 |
| REQ-MCP-004 | MS§20.4 | Tests: handshake, initialize, list/call tools, resources read, prompts, cancellation, malformed input, shutdown/stdio behavior. | MUST | TASK-0283 |

## 14. Reporting / watch / hooks

| ID | Source | Requirement | Type | Owner |
|---|---|---|---|---|
| REQ-RPT-001 | MS§21.1 | Valid SARIF 2.1.0: stable rule IDs, correct locations, severity mapping, no secrets, repo-relative URIs. | MUST | TASK-0284 |
| REQ-RPT-002 | MS§21.2–21.3 | Self-contained HTML (no CDN/telemetry/external assets); optional `report serve` localhost-only read-only UI, 127.0.0.1 default, 0.0.0.0 needs explicit flag; built-ins over frameworks. | MUST | TASK-0284 |
| REQ-WATCH-001 | MS§22 | Watch as scan option: debounce, cancellation, incremental recomputation, clean Ctrl+C shutdown, ignored dirs respected. | MUST | TASK-0284 |
| REQ-WATCH-002 | MS§23 | Optional hooks installer (install/uninstall/status): no overwrite of existing hooks, safe chaining, clear ownership; pre-commit uses staged incremental scan. | MUST | TASK-0284 |

## 15. Public API / package / DX

| ID | Source | Requirement | Type | Owner |
|---|---|---|---|---|
| REQ-API-001 | MS§24 | Programmatic API from same package (e.g., scanRepository, buildInstructionGraph, buildContextPack, loadAckitConfig); small deliberate surface; internal types not exported; stability contract documented. | MUST | TASK-0285 |
| REQ-PKG-001 | MS§27.1 | npm hygiene: exact lockfile, minimal deps, package content whitelist, no accidental artifacts/secrets, pack inspection, tarball smoke test. | MUST | TASK-0285 |
| REQ-DX-001 | MS§10 | Command set: init, scan, optimize, pack, instructions, skills, task, policy, doctor, report, mcp, config, cache (+completion/version if justified) — no 20-command sprawl; subcommands/options grouped. | MUST | TASK-0267, TASK-0285 |
| REQ-DX-002 | MS§10.1 | Zero-command `ackit` prints quick health summary; score algorithm transparent, deterministic, documented. | MUST | TASK-0267 |
| REQ-DX-003 | MS§10.2 | Standard global options (--root/--config/--json/--quiet/--no-color/--verbose/--debug/--strict); JSON purity on stdout guaranteed. | MUST | TASK-0267 |
| REQ-DX-004 | MS§10.3 | Stable documented exit-code taxonomy fixed by ADR (success/threshold, usage/config, environment, security boundary, internal failure); CI deterministic. | MUST | TASK-0266 |

## 16. Onboarding

| ID | Source | Requirement | Type | Owner |
|---|---|---|---|---|
| REQ-ONB-001 | MS§25 | First-run npx experience scans repo and yields useful results with minimal setup. | MUST | TASK-0276 |
| REQ-ONB-002 | MS§25.1 | Init idempotent; preserves user README/AGENTS/CLAUDE/GEMINI/Copilot/skills; safely updates only managed content. | MUST | TASK-0276 |

## 17. Security model

| ID | Source | Requirement | Type | Owner |
|---|---|---|---|---|
| REQ-SEC-001 | MS§26 | `docs/security/THREAT_MODEL.md` covering listed threat set (malicious content/links, exfiltration, poisoning, unsafe scripts, plugin risk, supply chain, traversal, leakage, terminal injection, exhaustion, cycles, malformed input, malicious glob, dangerous MCP writes). | MUST | TASK-0287 |
| REQ-SEC-002 | MS§26.1 | Default trust model: repo content untrusted; documented. | MUST | TASK-0287 |
| REQ-SEC-003 | MS§26.2 | Terminal sanitation: control chars stripped, ANSI injection blocked, log forging reduced. | MUST | TASK-0268 |
| REQ-SEC-004 | MS§27.2 | CI Actions pinned to immutable full commit SHAs (human-readable version comment allowed). | MUST | TASK-0286 |
| REQ-SEC-005 | MS§27.3 | No publishing release workflow run during rebuild; readiness verification only; actual publish/tag/release requires separate explicit authorization. | MUST | TASK-0286 |

## 18. CI / testing / performance

| ID | Source | Requirement | Type | Owner |
|---|---|---|---|---|
| REQ-CI-001 | MS§28 | CI on Ubuntu+Windows+macOS, ≥2 Node LTS lines, pipeline: checkout→node→pnpm→frozen install→format/lint→typecheck→unit/integration/contract/security→build→CLI smoke→MCP smoke→self-scan→pack inspection; no duplicate jobs. | MUST | TASK-0286 |
| REQ-CI-002 | MS§28.1 | Self-hosting: new ACKit scans own repo in CI (doctor + scan --ci via dist or packaged bin). | MUST | TASK-0286 |
| REQ-CI-003 | MS§28.2 | Package smoke: tarball installed in temp dir, --version/--help/doctor/fixture-scan pass. | MUST | TASK-0285, TASK-0286 |
| REQ-TEST-001 | MS§29.1 | Unit coverage for config/glob/ignore/rules/fingerprints/policy merge/instruction precedence/skill parser/context estimator/ranking/task schema. | MUST | domain tasks |
| REQ-TEST-002 | MS§29.2 | Integration: temp real-fs repos, Git fixtures, monorepo, task lifecycle, init/optimize/pack/reports. | MUST | domain tasks |
| REQ-TEST-003 | MS§29.3 | Security fixture matrix (outside-root symlink, junction/reparse, cyclic link, absolute path leak, unknown-ext secret, binary secret-like bytes, huge file, malformed YAML, ANSI/control chars, malicious instruction ref, traversal, duplicate skills, out-of-root skill ref). | MUST | domain tasks, TASK-0289 |
| REQ-TEST-004 | MS§29.4 | Contract snapshots/schemas for CLI JSON, SARIF, finding/config/task/policy schemas, MCP tools/resources. | MUST | domain tasks |
| REQ-TEST-005 | MS§29.5 | E2E over real tarball: install→init→scan→task→pack→mcp smoke. | MUST | TASK-0285, TASK-0289 |
| REQ-TEST-006 | MS§29.6 | Determinism: same repo+config ⇒ identical finding order, JSON, fingerprints, manifests; machine-dependent fields excluded from contracts. | MUST | TASK-0270, TASK-0279, TASK-0289 |
| REQ-TEST-007 | MS§29.7 | Cross-platform path normalization (forward-slash standard form), Windows drive/space/Unicode/mixed EOL/case-sensitivity tests. | MUST | TASK-0268, TASK-0289 |
| REQ-TEST-008 | MS§43 | High assurance on critical domains: fs boundary, secret redaction, instruction resolution, skills parser, policy merge, fingerprints, context manifest, MCP contracts, task lifecycle; regression tests mandatory for branch/path security. | MUST | domain tasks |
| REQ-PERF-001 | MS§30 | Benchmark suite with fixture classes (small/medium/large/monorepo/instruction-heavy/skill-heavy/binary-heavy); measures cold/warm/incremental time, peak memory, throughput, context build, graph time, cache hit ratio; baseline then thresholds; no invented marketing numbers. | MUST | TASK-0288 |

## 19. Docs

| ID | Source | Requirement | Type | Owner |
|---|---|---|---|---|
| REQ-DOC-001 | MS§31 | README fully rewritten with 24 listed elements; no undocumented features; samples verified. | MUST | TASK-0287 |
| REQ-DOC-002 | MS§32 | Canonical docs set (architecture overview, concepts: instruction-graph/context-budget/agent-skills, guides: getting-started/ci/monorepo/agent-integration, reference: cli/config/rules/exit-codes/mcp/schemas, security: threat model + security model, decisions/*.md). No doc sprawl. | MUST | TASK-0287 |
| REQ-DOC-003 | MS§32.1 | Stale v1 docs removed from final tree; short `docs/history/v1.md` note if valuable; giant generated handoff files not carried as canonical docs. | MUST | TASK-0267, TASK-0287 |
| REQ-DOC-004 | MS§45 | README usage examples reflect reality; unpublished status stated honestly until publish authorized. | MUST | TASK-0287 |

## 20. Final gates

| ID | Source | Requirement | Type | Owner |
|---|---|---|---|---|
| REQ-FIN-001 | MS§46 | Full Final Acceptance Gate checklist (architecture, CLI, security, instructions, skills, context, policy, git/cache, monorepo, MCP, reports, tasks, tests, build/package, docs, CI) all verified. | MUST | TASK-0289 |
| REQ-FIN-002 | MS§47 | Clean-environment full verification (frozen install, lint, format check, typecheck, test, build) + packaged CLI smoke suite + tarball reinstall + git status/diff/log cleanliness. | MUST | TASK-0289 |
| REQ-FIN-003 | MS§48 | Final report with exact sections (repo, architecture, features, agent integration, security, tests w/ counts+matrix, performance, self-check, git commits, external-actions-none statement, blockers only if real). | MUST | TASK-0289 |
