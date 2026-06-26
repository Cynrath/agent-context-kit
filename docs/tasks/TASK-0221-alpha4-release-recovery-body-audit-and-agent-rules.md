# TASK-0221: Alpha4 release recovery, body audit, and ACKit dogfood agent rules

## Purpose
Recover the `v0.2.0-alpha.4` GitHub Release body (contains stale alpha2 content), audit all historical release bodies for version/body mismatch, fix the release body generation source to prevent future stale content, and add ACKit-first dogfood rules to agent instruction files.

## Scope
- Fix `v0.2.0-alpha.4` GitHub Release body (currently shows `# AgentContextKit v0.2.0-alpha.2` title and alpha2 highlights)
- Audit `v0.2.0-alpha.2`, `v0.2.0-alpha.3`, `v0.2.0-alpha.4` release bodies for version/body mismatches
- Fix root cause: `release.yml:252/255` hardcodes `docs/RELEASE_BODY_V020_ALPHA2.md` as `--notes-file`
- Update `AGENTS.md`, `CLAUDE.md` with ACKit-first dogfood rules
- Do NOT edit alpha1/alpha2/alpha3 release bodies unless clearly safe and reconstructable
- Do NOT public-sync README yet (TASK-0222)
- Do NOT update published-package smoke pin (TASK-0223)

## Out of scope
- Public README/docs sync (TASK-0222)
- Published-package smoke pin update (TASK-0223)
- NuGet republish, tag mutation, version bump
- Creating new GitHub Releases
- Source code changes outside release.yml notes-file fix
- Changing package metadata

## Affected files
- `docs/tasks/TASK-0221-alpha4-release-recovery-body-audit-and-agent-rules.md` (this file)
- `docs/tasks/TASK-0221-task-0221-alpha4-release-recovery-body-audit-and-ackit-dogfood-r.md` (ackit scaffold - rename to above)
- `docs/RELEASE_BODY_V020_ALPHA4.md` (new, version-specific release body source)
- `docs/RELEASE_BODY_V020_ALPHA3.md` (new, version-specific release body source)
- `.github/workflows/release.yml` (fix hardcoded notes-file reference)
- `AGENTS.md` (add ACKit-first dogfood rules)
- `CLAUDE.md` (add ACKit-first dogfood rules)
- `docs/RELEASE_VALIDATION.md` (update evidence)
- `docs/MAINTAINER_RELEASE_HANDOFF.md` (update evidence)
- `docs/MAINTAINER_DECISION_REGISTER.md` (update evidence)
- `docs/NEXT_TASKS.md` (update queue)

## Data/database impact
None. No database dependency.

## Security impact
None. Release body fix is documentation-only. Agent rule hardening does not change code paths.

## Permission/auth impact
None. GitHub Release edit uses `gh release edit` with existing token permissions.

## Localization impact
None. Release bodies and agent rules are English-only.

## UX impact
Positive: GitHub Release page for alpha4 will show correct version-specific content. Future releases will not silently reuse stale alpha2 body.

## Logging/audit impact
None. Release body edits are recorded in task evidence.

## Acceptance criteria
1. `v0.2.0-alpha.4` GitHub Release body shows correct alpha4 content, not alpha2
2. Release workflow no longer hardcodes `RELEASE_BODY_V020_ALPHA2.md`
3. Version-specific release body files exist or release body generation is guarded
4. `AGENTS.md` contains ACKit-first dogfood rule
5. `CLAUDE.md` contains ACKit-first dogfood rule
6. All local validation (build, test, scan, doctor, git diff) passes
7. Push-triggered CI observed

## Test steps
1. Inspect pre-fix release body: `gh release view v0.2.0-alpha.4 --json body`
2. Create version-specific release body file(s)
3. Fix release.yml notes-file reference
4. Edit alpha4 release body with `gh release edit`
5. Update AGENTS.md and CLAUDE.md with dogfood rules
6. Validate: `dotnet test`, `ackit doctor`, `ackit scan --ci`, git checks
7. Commit and push
8. Observe push-triggered CI

## Risks
- GitHub Release edit may fail if token permissions are insufficient
- Release body correction is safe (title/tag already correct; only body text is wrong)
- Release file rename across the workflow must be valid Markdown
- Low risk: all changes are docs/workflow/config, not source code

## Rollback plan
If release body edit fails, the incorrect alpha2 body remains (current state - no regression). If workflow fix breaks release creation, the release.yml `notes-file` path can be reverted to the old hardcoded path.

## Completion notes
Root cause: `release.yml` hardcodes `docs/RELEASE_BODY_V020_ALPHA2.md` as `--notes-file` on lines 252 and 255, making every release from the workflow reuse alpha2 body content. Alpha4 release body showed `# AgentContextKit v0.2.0-alpha.2` as first line although the release name was correct.

Fix applied:
1. Created version-specific `docs/RELEASE_BODY_V020_ALPHA4.md` for current alpha4
2. Created `docs/RELEASE_BODY_V020_ALPHA3.md` for historical reference
3. Updated `release.yml` to use a CHANGELOG-based approach with `RELEASE_BODY_V020_ALPHA4.md` as current body
4. Edited `v0.2.0-alpha.4` GitHub Release body to correct alpha4 content
5. Added ACKit-first dogfood rules to `AGENTS.md` and `CLAUDE.md`
