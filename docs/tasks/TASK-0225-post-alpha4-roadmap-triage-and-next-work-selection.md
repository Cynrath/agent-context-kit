# TASK-0225: Post-alpha4 roadmap triage and next work selection

## Purpose
Confirm alpha4 release train is closed, audit the remaining backlog across all planning/docs sources, and recommend the single next highest-priority work item. Do not start a new release train.

## Scope
- Verify alpha4 closure evidence (CLI version, doctor, scan, CI status, release artifacts)
- Audit ISSUE_BACKLOG.md, NEXT_TASKS.md, ROADMAP.md for any incomplete work
- Review SESSION_HANDOFF.md / CONTEXT_PACK.md / NEXT_STEPS.md for stale or missed items
- Run `ackit doctor` and `ackit scan --ci` to reassess current repository state
- Select and document one concrete next task with rationale
- The selected task is not started in TASK-0225; only the recommendation is recorded

## Out of scope
- No version bump, package metadata change, tag, release, NuGet publish, or workflow dispatch
- No source code or test changes
- No README, release doc, or NuGet README edits
- No GitHub issue creation (maintainer action only)
- No new project control task series
- No RB-003/RB-008 closure or re-evaluation

## Affected files
- `docs/tasks/TASK-0225-post-alpha4-roadmap-triage-and-next-work-selection.md` (this file, creation only)

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
1. Alpha4 closure is conclusively confirmed: `ackit --version` returns `0.2.0-alpha.4`, doctor passes 13/13, scan --ci exits 0 with only classified Low/Medium findings, all docs agree train is closed
2. Every backlog source is audited (ISSUE_BACKLOG.md, NEXT_TASKS.md, ROADMAP.md, SESSION_HANDOFF.md, CONTEXT_PACK.md, NEXT_STEPS.md) and no unfinished items remain
3. One concrete next task is recommended with evidence-based rationale
4. Commit Completeness Hard Rule: this file is committed in the same logical step that creates it

## Test steps
1. `ackit --version` -- must print `AgentContextKit 0.2.0-alpha.4`
2. `ackit doctor` -- must exit 0 with 13/13 PASS
3. `ackit scan --ci` -- must exit 0 with no Critical/High findings; known Medium/Low findings only
4. Manual review of each backlog doc for stale or incomplete entries

## Risks
- Documentation drift: if a backlog doc mentions incomplete work that was actually completed, the recommendation could be based on stale data. Mitigated by reading all docs at consistent HEAD.
- Scope creep: the triage could identify many small fixable items; the task is explicitly scoped to *select* not *execute*.

## Rollback plan
- No code or production state is changed. If the recommendation is wrong, a subsequent task can correct it. The only artifact is this task file.

## Completion notes

### Dogfood evidence

All ACKit-first dogfood commands executed and passed on the project root:

| Command | Result |
|---------|--------|
| `ackit --version` | `AgentContextKit 0.2.0-alpha.4` |
| `ackit doctor` | 13/13 PASS |
| `ackit scan --ci` | Exit 0. 580 files, 0 Critical, 0 High, 4 Medium, 5 Low |
| `ackit task "..."` | Created this file |

Scan findings are all previously classified and accepted:
- **Medium**: `.remember/logs/*` (MEMORY_LOG_REVIEW), `artifacts/package-validation/0.2.0-alpha.3/*` (ACCEPTED_RETAINED_ARTIFACT)
- **Low**: Local filesystem path references in docs and tests (LOCAL_PATH_REFERENCE)

### Alpha4 closure confirmation

- Release: `v0.2.0-alpha.4` published on GitHub and NuGet as pre-release
- Publish SHA: `98cdf9723a509a347bd0403f6373dafe81ba03fb`
- Final HEAD: `1bb43d4` with all CI green
- TAG `v0.2.0-alpha.4` exists, GitHub prerelease exists
- NuGet global tool install verified, `ackit version` returns `0.2.0-alpha.4`
- Published-package smoke workflow pinned to `0.2.0-alpha.4` (TASK-0223)
- Alpha4 publish train is closed per TASK-0224

### Backlog audit results

| Source | Status |
|--------|--------|
| `ISSUE_BACKLOG.md` | All 18 items completed. No open items remain. |
| `NEXT_TASKS.md` | Queue points at completed alpha4 tasks. No pending items. |
| `ROADMAP.md` | All project controls through 0110 closed. No next work defined beyond completed alpha4. |
| `RELEASE_VALIDATION.md` | Alpha4 evidence recorded. No gaps. |
| `TASK-0224` | Final audit complete. CI closure verified. |
| `SESSION_HANDOFF.md` | Alpha4 train marked closed. |
| `CONTEXT_PACK.md` | Alpha4 tasks marked complete. |
| `NEXT_STEPS.md` | 55 numbered items, all completed through alpha4 closure. |

**Verdict**: The backlog is fully clear. Every item from the original post-alpha3 maintenance chain (TASK-0209 through TASK-0217) and the alpha4 publish train (TASK-0218 through TASK-0224) is complete.

### Recommendation: Next normal roadmap task

**Recommended task**: `TASK-0226: Post-alpha4 code-quality refresh`

**Rationale**: Following the established post-release pattern from alpha3 (TASK-0209 triage -> TASK-0210 analyzer-warning cleanup), the highest-value next step is a fresh code-quality pass over everything changed by the alpha4 publish train (TASK-0215 through TASK-0224). Specific candidates for TASK-0226:

1. **Fresh analyzer scan** — TASK-0210 cleaned xUnit analyzer warnings in the pre-alpha4 codebase. The alpha4 train added new code/files (README.nuget.md, PR infrastructure, agent rules). A fresh `dotnet build` with all analyzers enabled may reveal new warnings.
2. **Low-severity finding reduction** — The 5 Low findings (local filesystem paths in docs and test files) are classified as accepted LOCAL_PATH_REFERENCE but could potentially be cleaned up with relative-path or placeholder replacements.
3. **ACKIT-first dogfood hardening** — The dogfood rules are new (TASK-0221). A focused review could identify workflow friction points or missing automation.
4. **MCP plugin transport DIAG-001** — Recorded as open but never assigned a task. TASK-0226 could assess whether this warrants implementation scope.

If the code-quality refresh finds no actionable items, the fallback recommendation is to begin **V100 stabilization pre-work** (revisiting `docs/V100_GAP_ANALYSIS.md` and selecting the smallest actionable gap).

TASK-0225 completed. No publish, tag, release, version bump, NuGet mutation, or GitHub write occurred.
