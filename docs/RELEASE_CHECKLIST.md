# Release Checklist

## Local Validation
- `dotnet restore` passes.
- `dotnet build -c Release` passes.
- `dotnet test -c Release` passes.
- `ackit doctor` has no unaccepted high/critical findings.
- `ackit redact-check --profile public-release` reviewed.
- README and README.tr are current.
- Configuration and JSON output docs are current.
- SECURITY, CONTRIBUTING, CODE_OF_CONDUCT, CHANGELOG are current.
- LICENSE is present.
- NuGet package metadata is reviewed.
- `scripts/check-package-metadata.ps1 -FailOnIssues` exits `0`.
- Local `dotnet pack` succeeds.
- Temporary `dotnet tool install --tool-path` verification succeeds.
- `scripts/verify-release.ps1` succeeds locally.
- `scripts/audit-public-release.ps1 -FailOnIssues` exits `0`.
- `scripts/check-release-blockers.ps1 -FailOnBlockers` exits `0`.
- `docs/PACKAGING.md` and `docs/RELEASE_VALIDATION.md` are current.
- `docs/RELEASE_BLOCKERS.md` has no unresolved public-release blockers.
- `docs/MAINTAINER_RELEASE_HANDOFF.md` has been reviewed.
- `RepositoryUrl` and `PackageProjectUrl` point to `https://github.com/Cynrath/agent-context-kit`.
- Local current release tag exists and points at the reviewed release commit.
- No secrets, dumps, uploads, backups, `bin/`, `obj/`, or generated junk are committed.

## Completed Public Release State
- Public repository exists: `https://github.com/Cynrath/agent-context-kit`.
- `master` is pushed.
- `v0.2.0-alpha.2` is pushed.
- GitHub Actions latest `master` run is green.
- Repository description is set.
- Repository topics are set.
- GitHub Release page for `v0.2.0-alpha.2` is created as a pre-release.
- NuGet package `AgentContextKit` version `0.2.0-alpha.2` is published.
- NuGet global tool install is verified for `0.2.0-alpha.2`.
- NuGet global tool smoke test is verified in a clean demo app.
- Cross-platform CI smoke workflow succeeded on Windows, Ubuntu, and macOS.
- Codex for OSS form submission is completed per maintainer-provided status.

## Alpha.2 Historical Published State
- Scanner fixture/domain-like noise reduction is implemented locally.
- GitHub Actions Node 24 readiness is implemented locally.
- Turkish human CLI output polish is implemented locally.
- Source/package metadata and CLI runtime version are `0.1.0-alpha.2`.
- Local alpha.2 pack and temporary tool-path smoke passed before publication.
- `v0.1.0-alpha.2` tag, GitHub Release, NuGet publish, and install verification are complete.
- Hosted `ci`, published-package smoke, and source smoke validation remain maintainer checks after future pushes.

## v0.2.0-alpha.2 Published State
- Source/package metadata and CLI runtime version are `0.2.0-alpha.2`.
- `ackit sarif`, SARIF 2.1.0 output, scanner rule catalog, configurable allowlist fields, additive JSON `ruleId`, expanded scanner patterns, sample gallery, demo scenarios, Web UI preview docs, and visual asset guidance are published release content.
- Published install commands are pinned to `0.2.0-alpha.2`.
- `v0.2.0-alpha.2` tag push, GitHub pre-release, NuGet publish, global install verification, and `ackit sarif` help verification are complete.

## Historical v0.2.0-alpha.2 Release-Candidate Gate
- Scope is defined in `docs/V020_ALPHA2_SCOPE.md`.
- Release is limited to scanner precision, fixture hardening, sanitized suppression audit, contract validation, and repository documentation polish.
- CLI commands, exit codes, JSON schema `2`, config schema `1`, SARIF visible-findings-only behavior, package ID, and tool command remain compatible.
- Source/package/CLI version and source-package smoke were moved to `0.2.0-alpha.2` under TASK-0123.
- Published-package smoke and public README install commands were updated to `0.2.0-alpha.2` only after NuGet publication.
- Publication used exact-commit 8/8 hosted checks and the manual OIDC release workflow.
- Code Scanning, Pages, screenshot assets, remote LLM integration, and breaking schema changes are out of scope.

