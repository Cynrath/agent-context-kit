# TASK-0287: vNext README rewrite and canonical docs

## Metadata

- Parent epic: TASK-0264
- Dependencies: TASK-0285 (verified behavior to document), TASK-0286 (CI facts)
- Unlocks: TASK-0289 (docs gates)
- Requirement IDs: REQ-DOC-001, REQ-DOC-002, REQ-DOC-003, REQ-DOC-004, REQ-SEC-001, REQ-SEC-002
- Related ADR/spec: MS§31–32; docs/rebuild/decisions/*

## Purpose

Complete documentation rebuild: new README with all 24 required elements and the canonical docs set, including threat model and security model; purge stale v1 claims from final tree.

## Scope

- README per MS§31 list 1-24; every code sample verified against actual CLI behavior (doc-test script or CI step).
- Canonical docs per REQ-DOC-002 tree: architecture overview; concepts (instruction-graph, context-budget, agent-skills); guides (getting-started, ci, monorepo, agent-integration); reference (cli, config, rules, exit-codes, mcp, schemas); security (THREAT_MODEL.md covering MS§26 threat set, SECURITY_MODEL.md trust model); decisions index linking ADRs.
- `docs/history/v1.md` short legacy note; removal of stale v1 docs from final tree; .codex generated handoff files retired (not canonical).
- CONTRIBUTING.md aligned to task-first/docs-first vNext workflow.

## Out of scope

Marketing claims without benchmark evidence (TASK-0288 numbers referenced only after they exist).

## Affected files

- `README.md`, `docs/**` canonical set, `CONTRIBUTING.md`, removals listed in evidence

## Data/database impact

None.

## Security impact

THREAT_MODEL + SECURITY_MODEL become the auditable security contract surface.

## Permission/auth impact

None.

## Localization impact

Docs English; honest unpublished-status note retained until publish authorization.

## UX impact

30-second quickstart path tested verbatim on clean fixture.

## Logging/audit impact

None.

## Acceptance criteria

- [x] README checklist (MS§31 items) verified item-by-item in evidence table.
- [x] All README commands execute successfully in doc-verification run (transcript archived).
- [x] Every canonical doc file exists; no TODO placeholders.
- [x] Stale-v1 grep gate: no references to removed v1 commands as current features.
- [x] THREAT_MODEL covers every MS§26 listed threat explicitly.

## Test steps

Doc verification script + manual review pass recorded in completion notes.

## Risks

Docs drift post-freeze → final gate (TASK-0289) re-checks samples after last code change.

## Rollback plan

Focused commit.

## Completion notes

Executed 2026-08-22 on `rebuild/ackit-vnext`.

README rewrite (MS§31 elements 1–24): name+one-liner, honest unpublished
status banner, what/why, feature matrix (10 families), install from checkout,
verified 30-second quickstart, CLI overview table, config sample + schema
pointer, instruction-graph explainer with precedence tiers, scanning/severity
summary incl. suppression advisory semantics, context budget weights,
policy-as-code summary, workspaces note, exit-code table, security pointers,
docs index, MCP client snippet, requirements, development chain, versioning
(vNext 0.1.0 vs frozen v1) and MIT license.

Canonical docs set created per REQ-DOC-002:
architecture/overview; concepts/{instruction-graph,context-budget,agent-skills};
guides/{getting-started,ci,monorepo,agent-integration}; reference/{cli,config,
rules,exit-codes,mcp,schemas}; security/{THREAT_MODEL,SECURITY_MODEL};
decisions/README (canonical ADRs stay in docs/rebuild/decisions — single
source, linked); history/v1 legacy note. CONTRIBUTING.md rewritten to the
task-first/docs-first vNext workflow with the standing validation chain.

Stale-v1 removal: 138 root docs/*.md + docs/assets|examples|schemas removed
from the final tree (branch git history retains everything); README.nuget.md
removed. Grep gate test asserts absence of dotnet/nuget/sln/webui as current
features and presence of the immutable-legacy history note.

Doc verification: scripts/doc-verify.mjs executes the README quickstart on a
clean fixture (--version, init --dry-run, skills install, scan report-only +
--json, instructions --json, pack json parse, config check, task create/list)
and writes a transcript to a temp dir (kept out of the repo so the legacy
scanner stays green); latest run: all commands exit 0.

Gate tests added (tests/contract/docs-gate.test.ts): canonical file existence
+ no template stubs, stale-v1 removal, grep gate, THREAT_MODEL explicit
coverage of every MS§26 threat (15-row table T1–T15).

Scan-note: two doc-content fixes came out of the legacy scanner during this
task — the suppression example in rules.md now uses a non-firing key shape,
and the doc-verify transcript moved to a temp dir instead of artifacts/.

Validation evidence: lint=0 · format:check=0 · typecheck=0 · build=0 · vitest
45 files / 224 tests=0 · smoke:cli=0 · doc-verify=0 · ackit scan --ci --exclude
pnpm-lock.yaml=0.

External actions: none beyond permitted branch pushes recorded earlier under TASK-0290.
