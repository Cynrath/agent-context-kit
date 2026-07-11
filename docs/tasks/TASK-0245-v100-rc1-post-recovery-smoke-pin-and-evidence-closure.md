# TASK-0245: V100 RC1 post recovery smoke pin and evidence closure

## Purpose

After and only after TASK-0244 fully succeeds, move published-package smoke coverage to immutable `AgentContextKit 1.0.0-rc.1`, synchronize current-release and provenance documentation while preserving TASK-0242 history, push the final documentation/workflow commits, and verify final push-triggered CI in one blocking command sequence.

## Verified starting state

- At planning time, `v0.2.0-alpha.4` remains the latest complete release and the published smoke workflow remains pinned to it.
- NuGet RC1 exists, but tag/release/provenance are absent until TASK-0244 succeeds.
- TASK-0242 history and exact hashes are already recorded and must be preserved.

## Dependencies

- Complete success of every TASK-0244 recovery and three-platform verification job.
- Verified exact tag, prerelease body, release assets/digests, and both attestations.
- Clean synchronized repository before post-recovery edits and before push.

## Scope

- Gate all work on successful TASK-0244 tag/release/assets/two-attestation/three-OS evidence.
- Update `.github/workflows/cross-platform-smoke.yml` from `0.2.0-alpha.4` to `1.0.0-rc.1`.
- Update public README install/status text, package/release/supply-chain/validation docs, agent instruction surfaces, roadmap/queue, and handoff records.
- Keep `0.2.0-alpha.4` as the predecessor/rollback release and retain historical alpha references.
- Preserve TASK-0242 partial-failure history and record recovery only through TASK-0244/0245.
- Run focused/full local validation, commit logical changes, verify completeness, push normally, and wait for final `ci`, `cross-platform-smoke`, and `cross-platform-source-smoke` with one blocking command block.

## Implementation steps

1. Confirm TASK-0244 complete evidence and update the smoke pin.
2. Synchronize public/current release, package, provenance, decision, queue, and handoff documents while preserving historical evidence.
3. Run focused and full validation, complete TASK-0245, and create logical commits.
4. Protect against remote advance, push normally, and run the single blocking final-CI block.
5. Verify local/origin equality and clean working tree.

## Out of scope

- Any NuGet publication, package change/unlist/replace, release workflow dispatch/rerun, tag/release mutation, manual upload, new version, GA claim, settings mutation, force push, or history rewrite.
- Smoke-pin mutation when TASK-0244 is incomplete or failed.

## Affected files

- `.github/workflows/cross-platform-smoke.yml`
- `README.md`, `README.tr.md`, and `README.nuget.md` where current published install/status text applies
- `AGENTS.md`, `CLAUDE.md`, `.cursor/rules/project.mdc`, `.github/copilot-instructions.md`
- `CHANGELOG.md`
- `docs/HOSTED_VALIDATION_STATUS.md`
- `docs/PUBLISHED_SUPPLY_CHAIN_STATUS.md`
- `docs/NUGET_METADATA.md`
- `docs/PACKAGING.md`
- `docs/RELEASE_VALIDATION.md`
- `docs/V100_GAP_ANALYSIS.md`
- `docs/V100_RC1_RELEASE_PLAN.md`
- Active roadmap, queue, decision, and `.codex` handoff documents
- `docs/tasks/TASK-0245-v100-rc1-post-recovery-smoke-pin-and-evidence-closure.md`

## Data/database impact

None.

## Admin impact

None. No application admin surface or repository setting changes.

## Security impact

Documentation and smoke coverage must describe only verified evidence. Provenance closes only if both exact release assets verify. Historical failure evidence, exact digests, and predecessor rollback guidance remain available.

## Permission/auth impact

Normal validated `master` pushes are authorized. No release/package/settings write is part of this task.

## Localization impact

English/Turkish README parity must be preserved. CLI localized output and machine-readable contracts do not change.

## SEO impact

Public README/package status text changes to identify RC1 as the complete prerelease after verified recovery. No site tooling or metadata schema changes.

## UX impact

Install commands and published-package smoke coverage point to the recovered RC1 package after complete release verification. Users retain explicit predecessor rollback guidance.

## Logging/audit impact

Record TASK-0244 run/job IDs, release/tag/asset/attestation evidence, three-platform results, final commits, push count, and final CI run IDs. Do not erase TASK-0242 evidence.

## Acceptance criteria

- TASK-0244 is fully successful before the smoke pin changes.
- Published smoke installs exactly `AgentContextKit 1.0.0-rc.1` on Windows, Ubuntu, and macOS.
- Public/current docs identify `v1.0.0-rc.1` as the complete prerelease and `v0.2.0-alpha.4` as predecessor/rollback evidence.
- TASK-0242 remains a factual partial-publication history; TASK-0244 is the distinct recovery record.
- Exact source artifact, NuGet, release-asset, tag, release, and attestation evidence is synchronized without overstating GA readiness.
- ACKit doctor/scan, build, 431+ tests, release/static/security/V100/localization/Markdown/hygiene gates pass.
- Markdown completeness guard passes and no generated `.ackit/` artifact is tracked.
- All local commits are pushed normally after remote-advance protection; no force push occurs.
- Final push-triggered `ci`, RC1 `cross-platform-smoke`, and `cross-platform-source-smoke` all succeed and are waited through one blocking command block.

## Test steps

1. Focused smoke-pin and documentation consistency checks.
2. `ackit doctor` and `ackit scan --ci`.
3. `dotnet restore AgentContextKit.sln`.
4. `dotnet build AgentContextKit.sln -c Release --no-restore`.
5. `dotnet test AgentContextKit.sln -c Release --no-build`.
6. Release workflow, package metadata, security/supply-chain, V100, CLI, JSON, localization, Markdown, and hygiene gates.
7. `powershell -ExecutionPolicy Bypass -File scripts/check-tracked-vs-untracked-md.ps1 -FailOnIssues`.
8. `git diff --check` and `git ls-files .ackit`.
9. Normal final push after remote-advance protection.
10. The repository-defined single blocking final-CI PowerShell block.

## Risks

- Updating the smoke pin before complete recovery would make CI represent an incomplete release; the task is conditional on all TASK-0244 evidence.
- Current-release text can accidentally erase alpha4 rollback context or TASK-0242 history; focused grep/gates and review must preserve both.
- A final CI failure requires one evidence-based corrective commit and one new final push/CI block, never a recovery workflow rerun.

## Rollback plan

Before push, revert local pin/docs edits normally. After push, correct documentation or smoke configuration with a normal successor commit; do not alter the RC1 package/tag/release/assets/attestations. If RC1 later proves unusable, restore the alpha4 smoke pin through a separately documented normal commit and follow immutable package recovery policy.

## Completion notes

Status: `NOT_EXECUTED / BLOCKED_BY_TASK-0244_FAILURE / SMOKE_PIN_UNCHANGED`.

TASK-0244 run `29151228607` failed before any recovery mutation and its single dispatch budget is consumed. Therefore `.github/workflows/cross-platform-smoke.yml` remains pinned to immutable complete release `0.2.0-alpha.4`; no RC1 current-complete-release claim, README install change, tag/release/provenance change, or post-recovery three-platform smoke was made. TASK-0245 records only this conditional hard stop; the final user report records the push-triggered failure-documentation CI evidence. It does not attempt recovery or fix the hosted failure.
