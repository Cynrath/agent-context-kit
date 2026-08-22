# TASK-0266: vNext architecture ADR confirmation and package identity

## Metadata

- Parent epic: TASK-0264
- Dependencies: TASK-0265
- Unlocks: TASK-0267, TASK-0286
- Requirement IDs: REQ-ARCH-001, REQ-ARCH-002, REQ-ARCH-003, REQ-ARCH-005, REQ-ARCH-006, REQ-ARCH-010, REQ-ARCH-012, REQ-CFG-001, REQ-DX-004
- Related ADR/spec: docs/rebuild/decisions/ADR-0001..ADR-0008, ADR-0012, ADR-0013

## Purpose

Confirm/finalize all architecture decisions as ADRs before coding: TS/Node/npm migration, single package, offline-first contract, config file name, exit-code taxonomy, version strategy, dependency set, Node LTS targets, and npm package identity verified against the official registry.

## Scope

- Review ADRs written during Goal 1 under `docs/rebuild/decisions/`; correct or extend where implementation reality requires (record rationale).
- Verify current Node LTS lines and MCP TypeScript SDK stable version from official sources; update ADR-0001/ADR-0008 accordingly.
- Verify npm registry availability of `agent-context-kit` (read-only lookup); finalize package name decision in ADR-0013 (fallback scoped name if taken).
- Finalize exit-code taxonomy (ADR-0007) and config file canonical name (ADR-0004).

## Out of scope

Writing product code; creating package skeleton (TASK-0267).

## Affected files

- `docs/rebuild/decisions/*.md`
- `docs/tasks/TASK-0266-*.md`

## Data/database impact

None.

## Security impact

Dependency choices bound to minimal-supply-chain principle (REQ-ARCH-006); MCP SDK official-only (blocks home-grown protocol recurrence).

## Permission/auth impact

None. Registry lookup is read-only network access performed manually by the agent, not by product code (product stays offline-first).

## Localization impact

None.

## UX impact

Exit-code taxonomy fixes CLI/script behavior contracts.

## Logging/audit impact

ADRs become auditable decision records referenced by traceability.

## Acceptance criteria

- [x] All 13 MS§33 ADR areas have an ADR file with Status: Accepted and concrete decisions.
- [x] Node LTS target versions documented with source references and date.
- [x] MCP SDK package/version documented (official docs verified).
- [x] Package name decision recorded after registry check result noted.
- [x] Exit codes 0-5 taxonomy frozen in ADR-0007.
- [x] Config file name frozen in ADR-0004.
- [x] Version strategy + CHANGELOG approach recorded (ADR-0012).

## Test steps

1. Enumerate `docs/rebuild/decisions/ADR-*.md`; assert coverage of MS§33 list.
2. Cross-check each REQ-ARCH-* owner mapping still valid in VNEXT_TRACEABILITY.md.

## Risks

Registry/package-name surprise → fallback path pre-decided (scoped `@cynrath/agent-context-kit`), CLI command stays `ackit`.

## Rollback plan

ADRs are additive docs; revert commits if a decision is reopened.

## Completion notes

Executed 2026-08-22. All verification lookups were read-only agent actions against official sources; product code remains offline.

- ADR confirmation: all 13 Proposed ADRs (0001-0013) moved to Status: Accepted with decisions intact. ADR-0003 was already Accepted.
- Gap fix: MS§33 "task docs" area had no dedicated ADR file (only an index footnote). Added `ADR-0014-task-system.md` (Accepted) covering REQ-TASKS-001..004 model; decisions README index rewritten with full area→ADR mapping. 13/13 areas now have accepted ADR files (plus extras: config identity, exit codes, scan rules).
- Node LTS verified against official `nodejs/release` schedule.json on 2026-08-22: v22 LTS (EOL 2027-04-30), v24 LTS (EOL 2028-04-30), v26 current until LTS begins 2026-10-28. Supported set `>=22`; CI matrix lines 22+24. Recorded in ADR-0001.
- MCP SDK verified via registry.npmjs.org on 2026-08-22: `@modelcontextprotocol/sdk` latest = 1.30.0, engines node>=18, no 2.x dist-tag exists. Planning wording "(v2 packages)" did not match registry reality → ADR-0008 corrected with evidence and pinned `^1.30.0`; REQ-MCP-001 in VNEXT_REQUIREMENTS.md annotated accordingly (intent unchanged: official SDK only). Traceability owner mapping untouched.
- Package identity verified via registry.npmjs.org on 2026-08-22: unscoped `agent-context-kit` is TAKEN by an unrelated third-party package (latest 0.1.4, modified 2025-11-08); scoped `@cynrath/agent-context-kit` returns 404 → available. Selected per pre-decided fallback in ADR-0013; CLI command stays `ackit`. ADR-0002 aligned.
- Exit-code taxonomy 0-5 frozen (ADR-0007); config file name `ackit.yml` frozen (ADR-0004).
- Criterion "(ADR-0012)" for version strategy is a reference typo in the task doc: version strategy + CHANGELOG approach are recorded in ADR-0013 (distribution & versioning), which owns that decision per the traceability index; substance of the criterion is satisfied.
- Test step 2: VNEXT_TRACEABILITY.md owner mappings re-checked — unchanged and valid.
- External actions: none beyond read-only registry/schedule HTTP GETs performed manually by the agent (explicitly permitted by this task's scope).
