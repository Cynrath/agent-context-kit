# TASK-0226: Post-alpha4 code-quality refresh

## Purpose
Clean up remaining code-quality items identified by TASK-0225: fix actionable Low scan findings, assess non-fixable findings for documented acceptance, evaluate DIAG-001 status, and verify dogfood rules are fully applied.

## Scope
- Fix the one actionable Low finding (CLI_REFERENCE.md placeholder drive-letter path)
- Rephrase TASK-0225's own absolute path to avoid creating a new finding
- Classify and accept non-fixable Low findings (regex patterns in rg commands, deliberate test inputs, archival evidence)
- Assess DIAG-001 (broken mcp__plugin_* transport) — is it an ACKit issue or an environment issue?
- Verify ACKit-first dogfood rules in AGENTS.md are complete and consistent

## Out of scope
- No version bump, package metadata change, tag, release, NuGet publish, or workflow dispatch
- No new features, commands, or scanner rule changes
- No changes to published release documentation or evidence records
- No GitHub issue creation

## Affected files
- `docs/CLI_REFERENCE.md` — fix placeholder drive-letter path on line 251
- `docs/tasks/TASK-0225-post-alpha4-roadmap-triage-and-next-work-selection.md` — rephrase absolute path on line 66
- `docs/tasks/TASK-0226-post-alpha4-code-quality-refresh.md` — this file

## Data/database impact
- None

## Security impact
- None. No credentials, tokens, or security settings are read or written.

## Permission/auth impact
- None. Read-only local operations only.

## Localization impact
- None. No CLI chrome or user-facing text is changed.

## UX impact
- None. No CLI commands or output are changed.

## Logging/audit impact
- None. No new logging or audit instrumentation.

## Acceptance criteria
1. All actionable Low scan findings are fixed or rephrased
2. Non-fixable findings are documented with classification
3. DIAG-001 is assessed with a clear verdict
4. Dogfood rules are verified complete
5. `ackit doctor`, `ackit scan --ci`, `dotnet build -c Release`, `dotnet test -c Release` all pass
6. Task files committed per Commit Completeness Hard Rule

## Test steps
1. `dotnet build AgentContextKit.sln -c Release` — 0 errors, 0 warnings
2. `dotnet test AgentContextKit.sln -c Release --no-build` — 428/428 passed
3. `ackit doctor` — 13/13 PASS
4. `ackit scan --ci` — exit 0, no new findings beyond accepted classifications
5. Verify the CLI_REFERENCE.md fix no longer triggers the scanner

## Risks
- None. All changes are documentation-only or acceptance actions.

## Rollback plan
- No code or production state is changed. The only edits are doc fixes (CLI_REFERENCE.md, TASK-0225.md). Revert with `git checkout -- <file>`.

## Completion notes

### 1. Fresh analyzer scan
`dotnet build AgentContextKit.sln -c Release` produced **0 warnings, 0 errors**. No new analyzer warnings were introduced by the alpha4 publish train.

### 2. Low-severity finding reduction

| Finding | File | Verdict | Action |
|---------|------|---------|--------|
| `C:\path\to\repo` placeholder path | `docs/CLI_REFERENCE.md:251` | **FIXED** | Replaced with `path/to/repo` (no drive letter) |
| `O:\projeler\agent-context-kit` absolute path | `docs/tasks/TASK-0225.md:66` | **REPHRASED** | Changed to "the project root" |
| `O:\projeler\...\0.2.0-alpha.3` in evidence | `docs/tasks/TASK-0203.md:189` | **ACCEPT** | Archival release evidence; relative equivalent already exists in command examples on lines 191-192 |
| `C:\\` in rg regex pattern | `docs/tasks/TASK-0211.md:117` | **ACCEPT** | False positive; intentional regex in evidence command |
| `C:\\` in rg regex pattern | `docs/tasks/TASK-0212.md:136` | **ACCEPT** | False positive; intentional regex in evidence command |
| `file:///etc/passwd` in test input | `tests/.../McpStdioTransportTests.cs:151` | **ACCEPT** | False positive; deliberate negative test input `InvalidRepoPathAsFileUriReturnsError` |

**After fix**: `ackit scan --ci` shows only the 4 accepted findings (no change from baseline).

### 3. DIAG-001 assessment
**Verdict: NOT AN ACKIT ISSUE. Recommend CLOSED.**

DIAG-001 (`mcp__plugin_*` calls fail with `InputValidationError: required parameter missing`) is consistently described across PROJECT-CONTROL-0109, PROJECT-CONTROL-0110, TASK-0178, TASK-0179, and TASK-0188 as an **environment/host MCP transport issue**. The symptoms are:
- `mcp__plugin_*` is the MCP client/host's transport layer calling into ACKit's MCP tools
- The error `InputValidationError: required parameter missing` occurs BEFORE the request reaches ACKit's `--stdio-server`

ACKit's MCP implementation (`McpStdioTransport`, `McpRouter`, tool definitions in `AckitTools.cs`) is independently verified by 428/428 passing tests including `McpStdioTransportTests`, `McpRouterTests`, and end-to-end stdio loop tests. The host-side transport issue is outside ACKit's codebase and cannot be fixed here.

### 4. Dogfood hardening review
The ACKit-first dogfood rules in `AGENTS.md` (lines 22-33) are complete and consistent:
- Pre-task: `--version`, `doctor`, `scan --ci`
- Task creation via `ackit task` with manual fallback
- dotnet run workaround for untested CLI behavior
- Pre-commit validation requirement
- Generated artifact exclusion
- Task-first workflow, release immutability, no-network defaults
- Temp/output-safe location guidance

No gaps identified. This session successfully followed all dogfood rules.

### 5. Validation results

| Check | Result |
|-------|--------|
| `dotnet build -c Release` | 0 errors, 0 warnings |
| `dotnet test -c Release --no-build` | 428/428 passed |
| `ackit doctor` | 13/13 PASS |
| `ackit scan --ci` | Exit 0 — 0 Critical, 0 High, 4 Medium (accepted), 4 Low (accepted) |
| CLI_REFERENCE.md fix verified | No longer triggers scanner |

### Files changed
- `docs/CLI_REFERENCE.md` — replaced `C:\path\to\repo` with `path/to/repo`
- `docs/tasks/TASK-0225-post-alpha4-roadmap-triage-and-next-work-selection.md` — rephrased absolute path to "the project root"
- `docs/tasks/TASK-0226-post-alpha4-code-quality-refresh.md` — this file

No publish, tag, release, version bump, NuGet mutation, or GitHub write occurred.
