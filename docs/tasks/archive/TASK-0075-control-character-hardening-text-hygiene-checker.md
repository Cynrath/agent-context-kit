---
id: "TASK-0075"
title: "Control-character hardening — text hygiene checker and safe PR workflow"
status: completed
schemaVersion: 2
dependencies:
  - "TASK-0074"
createdAt: "2026-09-03"
completedAt: 2026-09-03
---

## Purpose

Treat repeated BEL (`U+0007`) corruption of `ackit` in real PR metadata as a process defect at the shell/interpolation boundary and harden the repo: add a cross-platform no-dependency text-hygiene checker (`scripts/check-text-hygiene.mjs`), document/enforce a body-file PR/release workflow (`body file → hygiene PASS → gh ... --body-file/--notes-file`), scan repo text in CI/local, and wire AGENTS/maintenance guidance so future agents must use it. Part B of the session goal.

## Current-state evidence (verified live 2026-09-03)

- No `scripts/check-text-hygiene*` exists (only `check-offline-egress`, `check-version-parity`, `doc-verify`, `sync-*`, `package-smoke`, `generate-schemas`).
- CI (`.github/workflows/ci.yml`) has no C0-control gate; `verify`/`self-scan`/`package-smoke`/`extension` jobs do not check for control characters.
- Product files clean of BEL today — consistent with the goal's premise that the defect lives at PR-body composition time (multiline inline `--body` interpolation), not in tracked files.
- PowerShell + `gh` available (`gh pr list` works); docs use inline `--body` in places (to be narrowed to `--body-file`).

## Scope

- `scripts/check-text-hygiene.mjs`: UTF-8 file(s) + stdin; allow LF/TAB (+CR per policy); reject unintended C0 (`U+0000..U+001F` minus allowed whitespace) and `U+007F`; deterministic safe output (`file | line/column or byte | code point | escaped repr`, never echo raw controls); non-zero exit on findings; zero deps; cross-platform (node only).
- Exact regression: `"a\u0007ckit sync"` MUST fail identifying `U+0007`; normal Markdown/backticks/backslashes/Unicode/Turkish passes (tests).
- Repo-scan mode for `*.md *.yml *.yaml *.json *.mjs *.mts *.ts` excluding `.git`/`node_modules`/`dist`/archives/binary-generated junk; clear CI step + `package.json` script (e.g. `check:text-hygiene` / `scan` wiring consistent with existing `check-offline-egress` usage).
- Safe workflow docs: UTF-8 body file → hygiene check → `gh pr create/edit --body-file`; release notes file → check → `gh release create/edit --notes-file`; PowerShell literal here-strings/files; this session's own product PR MUST dogfood it.
- Narrow AGENTS/maintenance instruction update requiring body-file + hygiene check before PR/release mutations. No new public CLI surface.

## Out of scope

- Version bump/publish/tag/release; Browser Companion; docs redesign/theme assets.
- Redundant CLI commands beyond what fits existing conventions.
- Blocking legitimate Unicode/Turkish content or normal Markdown.

## Dependencies

- TASK-0074 (archive hygiene lands first so active/archive invariants and doctor baseline are stable while new script + CI land).

## Affected files / expected areas

- `scripts/check-text-hygiene.mjs` (new).
- `package.json` scripts (hygiene/scan wiring).
- `.github/workflows/ci.yml` (hygiene step in `verify` and/or `self-scan`).
- `tests/**/text-hygiene*.test.ts` or `tests/security/text-hygiene*.test.ts` (BEL regression + allow-policy + scanner-mode fixtures).
- `AGENTS.md`, `.github/copilot-instructions.md`, `docs/guides/**` or maintenance notes (body-file workflow, narrow diff).
- Session PR body file (untracked scratch, not committed) proving dogfood.

## Acceptance criteria

- [x] `"a\u0007ckit sync"` fails the checker and names `U+0007` (automated test).
- [x] Clean Markdown/backticks/backslashes/Turkish/Unicode passes (automated test).
- [x] Checker scans repo scope with documented excludes; findings format has file/line-col/codepoint/escaped; exit non-zero on findings; no raw control echo.
- [x] CI step integrated in `verify` job; local repo-scope run passes (exact-head CI proof lands with the product PR in TASK-0076).
- [x] Safe body-file workflow documented in AGENTS/maintenance surface (dogfood proof recorded with the product PR in TASK-0076).
- [x] Full gates green; `0.4.0` unchanged; Browser Companion untouched.

## Test steps

1. `node scripts/check-text-hygiene.mjs --help` (or no-arg usage) + direct BEL fixture → expect fail naming `U+0007`.
2. Clean-corpus fixture (Turkish/Unicode/Markdown) → expect pass.
3. `node scripts/check-text-hygiene.mjs <repo-scope>` → expect pass; `git diff --check`.
4. Focused vitest run for new suite, then `pnpm lint && pnpm format:check && pnpm typecheck && pnpm build && pnpm test`.
5. CI exact-head run on the product PR shows the hygiene step green.

## Security considerations

- Checker never echoes raw control bytes (safe output only); reads files as UTF-8, handles binaries by skipping/sniffing without crashing.
- No network/dependency; no secret handling; PowerShell examples avoid escape-prone interpolation.
- PR bodies via file avoid shell-injection/corruption class entirely.

## Risks

- Over-blocking legitimate content (CR, Unicode) → allowlist LF/TAB (+CR) tested with Turkish/Unicode corpus.
- CI scope too broad (generated/binary noise) → explicit excludes; deterministic file list.

## Rollback plan

- Focused revert of script + CI step + docs line; checker is additive, nothing else depends on it.

## Completion notes

Done 2026-09-03 on `chore/repository-hygiene`. Root cause/process conclusion:
tracked files were clean; corruption happens at PR-body composition
(multiline inline `--body` interpolation), so the fix is a composition-time
gate, not a repo-content fix. Delivered: `scripts/check-text-hygiene.mjs`
(files + `--stdin` + `--repo`, allows LF/TAB/CR, rejects other C0 + DEL,
`file:line:col: U+XXXX (\uXXXX NAME)` output, never echoes raw controls,
exit 0/1/2, zero deps) + `scripts/check-text-hygiene.d.mts` typings;
`--repo` scope `*.md *.yml *.yaml *.json *.mjs *.mts *.ts` minus
`.git/node_modules/dist/coverage/.ackit/artifacts/backup*`;
`check:text-hygiene` npm script; `Text hygiene (C0 controls)` step in
`ci.yml verify`; safe body-file workflow in `AGENTS.md` Git discipline +
`.github/copilot-instructions.md` Commit Hygiene. Test sources carry no raw
controls (built via `String.fromCharCode`/concatenation; the checker scans
itself clean). Evidence: `tests/security/text-hygiene.test.ts` 10/10
(BEL regression names U+0007, no-echo assertion, NUL/DEL/ESC, Turkish/Unicode/
Markdown pass, stdin, exit-2 paths, live `--repo` exit 0); `pnpm lint`,
`format:check`, `typecheck` green; `--repo --quiet` exit 0 on the tree.
Exact-head CI proof + PR dogfood (`--body-file` + PASS) execute with the
product PR in TASK-0076. Package `0.4.0`; Browser Companion untouched.
