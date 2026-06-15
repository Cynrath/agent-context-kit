# TASK-0169 Add `generate` Targets for Anthropic and Continue

## Purpose
Add additive `generate` targets for Anthropic CLI and Continue (VS Code extension), preserving existing target behavior and the JSON output contract.

## Current State
- Current `generate` targets: `codex`, `claude`, `cursor`, `copilot`, `all`.
- Existing skip-existing behavior: yes.
- Localized CLI strings: yes, English and Turkish.

## Evidence
- `ackit --help` lists `ackit generate [--target codex|claude|cursor|copilot|all] [--lang en|tr] [--json]`.
- Existing generate tests cover Codex, Claude, Cursor, Copilot, and `all` paths.

## Scope
- Add `Anthropic` and `continue` as valid `--target` values.
- Generate `Anthropic.md` for the Anthropic CLI target.
- Generate `.continue/config.json` for the Continue target.
- Add `Anthropic` and `continue` to the `all` target set.
- Localize new user-facing strings in English and Turkish.
- Keep JSON output schema stable.

## Out Of Scope
- Removing or renaming existing targets.
- Changing the JSON schema version.
- Adding network calls.
- Implementing Continue JSON auto-installation or remote sync.

## Affected Files
- `src/AgentContextKit.Cli/**` (generate command and target registration)
- `src/AgentContextKit.Core/**` (target catalog)
- `tests/AgentContextKit.Tests/**` (generate tests)
- `docs/CLI_REFERENCE.md`
- `docs/GENERATED_FILES.md`
- `docs/AI_WORKFLOW.md`
- `README.md`
- `README.tr.md`

## Implementation Steps
1. Add `Anthropic` and `continue` to the target enum/registry.
2. Implement template generation for `Anthropic.md` and `.continue/config.json`.
3. Update `--target all` to include the new targets.
4. Localize new user-facing strings.
5. Add tests for skip-existing, JSON output stability, and `all` behavior.

## Security/Privacy Boundary
- Offline-only; no network.
- No telemetry.
- No file overwrite by default.
- Skip-existing behavior preserved.

## Backward Compatibility
- All existing targets keep current behavior.
- JSON schema version unchanged.
- New `Anthropic` and `continue` targets are additive.

## Acceptance Criteria
- `ackit generate --target Anthropic` creates `Anthropic.md` with stable content.
- `ackit generate --target continue` creates `.continue/config.json` with stable content.
- Re-running the command on an existing file skips and reports.
- `ackit generate --target all` produces all expected files including the new ones.
- Turkish and English CLI strings exist for new messages.
- Existing test suite remains green (257/257 or higher).

## Tests
- Generate Anthropic target creates `Anthropic.md`.
- Generate Continue target creates `.continue/config.json`.
- Existing file behavior skips safely.
- JSON output includes generated/skipped result without schema break.
- `generate --target all` covers all five targets.
- Localization parity for new user-facing strings.

## Validation
- `dotnet test AgentContextKit.sln -c Release --no-build`
- `dotnet run --project src/AgentContextKit.Cli -c Release --no-build -- generate --target Anthropic --lang en --json`
- `dotnet run --project src/AgentContextKit.Cli -c Release --no-build -- generate --target continue --lang en --json`
- `dotnet run --project src/AgentContextKit.Cli -c Release --no-build -- generate --target all --lang en --json`

## Rollback
Revert the commit.

## Completion Evidence
Pending. Will be filled after implementation and tests.

## Commit
- `feat: add Anthropic and continue generate targets`

## Push
- Normal `master` push after validation.

## Hosted Checks
- ci
- cross-platform-smoke
- cross-platform-source-smoke
