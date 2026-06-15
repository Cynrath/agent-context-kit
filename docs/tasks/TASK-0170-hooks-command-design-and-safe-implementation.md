# TASK-0170 `ackit hooks` Command, Safe Implementation

## Purpose
Add a local-only `ackit hooks` command that previews and optionally installs repository-local Git hooks to run `ackit scan --ci`.

## Current State
- No hook automation exists.
- CLI exit codes: `0` success, `1` CI findings, `2` invalid invocation, `3` scanner/internal error.

## Evidence
- `ackit --help` does not list a `hooks` command.
- `.git/hooks/pre-commit` and `.git/hooks/pre-push` are user-owned and may already exist.

## Scope
- Add `ackit hooks [--shell pwsh|sh] [--install] [--output <repo-relative-dir>] [--lang en|tr] [--json]`.
- Default mode is preview (dry-run).
- `--install` writes `.git/hooks/pre-commit` and `pre-push` only when missing.
- `--output` writes to a user-selected repository-relative directory instead of `.git/hooks/`.
- `--shell` selects `pwsh` (Windows) or `sh` (POSIX) script template.
- Localized messages in English and Turkish.
- Keep existing exit code contract.

## Out Of Scope
- Forcing overwrite of existing hooks.
- Global hook installation.
- Network calls or remote sync.
- Auto-update of installed hooks.

## Affected Files
- `src/AgentContextKit.Cli/**` (hooks command)
- `src/AgentContextKit.Core/**` (template rendering)
- `tests/AgentContextKit.Tests/**` (hooks tests)
- `docs/CLI_REFERENCE.md`
- `docs/GIT_HOOKS.md`
- `docs/DEVELOPMENT_STANDARD.md`
- `README.md`
- `README.tr.md`

## Implementation Steps
1. Add `hooks` command with `--shell`, `--install`, `--output`, `--lang`, `--json` flags.
2. Implement dry-run preview that lists target paths and contents without writing.
3. Implement `--install` writing only when the target file is missing.
4. Implement `--output` for non-`.git/hooks` writing.
5. Localize new user-facing strings.
6. Add tests for preview, install, skip-existing, and invalid invocation.

## Security/Privacy Boundary
- Local-only; no network.
- No secrets, tokens, or credentials embedded in the generated hook script.
- Hook script runs `ackit scan --ci` and exits with the scanner exit code.
- Existing hook files are not overwritten.

## Backward Compatibility
- Adds a new command; does not change existing commands.
- Exit code contract preserved.

## Acceptance Criteria
- `ackit hooks` without flags prints preview only and writes nothing.
- `ackit hooks --install` writes `pre-commit` and `pre-push` scripts in a temp Git repo.
- Existing hook files are skipped with a clear message.
- Running outside a Git repo exits with code `2` and a clear message.
- `--json` output is schema-compatible.
- English and Turkish messages exist.
- Existing test suite remains green.

## Tests
- Preview does not write files.
- `--install` writes expected hook content in a temp git repo.
- Existing hook is not overwritten.
- Invalid non-git repo produces safe error.
- JSON output is schema-compatible.
- Turkish/English messages exist.

## Validation
- `dotnet test AgentContextKit.sln -c Release --no-build`
- `dotnet run --project src/AgentContextKit.Cli -c Release --no-build -- hooks --lang en --json`
- `dotnet run --project src/AgentContextKit.Cli -c Release --no-build -- hooks --install --shell pwsh --lang en --json` (in a temp git repo)

## Rollback
Revert the commit.

## Completion Evidence
Pending. Will be filled after implementation and tests.

## Commit
- `feat: add safe git hooks command`

## Push
- Normal `master` push after validation.

## Hosted Checks
- ci
- cross-platform-smoke
- cross-platform-source-smoke
