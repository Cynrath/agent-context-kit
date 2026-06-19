# TASK-0191: Trim Edge Case Tests

## Purpose
Add edge case tests for `ackit trim` on top of the minimal safe implementation from TASK-0172. The new tests cover binary input, large files, UTF-8 boundary safety (splitting inside a multi-byte character), empty input, non-ASCII content, embedded null bytes, and the `header + note` overflow edge case. The tests do not change runtime behavior.

This is the fourth task in PROJECT-CONTROL-0110.

## Current State
- TASK-0172 added `ackit trim --input <repo-relative.md|json> --output <repo-relative.md|json> --max-chars <N>` plus a private `TrimContent` helper in `src/AgentContextKit.Cli/Program.cs`.
- 407/407 tests are green. The TASK-0191 cumulative suite target is 420+.
- No dedicated trim unit test file exists; trim coverage today is implicit through other CLI tests.

## Evidence
- `src/AgentContextKit.Cli/Program.cs` — `RunTrim` and `TrimContent` (private static).
- `docs/tasks/TASK-0172-context-trim-command-design-token-budgeting.md` — original task plan.

## Scope
- Extract `TrimContent` from the CLI into a Core helper `TextTrimmer.Trim(string content, int maxChars)` so it is unit-testable without spinning up the CLI process. The CLI calls the Core helper.
- Add `tests/AgentContextKit.Tests/TextTrimmerTests.cs` covering at least:
  - Content shorter than `maxChars` is returned unchanged.
  - Content equal to `maxChars` is returned unchanged.
  - Content exactly `header.Length + note.Length` returns just the header and note.
  - Content one byte above `header + note` returns `header + note` plus the first body byte.
  - Content with a UTF-8 multi-byte character at the truncation boundary returns the full `header + note` plus the characters up to the boundary that do not split a multi-byte sequence. The test fixture uses a known multi-byte sequence such that the natural `Substring(0, bodyBudget)` boundary falls inside a character; the helper truncates by character count, so the result must be valid UTF-16 (no orphaned surrogates) even if the source content has surrogate pairs.
  - Binary input containing a null byte (`\0`) is truncated deterministically; the null byte is treated as a normal character and is preserved or truncated at the same boundary.
  - Empty input returns the header and note only when the input length is below the threshold; otherwise returns empty (degenerate case for `maxChars < header.Length + note.Length`).
  - Large content (10 000 chars repeated) is truncated to a small budget and remains valid UTF-16.
  - Output is deterministic: two calls with the same input produce equal strings.
- Extend `RunTrim` to call the Core helper. No CLI behavior change.

## Out of Scope
- Real file system I/O edge cases (covered separately by the CLI integration).
- Tokenizer integration (deliberately excluded from the MVP).
- New CLI flags or behavior changes.

## Impact Review
- DB impact: none.
- Admin impact: none.
- Permission impact: none.
- SEO/i18n impact: none.
- Audit/security impact: none.

## Affected Files
- `src/AgentContextKit.Core/TextTrimmer.cs` — new helper.
- `src/AgentContextKit.Cli/Program.cs` — `RunTrim` calls `TextTrimmer.Trim`.
- `tests/AgentContextKit.Tests/TextTrimmerTests.cs` — new.

## Implementation Steps
1. Planning commit (this file).
2. Add `TextTrimmer` to Core with the same logic as `TrimContent`.
3. Update `RunTrim` in CLI to call `TextTrimmer.Trim`.
4. Remove the now-unused `TrimContent` from CLI.
5. Add `TextTrimmerTests` covering the bullets above.
6. Run tests and confirm green.
7. Implementation commit.
8. Push.

## Acceptance Criteria
- All new tests pass.
- The cumulative suite is at least 420/420.
- No CLI behavior change.
- `dotnet build AgentContextKit.sln -c Release --no-restore` is clean.

## Tests
- `TextTrimmerTests` (new; at least 9 tests).

## Validation
- `dotnet build AgentContextKit.sln -c Release --no-restore` — 0 warnings, 0 errors.
- `dotnet test AgentContextKit.sln -c Release --no-build` — at least 420/420 passed.
- `dotnet run --project src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- trim --help` — exit 0.

## Rollback
Single `git revert <sha>`. No other task depends on TASK-0191.

## Completion Evidence
- Planning commit: `6a11056` (`docs: plan task 0191 trim edge case tests`).
- Implementation commit: `353ea7f` (`feat(core): add TextTrimmer and trim edge case tests`).
- Test count: 422/422 (407 baseline + 15 new TextTrimmer tests).
- Source `scan --ci` exit 0 with existing `.remember` Medium log findings only; no new findings.
- `ackit doctor` 13/13 PASS.
- `ackit trim --help` exits 0 with the documented surface.

## Push
- `git push origin master` only.
