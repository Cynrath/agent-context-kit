# TASK-0172 `ackit trim` Design And Minimal Safe Implementation

## Purpose
Provide local-only deterministic trimming of generated context/prompt files to a size budget.

## Current State
- `ackit prompt-pack` and `ackit context-export` exist.
- No trimming helper exists.
- No tokenizer dependency is used.

## Evidence
- `ackit --help` lists `prompt-pack` and `context-export`.
- The agent context kit is offline-first; no external tokenizers are loaded.

## Scope
- Add `ackit trim --input <repo-relative.md|json> --output <repo-relative.md|json> --max-chars <N> [--lang en|tr] [--json]`.
- Trim by character count, not token count.
- Preserve header and safety sections when possible.
- Refuse to overwrite input unless explicit `--output` differs from `--input`.
- Localized messages in English and Turkish.
- Document the difference between `--max-chars` and model token counts.

## Out Of Scope
- Adding a tokenizer dependency.
- Network calls.
- Promise of exact token compatibility with any LLM.
- In-place input mutation by default.

## Affected Files
- `src/AgentContextKit.Cli/**` (trim command)
- `src/AgentContextKit.Core/**` (trim logic)
- `tests/AgentContextKit.Tests/**` (trim tests)
- `docs/PROMPT_PACK.md`
- `docs/CONTEXT_EXPORT.md`
- `docs/CLI_REFERENCE.md`

## Implementation Steps
1. Add `trim` command with `--input`, `--output`, `--max-chars`, `--lang`, `--json` flags.
2. Implement deterministic trimming that preserves the safety header when possible.
3. Localize new user-facing strings.
4. Document the `--max-chars` vs token-count distinction in docs.
5. Add tests for trimming, refusal to overwrite input, and invalid arguments.

## Security/Privacy Boundary
- Local-only.
- No external dependency.
- No network.
- Deterministic output.

## Backward Compatibility
- Adds a new command; existing commands unchanged.
- JSON schema is additive.

## Acceptance Criteria
- Trims a large Markdown file under the requested max chars.
- Refuses to overwrite input by default.
- Refuses invalid `max-chars` (non-positive or non-integer) with exit code `2`.
- JSON output reports original and trimmed size.
- Output is deterministic.
- English and Turkish messages exist.
- Existing test suite remains green.

## Tests
- Trims large Markdown under max chars.
- Refuses invalid max chars.
- Does not overwrite input by default.
- JSON output reports original and trimmed size.
- Output is deterministic.

## Validation
- `dotnet test AgentContextKit.sln -c Release --no-build`
- `dotnet run --project src/AgentContextKit.Cli -c Release --no-build -- trim --input .ackit/tmp/big.md --output .ackit/tmp/big.trim.md --max-chars 1000 --lang en --json`

## Rollback
Revert the commit.

## Completion Evidence
Pending. Will be filled after implementation and tests.

## Commit
- `feat: add deterministic context trim command`

## Push
- Normal `master` push after validation.

## Hosted Checks
- ci
- cross-platform-smoke
- cross-platform-source-smoke
