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

- [ ] README checklist (MS§31 items) verified item-by-item in evidence table.
- [ ] All README commands execute successfully in doc-verification run (transcript archived).
- [ ] Every canonical doc file exists; no TODO placeholders.
- [ ] Stale-v1 grep gate: no references to removed v1 commands as current features.
- [ ] THREAT_MODEL covers every MS§26 listed threat explicitly.

## Test steps

Doc verification script + manual review pass recorded in completion notes.

## Risks

Docs drift post-freeze → final gate (TASK-0289) re-checks samples after last code change.

## Rollback plan

Focused commit.

## Completion notes

(placeholder)
