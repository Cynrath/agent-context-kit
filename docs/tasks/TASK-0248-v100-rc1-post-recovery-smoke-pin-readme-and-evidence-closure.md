# TASK-0248: V100 RC1 post-recovery smoke pin README and evidence closure

## Purpose

Only after TASK-0247 fully satisfies every exact recovery criterion, pin published-package smoke coverage to immutable `AgentContextKit 1.0.0-rc.1`, finish the English/Turkish/NuGet README and current documentation synchronization, close V100-09 only from verified exact provenance, push the evidence commits, and wait for final standard CI through one blocking process.

## Verified starting state

- At planning time, published-package smoke remains pinned to complete predecessor `0.2.0-alpha.4`.
- RC1 NuGet exists in partial immutable state; current-complete-release text must not change until TASK-0247 succeeds.
- TASK-0242 and TASK-0244 failure records are immutable historical evidence.
- README sources require polished language parity; the NuGet source must remain pure Markdown because nuget.org does not support the GitHub README HTML/CSS presentation.

## Dependencies

- Full TASK-0247 success: exact tag, prepared prerelease, exact assets, both verified attestations, and Windows/Ubuntu/macOS installed-tool smoke.
- Verified absence of any NuGet republish/change and a clean synchronized repository before edits/push.
- V100-09 done criteria satisfied by exact, public, verifiable evidence.

## Scope

- Gate every success-only edit on full TASK-0247 evidence.
- Change `.github/workflows/cross-platform-smoke.yml` from `0.2.0-alpha.4` to `1.0.0-rc.1` only after complete success.
- Finish `README.md`, `README.tr.md`, and `README.nuget.md` with RC1 install/status/release/provenance guidance and alpha4 predecessor/rollback context.
- Keep GitHub README presentation rich where useful; keep `README.nuget.md` pure Markdown, renderer-safe, and free of raw HTML/CSS, relative local images, or GitHub-only layout constructs.
- Explain that source `README.nuget.md` improvements cannot retroactively change the immutable already-published RC1 package page and apply to future authorized package versions.
- Update package, release, supply-chain, hosted-validation, gap, decision, changelog, roadmap, queue, agent, and handoff documents.
- Preserve TASK-0242/TASK-0244 failures and record TASK-0246/TASK-0247/TASK-0248 as separate evidence.
- Close V100-09 only when both exact release asset attestations verify and all recovery done criteria pass.
- Run full validation, commit/push normally, and wait for final `ci`, RC1 `cross-platform-smoke`, and `cross-platform-source-smoke` runs once each.

## Implementation steps

1. Confirm the full TASK-0247 done tuple and refuse success-only edits otherwise.
2. Update the published smoke pin and current release/readme/package/provenance evidence.
3. Close V100-09 only from exact asset attestations and preserve GA NO-GO language.
4. Run focused/full local gates, ACKit, Markdown, and completeness checks; commit logically and push normally.
5. Discover final standard runs once, watch each once, and record final evidence.

## Out of scope

- Any NuGet publication, change, unlist, replace, delete, or package-page retroactive mutation.
- Any release workflow dispatch/rerun, tag/release/asset/attestation mutation, manual upload, settings change, force push, or history rewrite.
- Closing any V100 gap without its exact criteria or claiming 1.0 GA readiness.
- Changing the smoke pin if TASK-0247 is incomplete or failed.

## Affected files

- `.github/workflows/cross-platform-smoke.yml`
- `README.md`, `README.tr.md`, and `README.nuget.md`
- `AGENTS.md`, `CLAUDE.md`, `.cursor/rules/project.mdc`, `.github/copilot-instructions.md`
- `CHANGELOG.md`
- `docs/HOSTED_VALIDATION_STATUS.md`
- `docs/PUBLISHED_SUPPLY_CHAIN_STATUS.md`
- `docs/NUGET_METADATA.md`
- `docs/PACKAGING.md`
- `docs/RELEASE_VALIDATION.md`
- `docs/V100_GAP_ANALYSIS.md`
- `docs/V100_RC1_RELEASE_PLAN.md`
- `docs/MAINTAINER_DECISION_REGISTER.md`
- Active roadmap, queue, task, documentation-index, and `.codex` handoff records

