# TASK-0268: vNext filesystem safety core

## Metadata

- Parent epic: TASK-0264
- Dependencies: TASK-0267
- Unlocks: TASK-0270, TASK-0272, TASK-0274, TASK-0277
- Requirement IDs: REQ-FS-001, REQ-FS-002, REQ-FS-003, REQ-FS-004, REQ-FS-005, REQ-FS-006, REQ-GOV-003, REQ-GOV-006, REQ-GOV-007, REQ-SEC-003, REQ-TEST-007 (fs parts)
- Related ADR/spec: ADR-0005 (root boundary model); MS§11

## Purpose

Implement the security-critical repository/filesystem engine: canonical root boundary enforcement, Windows-safe symlink/junction/reparse handling, configurable limits with cancellation, content-based text/binary detection, and gitignore-aware filtering with explainable decisions.

## Scope

- `src/core/filesystem/`: path resolution chain (requested→normalized→real→root check), safe traversal iterator (bounded concurrency), limit/budget enforcement emitting diagnostics, AbortSignal support end-to-end.
- Junction/reparse detection on Windows; cycle-safe walk with visited canonical-set.
- Binary/text classifier: NUL-byte sample, BOM/encoding sniff, printable-ratio heuristic; extension hints never exclude unknown-extension files from scanning.
- Ignore engine over `ignore` semantics + built-in excludes (.git, node_modules-like dep dirs, build artifacts, user config excludes); debug explain output for ignore decisions.

## Out of scope

Rule evaluation/findings (TASK-0270+); config schema itself (TASK-0269 provides types).

## Affected files

- `src/core/filesystem/**`, `src/core/repository/**`
- `tests/security/filesystem*.test.ts`, `tests/unit/filesystem/**`

## Data/database impact

None.

## Security impact

Directly closes v1 lessons #1 (escape risk), #6/#8 partially (bounded traversal, cancellation). All REQ-FS security fixtures mandatory.

## Permission/auth impact

None.

## Localization impact

English diagnostics strings.

## UX impact

Limit overruns produce visible diagnostics instead of silent truncation.

## Logging/audit impact

Diagnostics carry stable codes aligned with ADR-0007 taxonomy.

## Acceptance criteria

- [ ] Unit tests: normalization, root containment, limits, ignore matching/explain.
- [ ] Security fixtures pass on Windows AND POSIX CI: outside-root symlink blocked; junction/reparse blocked; cyclic symlink terminates deterministically; `../../` traversal denied; huge-file limit triggers diagnostic; malformed inputs do not crash walker.
- [ ] Unknown-extension file containing secret-like bytes is classified text/scannable (integration assert with TASK-0271 contract later).
- [ ] AbortSignal cancels mid-traversal promptly in integration test.
- [ ] `pnpm typecheck/test/lint/build` green.

## Test steps

Run targeted suites: `pnpm vitest run tests/unit/filesystem tests/security/filesystem*`.

## Risks

Windows-specific reparse behavior differences → fixtures run in Windows CI job (REQ-CI-001).

## Rollback plan

Single focused commit; revertible independently.

## Completion notes

(placeholder)
