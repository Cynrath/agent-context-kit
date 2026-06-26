# TASK-0222: Post-publish public README/docs sync to alpha4

## Purpose
Update public-facing docs (README.md, README.tr.md, and state docs) after confirmed alpha4 publish, release body recovery, and agent rules hardening.

## Scope
- Update README.md install commands and version references from `0.2.0-alpha.3` to `0.2.0-alpha.4`
- Update README.tr.md install commands and version references to `0.2.0-alpha.4`
- Update RELEASE_VALIDATION.md, MAINTAINER_RELEASE_HANDOFF.md, NEXT_TASKS.md, ISSUE_BACKLOG.md
- Update .codex/ state docs
- Do NOT rewrite README.nuget.md unless a real issue is found
- Do NOT change package metadata
- Do NOT publish, tag, or mutate GitHub Releases

## Out of scope
- Release body edits (TASK-0221)
- Published-package smoke pin (TASK-0223)
- NuGet republish or version bump
- Any source code change

## Affected files
- `README.md`
- `README.tr.md`
- `docs/RELEASE_VALIDATION.md`
- `docs/MAINTAINER_RELEASE_HANDOFF.md`
- `docs/NEXT_TASKS.md`
- `docs/ISSUE_BACKLOG.md`
- `docs/NUGET_METADATA.md`
- `.codex/SESSION_HANDOFF.md`
- `.codex/CONTEXT_PACK.md`
- `.codex/NEXT_STEPS.md`

## Acceptance criteria
1. README.md install commands reference `0.2.0-alpha.4`
2. README.tr.md install commands reference `0.2.0-alpha.4`
3. All stale `alpha3` current-version references are updated to `alpha4`
4. Historical `alpha3` predecessor references remain intact
5. All validation passes (build, test, scan, doctor, git checks)

## Test steps
1. Read all affected files and identify UPDATE_TO_ALPHA4 vs KEEP_ALPHA3 items
2. Update all UPDATE_TO_ALPHA4 references
3. Run validation
4. Commit and push
5. Observe CI

## Risks
- Low. Docs-only changes, no source code or package mutation.
- Risk of missing a stale reference; mitigated by grep audit.

## Rollback plan
If a stale reference is missed, it can be fixed in a follow-up task without any impact to published packages, tags, or releases.

## Completion notes
All public docs successfully updated to reference `0.2.0-alpha.4` as the current published release while preserving historical `0.2.0-alpha.3` predecessor evidence.
