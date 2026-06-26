# TASK-0223: Published-package smoke pin update to alpha4

## Purpose
Update the published-package smoke workflow pin from `0.2.0-alpha.3` to `0.2.0-alpha.4`.

## Scope
- Update `.github/workflows/cross-platform-smoke.yml` to install `AgentContextKit` `0.2.0-alpha.4`
- Keep historical alpha3 references intact
- Do NOT change source-package smoke workflow (already uses alpha4 from source)

## Out of scope
- Source code changes
- NuGet republish or version bump
- README/docs changes (TASK-0222)

## Affected files
- `.github/workflows/cross-platform-smoke.yml`

## Acceptance criteria
1. `cross-platform-smoke.yml` installs `AgentContextKit --version 0.2.0-alpha.4`
2. All validation passes (test, scan, doctor, git checks)

## Test steps
1. Update cross-platform-smoke.yml alpha3 pin to alpha4
2. Run validation
3. Commit and push
4. Observe CI

## Risks
- Low. Simple one-line version pin change in CI workflow file.

## Completion notes
Published-package smoke workflow pin updated to `0.2.0-alpha.4`.
