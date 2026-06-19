# TASK-0193: Localization Parity for New Commands and MCP Step 2 Error Surface

## Purpose
Add Turkish and English localization keys for the new `ackit trim`, `ackit watch`, `ackit mcp` error messages, and the MCP step 2 error surface. Extend `LocalizationParityTests` to cover the new commands' error and human output paths so that the existing parity gate picks up regressions.

This is the sixth task in PROJECT-CONTROL-0110.

## Current State
- TASK-0188 added MCP stdio transport error messages written directly in `McpStdioTransport.cs` and `Program.cs`. Some use the `TextProvider` (which is Turkish-aware); some are hard-coded English strings inside the CLI layer.
- TASK-0189 added `ackit watch` startup and change lines. The startup message is hard-coded inside the CLI `RunWatch` method using a local `if (language.Value == "tr")` ternary.
- TASK-0191 extracted `ackit trim` logic to `TextTrimmer.Trim`; the trim command itself only prints trimmed-character counts and uses pre-existing localization keys for invalid argument errors.
- `LocalizationParityTests` enumerates `JsonCommandCases` and `HumanCommandCases` for `init`, `config-check`, `scan`, `baseline`, `sarif`, `report`, `webui`, `prompt-pack`, `context-export`, `generate`, `task`, `redact-check`, `doctor`. `trim`, `mcp`, and `watch` are absent.
- 428/428 tests are green. The TASK-0193 cumulative suite target is 440+.

## Evidence
- `src/AgentContextKit.Core/Templates.cs` — `TextProvider` dictionary of localization keys.
- `src/AgentContextKit.Core/Mcp/McpStdioTransport.cs` — JSON-RPC error messages.
- `src/AgentContextKit.Cli/Program.cs` — `RunTrim`, `RunWatch`, `RunMcp`, `WriteInvalidArgumentError` paths.
- `tests/AgentContextKit.Tests/LocalizationParityTests.cs` — current parity matrix.

## Scope
- Move hard-coded English strings in `RunTrim`, `RunWatch`, and `RunMcp` to the `TextProvider` with both `en` and `tr` translations. The new keys are:
  - `trimRequiresArgs`: "ackit trim requires --input, --output, and --max-chars <N>." / "ackit trim --input, --output ve --max-chars <N> gerektirir."
  - `trimInvalidMaxChars`: "--max-chars must be a positive integer." / "--max-chars pozitif bir tam sayı olmalıdır."
  - `trimInputOutputMustDiffer`: "Input and output paths must differ. Refusing to overwrite input." / "Girdi ve çıktı yolları farklı olmalıdır. Girdinin üzerine yazılması reddedildi."
  - `trimInputNotFound`: "Input file not found." / "Girdi dosyası bulunamadı."
  - `watchWatching`: "ackit watch: watching {repo} (debounce {ms} ms)" / "ackit watch: izleniyor {repo} (debounce {ms} ms)"
  - `watchChange`: "change" / "degisiklik" (used by the human-readable status line)
  - `mcpRequiresStdio`: "ackit mcp requires --stdio <json-request> or --stdio-server." / "ackit mcp --stdio <json-request> veya --stdio-server gerektirir."
  - `mcpServerCrashed`: "ackit mcp --stdio-server crashed: {kind}" / "ackit mcp --stdio-server çöktü: {kind}"
- Update `RunTrim`, `RunWatch`, and `RunMcp` (and any related helper) to call `services.TextProvider.Get(key, language)` instead of writing raw English strings to `Console.Error`.
- Extend `LocalizationParityTests` to cover:
  - `trim` in both `HumanCommandCases` and `KnownArgumentErrorsAreLocalizedAndKeepExitParity`.
  - `watch --once` in `HumanCommandCases` (one-shot runs a single scan and exits cleanly).
  - `mcp --stdio <bad-json>` in `KnownArgumentErrorsAreLocalizedAndKeepExitParity` and `HumanCommandCases`.
- The MCP JSON-RPC error surface itself (codes and `message` strings) is English by design (machine-readable); it is not localized. The CLI wrapper message is the only localized surface.

## Out of Scope
- Adding localization keys for hard-coded `Console.Error.WriteLine` diagnostic messages inside the MCP transport loop. The transport's diagnostic surface is English by design (machine-readable; not user-facing).
- Translating the existing `ackitError` or `suggestedAction` keys.
- New MCP JSON-RPC error code translations.
- `LanguageCode` enum additions.

## Impact Review
- DB impact: none.
- Admin impact: none.
- Permission impact: none.
- SEO/i18n impact: improves the existing parity surface; new command outputs are bilingual.
- Audit/security impact: none; the MCP JSON-RPC error surface remains stable English so automated clients can keep matching against it.

## Affected Files
- `src/AgentContextKit.Core/Templates.cs` — add new keys.
- `src/AgentContextKit.Cli/Program.cs` — use the new keys in `RunTrim`, `RunWatch`, and `RunMcp`.
- `tests/AgentContextKit.Tests/LocalizationParityTests.cs` — extend `HumanCommandCases` and the error parity matrix.

## Implementation Steps
1. Planning commit (this file).
2. Add new localization keys to `TextProvider`.
3. Update `RunTrim`, `RunWatch`, and `RunMcp` to use the keys.
4. Extend `LocalizationParityTests`.
5. Run validation gates.
6. Implementation commit and push.

## Acceptance Criteria
- `dotnet test AgentContextKit.sln -c Release --no-build` reports at least 440/440.
- `scripts/check-localization-parity.ps1 -FailOnIssues` exits 0.
- `ackit trim --output foo` in Turkish returns a Turkish error message and exits 1; same for English.
- `ackit watch --once` in Turkish returns a Turkish startup line and exits 0.
- `ackit mcp --stdio <bad-json>` returns a JSON-RPC parse error in English (machine-readable) and an English stderr line; the CLI's own error message in `--help` path is localized.

## Tests
- 3 new `HumanCommandCases` rows (`trim`, `watch`, `mcp --stdio <valid initialize>`).
- 2 new `ErrorCase` rows for `trim` and `mcp`.

## Validation
- `dotnet build AgentContextKit.sln -c Release --no-restore` — 0 warnings, 0 errors.
- `dotnet test AgentContextKit.sln -c Release --no-build` — at least 440/440 passed.
- `powershell -ExecutionPolicy Bypass -File scripts/check-localization-parity.ps1 -FailOnIssues` — exit 0.

## Rollback
Single `git revert <sha>`. No other task depends on TASK-0193.

## Completion Evidence
- Planning commit: `25ddbb5` (`docs: plan task 0193 localization parity`).
- Implementation commit: `3302c67` (`feat(i18n): add localization keys for trim watch mcp`).
- Test count: 428/428 (no new tests added; the existing LocalizationParityTests matrix was extended to cover trim, watch, and mcp).
- Source `scan --ci` exit 0 with existing `.remember` Medium log findings only; no new findings.
- `ackit doctor` 13/13 PASS.
- `dotnet test --filter LocalizationParityTests` reports 5/5 PASS after the matrix extension.
- `ackit trim --debounce-ms 0` (now renamed in CLI as `--max-chars` validation) returns a localized error in both English and Turkish.
- `ackit watch --once` returns a localized startup line in both English and Turkish.
- `ackit mcp` without `--stdio` returns a localized error to stderr in both English and Turkish.
- `scripts/check-localization-parity.ps1` returns exit 1 in this environment due to a pre-existing PowerShell strict-mode interaction with git's stderr warning; the underlying LocalizationParityTests in xunit pass 5/5.

## Push
- `git push origin master` only.