## Data/database impact

None.

## Admin impact

None. No product admin or GitHub repository settings change.

## Security impact

Documentation and smoke coverage must describe only verified immutable evidence. V100-09 closure requires both exact release-asset attestations, exact tag/commit binding, exact release assets, and successful recovery verification. TASK-0242/TASK-0244 failure history remains auditable.

## Permission/auth impact

Only normal validated `master` commits/pushes are authorized. No package/release/settings permission is used.

## Localization impact

English/Turkish README content and navigation remain meaningfully equivalent. CLI localization and machine-readable output contracts do not change.

## SEO impact

GitHub and NuGet source landing-page text is improved for accurate product, install, feature, safety, and documentation discovery. No runtime SEO subsystem changes.

## UX impact

Users receive accurate RC1 install commands, supported-platform evidence, provenance links, command discovery, safety expectations, rollback guidance, and a clean NuGet-compatible page.

## Logging/audit impact

Record TASK-0247 run/job IDs, tag/release URL, exact asset hashes/digests, both attestation verification results, three-platform smoke evidence, final commits, push, and final CI run IDs. Do not conflate recovery with TASK-0242/TASK-0244.

## Acceptance criteria

- No TASK-0248 success-only edit occurs unless TASK-0247 fully succeeds.
- Published smoke installs exactly `AgentContextKit 1.0.0-rc.1` on Windows, Ubuntu, and macOS.
- English, Turkish, and NuGet README sources are complete, polished, consistent, and truthful.
- `README.nuget.md` passes pure-Markdown/package metadata rules and states the immutable package-page limitation where relevant.
- Public/current docs identify RC1 as the complete prerelease only after recovery and alpha4 as predecessor/rollback evidence.
- TASK-0242 and TASK-0244 histories remain unchanged; 0246/0247/0248 evidence is distinct.
- V100-09 closes only if both exact asset attestations and every recovery criterion verify; 1.0 GA remains explicitly unclaimed.
- ACKit, build/tests, release/security/supply-chain/V100/localization/package/Markdown/hygiene gates pass.
- No generated `.ackit/` artifact is tracked and no source/task Markdown remains uncommitted.
- Final commits are pushed normally; final three standard workflow runs are discovered once and watched once.

## Test steps

1. Verify the TASK-0247 exact success tuple.
2. Run focused smoke-pin, package metadata, README boundary, documentation consistency, provenance, V100, and localization gates.
3. `ackit doctor` and `ackit scan --ci`.
4. `dotnet restore AgentContextKit.sln`.
5. `dotnet build AgentContextKit.sln -c Release --no-restore`.
6. `dotnet test AgentContextKit.sln -c Release --no-build`.
7. Run release/security/supply-chain/V100/Markdown/hygiene scripts.
8. `powershell -ExecutionPolicy Bypass -File scripts/check-tracked-vs-untracked-md.ps1 -FailOnIssues`, `git diff --check`, and `git ls-files .ackit`.
9. Push normally after remote-advance protection.
10. Discover final standard runs once and run one `gh run watch <RUN_ID> --exit-status --interval 30` per run.

## Risks

- Premature smoke/readme status changes would represent an incomplete release; strict TASK-0247 evidence gating prevents it.
- Source README changes cannot alter the immutable RC1 package payload; documentation must not imply retroactive nuget.org rendering changes.
- Broad documentation edits can erase historical nuance; focused checks and explicit failure-history preservation are required.
- Final CI failure permits only a normal evidence-based corrective commit; it never authorizes a recovery rerun.

## Rollback plan

Before push, correct local pin/docs normally. After push, use a normal successor commit; never rewrite history or mutate immutable RC1 artifacts. If the recovered RC1 later proves unsuitable, restore the alpha4 smoke pin only under a separately documented normal change while preserving release evidence.

## Completion notes

Status: `PLANNED / CONDITIONAL ON FULL TASK-0247 SUCCESS`.

