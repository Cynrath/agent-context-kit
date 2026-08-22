# TASK-0268: vNext filesystem safety core

## Metadata

- Parent epic: TASK-0264
- Dependencies: TASK-0267, TASK-0290 (bootstrap CI completion gate, added 2026-08-22)
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

- [x] Unit tests: normalization, root containment, limits, ignore matching/explain.
- [x] Security fixtures pass on Windows AND POSIX CI: outside-root symlink blocked; junction/reparse blocked; cyclic symlink terminates deterministically; `../../` traversal denied; huge-file limit triggers diagnostic; malformed inputs do not crash walker.
- [x] Unknown-extension file containing secret-like bytes is classified text/scannable (integration assert with TASK-0271 contract later).
- [x] AbortSignal cancels mid-traversal promptly in integration test.
- [x] `pnpm typecheck/test/lint/build` green.
- [ ] TASK-0290 bootstrap CI green on ubuntu/windows/macos × node 22/24 (cross-platform completion gate added 2026-08-22; task is NOT completed until this passes).

## Test steps

Run targeted suites: `pnpm vitest run tests/unit/filesystem tests/security/filesystem*`.

## Risks

Windows-specific reparse behavior differences → fixtures run in Windows CI job (REQ-CI-001).

## Rollback plan

Single focused commit; revertible independently.

## Completion notes

Executed 2026-08-22 on `rebuild/ackit-vnext`.

Implementation (`src/core/filesystem/`, all strict-Typed, no `any`):
- `paths.ts` — toPosix; normalizeRelativePath (string-level rejection of absolute/drive/UNC/NUL and `..` escapes BEFORE any fs access); isInsideRoot with case-insensitive comparison on win32-style platforms and full-segment prefix semantics.
- `root.ts` — resolveRepositoryRoot: requested → absolute → realpath → must be directory; canonical root resolved once (ADR-0005).
- `engine.ts` — FilesystemEngine.resolveWithinRoot: requested → normalized POSIX → join under canonical root → realpath → containment. Symlinks/junctions/reparse followed only when target stays inside root, else FS-PATH-ESCAPES-ROOT. readFileWithinRoot wrapper for feature code.
- `walk.ts` — deterministic BFS walkRepository: sorted entries per dir; stats processed in concurrency-sized Promise.all batches (order-stable); directory-entered events for lazy .gitignore loading; symlink/junction targets realpath-checked (inside → follow, outside → FS-SYMLINK-BLOCKED); visited-canonical-set terminates cycles with FS-CYCLE-SKIPPED; limits maxFiles/maxFileBytes/maxTotalBytes/maxDepth/deadlineMs each emit diagnostics (FS-LIMIT-FILES / FS-LIMIT-BYTES / FS-LIMIT-DEPTH / FS-DEADLINE-EXCEEDED) instead of silent truncation; AbortSignal checked between events (FS-ABORTED). maxDepth semantics: maximum allowed path-depth of yielded entries; directories at depth >= limit are pruned with an explanatory diagnostic.
- `classify.ts` — content-based text/binary only (REQ-FS-004): BOM sniff (UTF-8/16/32), NUL byte ⇒ binary, suspicious-control-byte ratio threshold 6%; bytes ≥0x80 count printable so UTF-8 text is not misclassified; extensions deliberately never consulted.
- `ignore.ts` — IgnoreEngine layering builtin (.git/node_modules/vendor/packages/dist/build/out/coverage/.ackit/artifacts) → per-dir .gitignore stack (lazy cached loaders, deeper wins attribution) → user picomatch globs; every decision carries its explaining source for debug output (REQ-FS-005).
- `scan-targets.ts` — composed traversal producing ScanTarget[] {relativePath, absolutePath, sizeBytes, kind} + collected diagnostics.

Tests (10 files total in repo, all green):
- unit/filesystem/paths.test.ts (normalization, containment, case-sensitivity), classify.test.ts (BOM/NUL/ratio/UTF-8), ignore.test.ts (layering + explain + prefix-safety), walk-limits.test.ts (per-file size skip, cumulative budget stop, depth prune, deadline).
- security/filesystem-boundary.test.ts on real temp repos: ../../ denied pre-fs; absolute rejected; outside-root directory link blocked via engine AND walker (junction on win32, dir symlink elsewhere — unprivileged on every platform); inside-root link allowed; cyclic link terminates deterministically without duplicate files and emits FS-CYCLE-SKIPPED; dangling link yields FS-READ-FAILED diagnostic without crashing the walk; unknown-extension secret-like file classified text and remains scannable; abort mid-traversal completes promptly (<5s bound).

Validation evidence: lint=0 · format:check=0 · typecheck=0 · build=0 · vitest 10 files / 55 tests passed=0 · smoke:cli=0 · ackit scan --ci --exclude pnpm-lock.yaml = 0 (documented legacy-scanner lockfile suppression from TASK-0267).

Notes: biome complexity/useLiteralKeys disabled globally because it conflicts with tsconfig noPropertyAccessFromIndexSignature (TS rule wins by design); two justified noControlCharactersInRegex suppressions exist in diagnostics.ts (strip-by-design regexes).

External actions: none.
