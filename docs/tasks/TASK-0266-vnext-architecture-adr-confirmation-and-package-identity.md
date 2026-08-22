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

- [ ] All 13 MS§33 ADR areas have an ADR file with Status: Accepted and concrete decisions.
- [ ] Node LTS target versions documented with source references and date.
- [ ] MCP SDK package/version documented (official docs verified).
- [ ] Package name decision recorded after registry check result noted.
- [ ] Exit codes 0-5 taxonomy frozen in ADR-0007.
- [ ] Config file name frozen in ADR-0004.
- [ ] Version strategy + CHANGELOG approach recorded (ADR-0012).

## Test steps

1. Enumerate `docs/rebuild/decisions/ADR-*.md`; assert coverage of MS§33 list.
2. Cross-check each REQ-ARCH-* owner mapping still valid in VNEXT_TRACEABILITY.md.

## Risks

Registry/package-name surprise → fallback path pre-decided (scoped `@cynrath/agent-context-kit`), CLI command stays `ackit`.

## Rollback plan

ADRs are additive docs; revert commits if a decision is reopened.

## Completion notes

(placeholder)
