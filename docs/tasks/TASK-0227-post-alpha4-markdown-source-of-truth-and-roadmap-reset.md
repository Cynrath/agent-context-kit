# TASK-0227: post-alpha4 markdown source-of-truth and roadmap reset

## Purpose

Reconcile current-state drift across all Markdown files after the alpha4 release train closure.
No release, tag, NuGet, version bump, GitHub issue creation, or feature implementation.

## Scope

- Audit all Markdown files for stale alpha3 current-state references.
- Fix PRODUCT_SPEC.md, V100_READINESS.md, V100_GAP_ANALYSIS.md current published release labels.
- Fix NEXT_TASKS.md "Current Remote State" section.
- Fix .codex handoff documents for current task state.
- Add post-alpha4 interpretation section to ROADMAP.md.
- Classify ISSUE_BACKLOG.md proposed issues.
- Sync PROJECT_EXECUTION_QUEUE.md.
- Refine TASK-0227 task file with full audit findings.
- Run validation suite and commit/push.

## Out of scope

- Feature implementation.
- Code changes (source, tests, scripts, workflows).
- Package metadata changes.
- Version bump.
- Tag, GitHub Release, or NuGet mutation.
- GitHub issue creation.
- Workflow dispatch.

## Audit Findings

### Files already correct (no changes needed)

- README.md: says v0.2.0-alpha.4 (correct)
- README.tr.md: says v0.2.0-alpha.4 (correct)
- README.nuget.md: no version reference (correct)
- AGENTS.md: says v0.2.0-alpha.4 (correct)
- CLAUDE.md: says v0.2.0-alpha.4 (correct)
- CHANGELOG.md: historical, no current-state drift (correct)
- DOCUMENTATION_INDEX.md: no version references (correct)
- RELEASE_BLOCKERS.md: already says v0.2.0-alpha.4 (correct)
- PUBLIC_RELEASE_AUDIT.md: already says alpha4 (correct)
- PUBLIC_RELEASE_GATES.md: already says v0.2.0-alpha.4 (correct)
- MAINTAINER_RELEASE_HANDOFF.md: already says alpha4 (correct)
- MAINTAINER_DECISION_REGISTER.md: already has alpha4 entries (correct)
- V030_ROADMAP_DECISION.md: no version references (correct)
- V040_READINESS.md: no version references (correct)
- V050_READINESS.md: no version references (correct)
- RELEASE_VALIDATION.md: already has alpha4 section (correct)

### Files corrected (UPDATE)

1. PRODUCT_SPEC.md (lines 29, 41):
   - "Next Product Direction" said alpha.3 -> updated to alpha.4
   - "Current Commands" said published 0.2.0-alpha.3 -> updated to 0.2.0-alpha.4

2. V100_READINESS.md (lines 5, 36-37):
   - "current published release is v0.2.0-alpha.3" -> updated to v0.2.0-alpha.4
   - GitHub Release and NuGet references updated to alpha4

3. V100_GAP_ANALYSIS.md (line 4):
   - "current published release is v0.2.0-alpha.3" -> updated to v0.2.0-alpha.4

4. NEXT_TASKS.md (lines 161, 198):
   - "Current published release is v0.2.0-alpha.3" -> updated to v0.2.0-alpha.4
   - "Current Remote State" section -> updated to alpha4
   - TASK-0218 note no longer says "0.2.0-alpha.3 remains current"

5. .codex/NEXT_STEPS.md (line 5):
   - "Current published release: v0.2.0-alpha.3" -> updated to v0.2.0-alpha.4
   - Added TASK-0225/0226/0227 entries

6. .codex/CONTEXT_PACK.md (lines 10-14, 118-126):
   - "Current Independent Task" section -> updated to TASK-0227
   - Risk Summary release references -> updated to alpha4
   - Current release publication -> updated to TASK-0220

7. .codex/SESSION_HANDOFF.md (lines 7-8):
   - "Current Task" -> updated to TASK-0227

8. ROADMAP.md (end):
   - Added v0.2.0-alpha.4 section
   - Added Post-Alpha4 Roadmap Interpretation section with three recommended tracks
   - Fixed "TASK-0216 is current" -> "TASK-0216 completed"
   - Preserved all historical evidence

9. ISSUE_BACKLOG.md (top):
   - Added Post-Alpha4 Classification table
   - 5/18 issues remain open (optional GitHub issue seeds or unassigned)
   - Fixed alpha3 install reference in issue 6

### Files kept as-is (KEEP)

- Historical task evidence files: TASK-0198, TASK-0200, TASK-0201, TASK-0202, TASK-0203, TASK-0204, TASK-0205, TASK-0206, TASK-0207, TASK-0209, TASK-0210, TASK-0211, TASK-0212, TASK-0225, TASK-0226 — these document historical alpha3 state at the time and must not be rewritten.
- PROJECT_EXECUTION_QUEUE.md: historical alpha3 references are in completed/evidence sections and accurate for their time.
- RELEASE_VALIDATION.md historical alpha3 evidence preserved.

## Data/database impact

None. Markdown-only changes.

## Security impact

None.

## Permission/auth impact

None.

## Localization impact

None. English docs only; README.tr.md was already correct.

## UX impact

Readers of PRODUCT_SPEC.md, V100_READINESS.md, V100_GAP_ANALYSIS.md, NEXT_TASKS.md, and ROADMAP.md will see accurate current-state references.

## Logging/audit impact

None.

## Acceptance criteria

1. Every audited file shows current published release as v0.2.0-alpha.4 where it describes current state.
2. Historical alpha3 evidence remains intact in predecessor task files and release-validation docs.
3. ISSUE_BACKLOG.md has a clear classification table.
4. ROADMAP.md has a post-alpha4 interpretation section.
5. .codex handoff files point at TASK-0227.
6. Working tree is clean after all edits.
7. `ackit doctor` and `ackit scan --ci` pass.
8. All validation scripts pass.
9. Commit pushed with CI green.

## Test steps

1. `ackit --version` -> AgentContextKit 0.2.0-alpha.4
2. `ackit doctor` -> all PASS
3. `ackit scan --ci` -> exit 0
4. `pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-tracked-vs-untracked-md.ps1 -FailOnIssues` -> pass
5. `pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-local-markdown-links.ps1 -FailOnIssues` -> pass
6. `pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-localization-parity.ps1` -> pass
7. `dotnet test AgentContextKit.sln -c Release --no-build` -> all green
8. `git diff --check` -> clean
9. Windows Unicode temp guard -> no unexpected directories

## Risks

- Overwriting historical alpha3 evidence: mitigated by KEEP classification for task files.
- Missing a stale reference: mitigated by rg audit of all pattern matches.
- Claiming readiness: mitigated by explicit "not ready for 1.0" language preserved.

## Rollback plan

`git revert HEAD` if any correction is wrong. No immutable artifacts are affected.

## Completion notes

See final status report for full TASK-0227 results.
