# TASK-0207: alpha3 public doc sync

## Purpose
Synchronize public-facing and current-state documentation after the completed `0.2.0-alpha.3` publication so readers consistently see `AgentContextKit` `0.2.0-alpha.3` as the current published GitHub/NuGet prerelease.

The task must separate stale current-state alpha.2 references from historical alpha.2 evidence and predecessor-package references.

## Scope
- Docs-only update.
- Audit `0.2.0-alpha.2`, `v0.2.0-alpha.2`, `alpha.2`, and `alpha2` references across README, GitHub-facing docs, package/status docs, examples, and handoff docs.
- Update current-facing release/package/install/smoke/status wording to `0.2.0-alpha.3`.
- Keep historical alpha.2 evidence unchanged where it describes what was true at that time.
- Keep alpha.3 release-candidate predecessor references at `0.2.0-alpha.2`.
- Keep alpha2-specific release body/scope/task evidence unchanged.
- Record final evidence, validation results, and preserved-reference rationale in this task file.
- Update `.codex/SESSION_HANDOFF.md` after the main documentation sync.

## Out of scope
- No source code changes.
- No script changes.
- No workflow YAML changes.
- No package metadata changes.
- No version bump.
- No tag changes.
- No GitHub Release changes.
- No NuGet publish or package-state mutation.
- No release workflow or release-candidate workflow dispatch.
- No owner/account/secret/security-setting mutation.
- No provenance hardening in this task.
- No rewriting of historical evidence.

## Affected files
- `docs/tasks/TASK-0207-alpha3-public-doc-sync.md`
- README and public install docs, expected: `README.md`, `README.tr.md`
- Agent/GitHub-facing instruction docs, as needed: `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, `.cursor/rules/project.mdc`
- Current-state handoff docs, as needed: `.codex/HANDOFF.md`, `.codex/SESSION_HANDOFF.md`, `.codex/CONTEXT_PACK.md`, `.codex/NEXT_STEPS.md`
- Package/status/release docs under `docs/`, as identified by the alpha2 audit
- Documentation-only examples under `docs/examples/`, only if they describe current public package use

No `src/**`, `tests/**`, `scripts/**`, `.github/workflows/**`, package metadata, tag, release, or NuGet state is in scope.

## Data/database impact
None. The repository has no database or migrations in this task scope.

## Admin impact
None. No admin UI, repository settings, package owner, release environment, or GitHub security setting changes.

## Security impact
Positive documentation-governance impact: stale public install/status guidance is corrected without changing release artifacts or security controls.

Immutable release warnings remain in force:
- do not reuse versions;
- do not move tags;
- do not replace release assets;
- do not manually mutate package/release state.

## Permission/auth impact
None. No privileged operation, workflow dispatch, token, secret, owner, package, tag, or GitHub Release mutation is performed.

## Localization impact
README and README.tr current release/install wording stay aligned. No runtime localization resources change.

## SEO/i18n impact
Public docs should no longer present alpha.3 as pending, unpublished, NO-GO, or local-only. Turkish public README current-state wording should match the English public release state.

## UX impact
Improves public user experience by showing the correct published install command and current package state.

## Logging/audit impact
Adds a task evidence trail for:
- files changed;
- alpha2 reference audit summary;
- updated current-facing docs;
- intentionally preserved alpha2 references and reason;
- validation results;
- confirmation that no source/script/workflow/package/release mutation occurred.

## Acceptance criteria
- `README.md` and `README.tr.md` show `0.2.0-alpha.3` as the current published package.
- Public install commands use:

```powershell
dotnet tool install --global AgentContextKit --version 0.2.0-alpha.3
```

- Current docs no longer say alpha3 is pending, unpublished, NO-GO, or local-only.
- Current status docs say:
  - `0.2.0-alpha.3` is published;
  - NuGet package verified;
  - global tool install smoke passed;
  - tag `v0.2.0-alpha.3` exists;
  - GitHub prerelease `v0.2.0-alpha.3` exists;
  - remaining follow-up is `release.yml` provenance probe hardening before the next release.
- Remaining alpha2 references are explicitly one of:
  - historical alpha2 evidence;
  - alpha3 predecessor package/version;
  - alpha2-specific docs;
  - test/fixture/script expected previous-version behavior.
- No source, script, workflow, package metadata, tag, GitHub Release, NuGet, or workflow dispatch mutation.
- Task plan, implementation docs sync, and final evidence are committed as separate logical commits.

## Test steps
- Required initial checks:

```powershell
ackit --help
ackit --version
git fetch origin
git status --porcelain=v1 --untracked-files=all 2>$null
git status --short
git rev-parse --short HEAD
git rev-parse HEAD
git rev-parse --short origin/master
git rev-parse origin/master
git log --oneline -n 30
```

- Full alpha2 reference audit:

```powershell
rg -n "0\.2\.0-alpha\.2|v0\.2\.0-alpha\.2|alpha\.2|alpha2" `
  README.md README.tr.md CHANGELOG.md AGENTS.md CLAUDE.md `
  .github/copilot-instructions.md .cursor/rules/project.mdc `
  .codex docs `
  -g "*.md" -g "*.yml" -g "*.yaml" -g "*.ps1"
```

- Validation:

```powershell
ackit --version
ackit doctor
ackit scan --ci
git diff --check
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-tracked-vs-untracked-md.ps1
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-cli-contract.ps1
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-localization-parity.ps1
dotnet test AgentContextKit.sln -c Release --no-build
```

- Stale current-facing audit:

```powershell
rg -n "Current release: `v0\.2\.0-alpha\.2|Current release \| `v0\.2\.0-alpha\.2|published NuGet package remains `0\.2\.0-alpha\.2|dotnet tool install --global AgentContextKit --version 0\.2\.0-alpha\.2|0\.2\.0-alpha\.3` remains unpublished|0\.2\.0-alpha\.3` remains NO-GO|publication pending|publish pending|alpha3 unpublished|alpha3 pending" `
  README.md README.tr.md AGENTS.md CLAUDE.md CHANGELOG.md `
  .github/copilot-instructions.md .cursor/rules/project.mdc `
  .codex docs `
  -g "*.md" -g "*.yml" -g "*.yaml"
```

## Risks
- Blind replacement could corrupt historical alpha2 evidence.
- Updating predecessor-package references could break the alpha3 RC evidence story.
- Changing scripts or workflows would exceed docs-only scope.
- Leaving a public install command pinned to alpha2 would keep the maintainer issue unresolved.

## Rollback plan
Before push, use normal commits to correct documentation mistakes. After push, revert the docs-only commits with normal `git revert <sha>` if needed. Do not move tags, replace assets, republish NuGet packages, or mutate GitHub Release state.

## Completion notes
