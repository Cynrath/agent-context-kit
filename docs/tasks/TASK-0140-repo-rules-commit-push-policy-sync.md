# TASK-0140 Repo Rules Commit And Push Policy Sync

## Purpose
Bring `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, `.cursor/rules/project.mdc`, and any related workflow/standard docs into agreement with the current user authorization for normal `master` pushes during the active control task, while keeping the hard prohibitions on force push, history rewrite, tag movement, release/NuGet publish, secret exposure, and user-file deletion intact.

## Current State
- `AGENTS.md:29` says: "Never push, publish, force-push, or create remotes from an agent session."
- This rule now contradicts the current user's explicit session authorization: "Mantıksal Git commitleri oluşturma, master dalına normal push, GitHub Actions sonuçlarını takip etme, Başarısız kontrolleri inceleyip düzeltme."
- The hard prohibitions (force push, history rewrite, tag movement, release/NuGet publish, secret exposure) remain valid and must be preserved.
- `CLAUDE.md` inherits from `AGENTS.md`. Updating one without the other would re-introduce the contradiction.
- `.github/copilot-instructions.md` and `.cursor/rules/project.mdc` do not currently push prohibitions but should be aligned with the new policy so all agent surfaces agree.

## Scope
- Update the commit/push policy in:
  - `AGENTS.md` (primary)
  - `CLAUDE.md` (delegation reference)
  - `.github/copilot-instructions.md`
  - `.cursor/rules/project.mdc`
  - `docs/AI_WORKFLOW.md` (if it exists)
  - `docs/DEVELOPMENT_STANDARD.md` (if it exists)
- Keep all hard prohibitions.
- Do not add any new workflow, release, or publish trigger.

## Out Of Scope
- New CLI command, JSON schema, SARIF profile, or scanner rule.
- Changes to the release workflow, hosted RC workflow, or any release/NuGet automation.
- Changes to the published `0.2.0-alpha.2` package.

## Affected Files
- `AGENTS.md`
- `CLAUDE.md`
- `.github/copilot-instructions.md`
- `.cursor/rules/project.mdc`
- `docs/AI_WORKFLOW.md` (if present)
- `docs/DEVELOPMENT_STANDARD.md` (if present)

## Implementation
1. In `AGENTS.md`, replace the single absolute "Never push, publish, force-push, or create remotes from an agent session." line with two distinct bullets:
   - Hard prohibitions (unchanged): never force-push, never rewrite history, never move an existing tag, never create a remote, never publish a package, never create a release, never delete user changes, never expose secrets, never fabricate owner/identity/recovery evidence.
   - New authorization clause: agents may create logical commits and perform normal `master` pushes only when the active project control task explicitly authorizes agent write access and only after local validation passes.
2. Update `CLAUDE.md` so the project context reflects the new clause and explicitly defers to `AGENTS.md` for the complete rule set.
3. Update `.github/copilot-instructions.md` and `.cursor/rules/project.mdc` with the new "Hard prohibitions" + "Normal commit/push allowed only when explicitly authorized" wording.
4. If `docs/AI_WORKFLOW.md` or `docs/DEVELOPMENT_STANDARD.md` exist, mirror the same wording so the agent instruction surface stays consistent.

## Security/Privacy Boundary
- No credential, private report content, raw finding, certificate, or recovery secret may be printed or committed.

## Backward Compatibility
- The hard prohibitions remain identical to the previous rule set.
- The new clause only relaxes the prior absolute "never push" rule, replacing it with a permission-gated rule that matches the current session authorization.

## Acceptance Criteria
- `AGENTS.md` contains both the hard prohibitions and the new authorization clause.
- `CLAUDE.md` no longer relies on a stale absolute rule.
- `.github/copilot-instructions.md` and `.cursor/rules/project.mdc` carry the same wording.
- `git diff --check` is clean.
- The local Markdown link gate still passes.
- `dotnet test` is still 197/197 green.

## Tests
- No new tests; this task is documentation-only.

## Validation
- `git diff --check` exit 0.
- `powershell -ExecutionPolicy Bypass -File scripts/check-local-markdown-links.ps1 -FailOnIssues` exit 0.
- `ackit scan --ci` and `ackit doctor` remain clean.

## Rollback
- Revert the single commit.

## Completion Evidence
Pending. Will be filled after the commit and hosted checks.

## Commit
- `docs: sync agent commit and push policy`

## Push
- Normal `master` push after validation.

## Hosted Checks
- Standard 3/3 expected.