## Remaining Manual Actions
- Review all generated files before future publishing.
- For the next release, approve push, hosted CI/source smoke validation, tag, GitHub Release, NuGet publish, and NuGet install verification in a dedicated release task.
- For planned `0.2.0-alpha.3`, TASK-0202 closes independent backup security notification ownership and backup package recovery coverage for release preparation.
- For planned `0.2.0-alpha.3`, TASK-0203 completed local package validation and install smoke for implementation commit `33e1897`; at TASK-0203 close, hosted RC evidence and exact-candidate GO remained pending.
- For planned `0.2.0-alpha.3`, TASK-0204 identifies dispatch-time current `origin/master` as the hosted RC candidate, candidate version `0.2.0-alpha.3`, and predecessor `0.2.0-alpha.2`; obtain hosted RC evidence and record the exact-version/exact-commit GO packet before any publication action.
- For planned `0.2.0-alpha.3`, TASK-0205 records hosted RC run `27868539971` as passed for exact commit `beaa14deed3dbc55ac98d216679f9a9799261801`, candidate `0.2.0-alpha.3`, predecessor `0.2.0-alpha.2`, and source package `0.2.0-alpha.3.ci.27868539971`; exact-candidate GO is for a later publish task only.
- Final publish remains pending and must be authorized by a separate task.

## Release Candidate Evidence Gate
- `scripts/check-release-candidate-evidence.ps1 -FailOnIssues` passes.
- Published-config and baseline-schema compatibility fixtures pass.
- The synthetic scan benchmark passes its documented tripwire.
- Vulnerability and deprecation reviews are dated and reviewed.
- Private GitHub vulnerability reporting is enabled and independently verified.
- [x] Authenticated GitHub API status returned `enabled: true` on 2026-06-14 and the public report entry is visible.
- [x] Assign and verify an independent backup security notification owner; primary owner is `Cynrath`, backup owner is `ShadowFlameC` per TASK-0202 maintainer evidence.
- Hosted Windows, Ubuntu, and macOS upgrade/source-package smoke evidence is green.
- [x] Standard `ci`, published-package smoke, and source-package smoke are green for commit `37d5220`; see `docs/HOSTED_VALIDATION_STATUS.md`.
- [x] The dedicated manual `release-candidate-evidence` workflow is green on Windows, Ubuntu, and macOS for reviewed commit `4c4fa64`; rerun for a future exact candidate.
- [x] Published predecessor `0.2.0-alpha.1` package signature, package entries, release assets, and accessible attestations were audited read-only on 2026-06-13.
- [x] Repeated the read-only supply-chain audit for published `0.2.0-alpha.2` without changing package or release state.
- [x] Recorded a bounded accepted-risk disposition for NuGet owner `Cyranth` versus project persona/package author `Cynrath`.
- [x] Recorded author-signing and SBOM deferrals plus future provenance implementation.
- [x] Verify package owner continuity and backup recovery ownership before release preparation; `ShadowFlameC` is recorded as NuGet package owner / backup package recovery owner per TASK-0202. No destructive NuGet action was performed.
- [x] Complete TASK-0203 local `0.2.0-alpha.3` package validation and install smoke for implementation commit `33e1897`.
- [x] Rerun hosted RC evidence for the dispatch-time current `origin/master` commit with candidate `0.2.0-alpha.3` and predecessor `0.2.0-alpha.2`; run `27868539971` passed on Windows, Ubuntu, and macOS for `beaa14deed3dbc55ac98d216679f9a9799261801`.
- `scripts/check-release-candidate-workflow.ps1 -FailOnIssues` passes and the manual `release-candidate-evidence` workflow is green on all three OS runners.
- [x] The `xunit` Legacy warning is resolved through the TASK-0091 xUnit v3 migration; 169/169 tests and clean dependency reviews are recorded.
- [x] The conditional local contract freeze and NO-GO decision package are recorded in `docs/RELEASE_CANDIDATE_CONTRACT_FREEZE.md` and `docs/MAINTAINER_RC_DECISION.md`.
- [x] Machine-readable JSON schema `2`, baseline schema `1`, SARIF profile assets, sanitized golden fixtures, and `scripts/check-json-contract-assets.ps1 -FailOnIssues` are present and passing.
- [x] English/Turkish human output, known argument-error parity, exit-code parity, and language-independent JSON semantics are covered by `scripts/check-localization-parity.ps1 -FailOnIssues`.
- [x] Security/supply-chain evidence structure and maintainer handoff are present and pass `scripts/check-security-supply-chain-evidence.ps1 -FailOnIssues`; remote items remain explicitly pending.
- [x] Current-source consolidated local evidence passes `scripts/check-rc-local-readiness.ps1 -RunDependencyReview -FailOnIssues`; the result remains `LOCAL READY / REMOTE NO-GO`.
- [ ] Before publication, resolve whether the release workflow should publish the hosted RC evidence commit `beaa14deed3dbc55ac98d216679f9a9799261801` or a later docs-only HEAD; if using a later docs-only HEAD, prove package/source metadata is unchanged or record new hosted RC evidence for that final HEAD.
- Signing, SBOM, provenance, and package recovery decisions are recorded.
