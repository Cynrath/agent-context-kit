# Maintainer Decision Register

This register records future maintainer decisions and release-scoped approval boundaries. It contains no credentials or private recovery material.

| Decision ID | Related blocker | Status | Decision | Rationale | Owner role | Evidence | Effective scope | Review/expiry | Remote action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| MD-001 | RB-001 hosted evidence | Verified for reviewed alpha.2 state | Rerun for a different candidate | Run `27478635057` passed exact three-OS evidence | Release maintainer | Exact commit/run/results in hosted status | Commit `4c4fa64` only | Next candidate | Dispatch completed |
| MD-002 | RB-002 private reporting | Complete | Enabled | Secure repository disclosure path is required | Cynrath | GET `enabled: true` and public entry verification on 2026-06-14 | Repository | Before next RC | Setting enabled |
| MD-003 | RB-003 notifications | Complete | Primary assigned; `ShadowFlameC` assigned as independent backup security notification owner / backup maintainer contact | Private reports need continuity beyond one account | `Cynrath` primary; `ShadowFlameC` backup | Maintainer-provided evidence dated 2026-06-20; `ShadowFlameC` repository `write` collaborator; `docs/SECURITY_NOTIFICATION_OWNERSHIP.md`; TASK-0202 | Repository / planned `0.2.0-alpha.3` release-preparation entry | Recheck before each RC or owner/security-notification change | No test advisory created; no security setting changed; `ShadowFlameC` is not mandatory release approver |
| MD-004 | RB-004 owner identity | Accepted risk | Keep `Cyranth` NuGet owner and `Cynrath` public metadata for current scope | OIDC publish works; unverified ownership mutation risks access disruption | Cynrath package maintainer | `docs/NUGET_OWNER_IDENTITY.md`, alpha.2 OIDC publish | Through next pre-release decision | 2026-09-30 | No owner change |
| MD-005 | RB-005 author signing | Accepted risk | Defer | No trusted certificate/custody/timestamp/recovery lifecycle is verified | Cynrath | `docs/SUPPLY_CHAIN_DECISIONS.md` | Next pre-release planning | 2026-09-30 | No signing |
| MD-006 | RB-006 SBOM | Accepted risk | Defer | Deterministic .NET 10 output, privacy, and publication lifecycle are not validated | Cynrath | `docs/SUPPLY_CHAIN_DECISIONS.md` | Next pre-release planning | 2026-09-30 | No SBOM publication |
| MD-007 | RB-007 provenance | Completed locally | Hardened publish provenance probe before next release | GitHub first-party attestation remains desired, and TASK-0208 fixed the no-attestation idempotency bug before `actions/attest@v4` can run in a future publish path | Cynrath | TASK-0206 release workflow runs `27870603776` and `27870710093`; TASK-0208 implementation `35894b6` | Future release after `0.2.0-alpha.3` | Reverify during next authorized publish | No manual attestation or package mutation |
| MD-008 | RB-008 recovery | Complete | Procedure accepted; `ShadowFlameC` assigned as NuGet backup package recovery owner | Immutable successor recovery requires package owner continuity and backup recovery coverage | `Cynrath` decision owner; `Cyranth` primary NuGet/package owner; `ShadowFlameC` backup owner | Maintainer-provided evidence dated 2026-06-20; `ShadowFlameC` appears in current NuGet package owner list; `docs/PACKAGE_RECOVERY.md`; TASK-0202 | Package lifecycle / planned `0.2.0-alpha.3` release-preparation entry | Recheck before each RC or owner/recovery change | No package state changed; no destructive NuGet action performed; `ShadowFlameC` is not mandatory release approver |
| MD-009 | RB-009 candidate | Published | `0.2.0-alpha.3` | Additive release/security automation was the smallest compatible prerelease scope | Cynrath release maintainer | `docs/V020_ALPHA3_PLAN.md`; TASK-0206 publish evidence | Published package/tag/release `0.2.0-alpha.3` | Immutable; successor release for corrections | Published through OIDC release workflow |
| MD-010 | RB-010 approval | Published | `0.2.0-alpha.3` is published and immutable | TASK-0202 closes ownership/recovery blockers; TASK-0203 records metadata and local package evidence; TASK-0205/TASK-0206 verify hosted RC evidence; TASK-0206 records publication and post-publish verification | `Cynrath` release maintainer | `docs/V020_ALPHA3_RELEASE_DECISION.md`; `docs/RC_HOSTED_EVIDENCE.md`; `docs/tasks/TASK-0206-alpha3-publish.md` | Publish SHA `92984c6448332aa24b7cff94647f627bf944e535`; refreshed RC evidence `eef0adc4d5d11d7fb19adecc59dba9f9a142fd7f`; package `0.2.0-alpha.3` | No version reuse or tag movement | NuGet package, tag, and GitHub prerelease created by `release.yml`; verify-existing run `27870813763` succeeded |
| MD-013 | V100-02 CLI contract | Complete | Exact candidate `1.0.0-rc.1` contract accepted | Local and hosted CLI/config/JSON/SARIF/localization gates pass; post-candidate bridge is docs-only | Cynrath | TASK-0232; TASK-0239; TASK-0240 run `29118452246`; TASK-0241 | Candidate `548b6affd0da25cb379ec1b153b1064fd5ff6f0b` | Reopen after candidate-impacting contract change | No remote action |
| MD-014 | V100-06 security response | Complete | `Cynrath` primary; `ShadowFlameC` backup; GitHub private reporting; 3/7-business-day non-SLA targets | Current primary/backup/channel/coverage/support criteria were freshly verified | Cynrath primary; ShadowFlameC backup | TASK-0202; fresh `enabled: true` and collaborator `write` checks on 2026-07-10; decision packet | Current repository state | Recheck after owner/channel/support-policy change | No setting/advisory/contact mutation |
| MD-015 | V100-08 support lifecycle | Complete | .NET 10 and Windows/Ubuntu/macOS support scope accepted for exact final candidate | Exact candidate passed build/test/package/upgrade/scan on all supported operating systems | Cynrath | `docs/SUPPORT_LIFECYCLE.md`; TASK-0240 run `29118452246`; TASK-0241 | Candidate `548b6affd0da25cb379ec1b153b1064fd5ff6f0b` | Recheck after runtime/platform policy change | No remote action |
| MD-016 | V100-09 supply chain | Decision recorded / open | OIDC/immutability/alignment/inspection/digest/signature/assets/upgrade/recovery baseline; signing/SBOM accepted risks active | Recovery ownership is complete; provenance can only be proven on the next authorized publish path | Cynrath | `docs/V100_MAINTAINER_DECISION_PACKET.md`; `docs/SUPPLY_CHAIN_DECISIONS.md`; `docs/PACKAGE_RECOVERY.md` | V100 target contract | OPEN_PENDING_PUBLISH_PATH_PROVENANCE; accepted-risk review by 2026-09-30 | No publish/attestation/recovery action |
| MD-017 | V100 candidate selection | Accepted / publication unauthorized | Accept `1.0.0-rc.1` with published predecessor `0.2.0-alpha.4` | Exact local/package/standard/hosted evidence passed and the docs-only bridge preserves candidate validity | Cynrath release maintainer | TASK-0239 SHA `548b6affd0da25cb379ec1b153b1064fd5ff6f0b`; TASK-0240 run `29118452246`; TASK-0241 | Exact candidate SHA and version tuple | Separate TASK-0242 authorization | Conditional GO only; no publication/tag/release/provenance action |
| MD-018 | V100 final candidate | Conditional GO | Conditional GO for a separately authorized publish task | Open P0 gaps are 0; target P1 gaps are closed; V100-09 remains publish-path provenance boundary | Cynrath release maintainer | `docs/V100_GAP_ANALYSIS.md`; `docs/MAINTAINER_RC_DECISION.md`; TASK-0241 | Candidate `1.0.0-rc.1` / SHA `548b6affd0da25cb379ec1b153b1064fd5ff6f0b` | PUBLISH AUTHORIZATION REQUIRED | Publication authorized: No |
| MD-019 | TASK-0242 publication | Consumed / partial immutable publication / stopped | Single run `29131335084` published NuGet RC1, then timed out verifying availability before tag/release/provenance | User required stop without recovery after post-publish failure | Cynrath release maintainer | TASK-0242; run/job evidence; one-time NuGet/tag/release/attestation audit | NuGet `1.0.0-rc.1` immutable at repository commit `258918b`; tag/release/provenance absent | New authorization required for any recovery decision | No second dispatch/rerun/recovery/manual upload/tag move/force push performed |
| MD-020 | TASK-0244 exact-package recovery | Consumed / pre-mutation failure / stopped | Single run `29151228607` failed in Ubuntu safety gates because a fixture helper invoked unavailable Windows-only `powershell` | User required one recovery dispatch and hard stop without automatic correction or second dispatch | Cynrath release maintainer | TASK-0243 commit `3b97997`; pre-recovery runs `29151153458`, `29151153453`, `29151153454`; TASK-0244 run/job/log and one immutable audit | NuGet RC1/artifact unchanged; tag/release/two attestations absent; smoke pin remains alpha4 | New explicit decision required before any fix or future recovery attempt | No NuGet push, tag/release/asset/attestation mutation, rerun, second dispatch, manual upload, or force push |
| MD-021 | TASK-0246 recovery safety fix | Complete / pushed / CI pass | Resolve child PowerShell through `pwsh`, enforce pre-mutation ordering, add three-OS coverage, and improve README surfaces | Hosted failure showed the fixture itself was Windows-only; current GitHub-hosted runners support PowerShell 7 across all three OSes | Cynrath release maintainer | Commits `926fc03`, `b815c44`; standard runs `29182095416`, `29182095415`, `29182095423` | Recovery automation at `b815c44`; no release mutation | Reopen after recovery safety/script/workflow change | Normal push only; no release dispatch or package/tag/release mutation |
| MD-022 | TASK-0247 exact-package recovery | Consumed / pre-mutation failure / stopped | Single run `29182188201` passed exact artifact/package/install verification then exited after the expected absent-release probe before mutation | User authorized exactly one dispatch and required a hard stop, one log read, and one immutable audit on failure | Cynrath release maintainer | TASK-0247 run/log; artifact/package/signature/install PASS; one audit | NuGet RC1/artifact unchanged; tag/release/two attestations absent; smoke pin alpha4; V100-09 open | New explicit decision required before any workflow correction or future recovery | No NuGet push, tag/release/asset/attestation mutation, rerun, second dispatch, manual upload, or force push |
| MD-023 | TASK-0249 expected-404 correction | Complete / pushed / CI pass | Shared fail-closed helper clears only verified 404 native state and runs in three-OS source smoke | TASK-0247 diagnosed the exit leak; new authorization required local correction and green CI before recovery | Cynrath release maintainer | Commit `ca4b469`; runs `29340782994`, `29340783184`, `29340782999` | Recovery automation only; no release mutation | Reopen after helper/workflow safety change | Normal push only |
| MD-024 | TASK-0250 exact-package recovery | Consumed / tag push rejected / stopped | Single run `29341087462` passed pre-mutation gates; GitHub App token tag push was rejected for missing `workflows` permission | User authorized exactly one dispatch and required log-once/audit-once safe stop on failure | Cynrath release maintainer | Run/job/log `29341087462`/`87112724358`; one immutable audit | NuGet/artifact unchanged; tag/release/assets/two attestations absent; smoke pin alpha4; V100-09 open | New explicit decision required; repository settings/manual completion/retry prohibited in this task | No NuGet push, remote tag/release/asset/attestation mutation, rerun, second dispatch, manual upload, settings change, or force push |

## Recording A Decision
Replace `TBD` only with explicit maintainer evidence. Record the exact commit/version scope. Accepted risk must include why, compensating controls, owner role, review/expiry date, and rollback/recovery path. Do not use this register to store credentials, certificates, private report content, or recovery secrets.

## TASK-0198 Clarification

TASK-0198 did not change any maintainer decision status to `Complete` or `Accepted risk`. `MD-003` and `MD-008` remain `Partial` until the missing owner/authority evidence is recorded by a maintainer and linked to an exact release scope. Documentation-only investigation is not release approval.

## TASK-0201 Closure Preflight

TASK-0201 did not change any maintainer decision status to `Complete` or `Accepted risk`. At TASK-0201 close, the repository still lacked:

- `MD-003` / `RB-003`: a second verified human backup security owner, non-secret notification coverage path for primary and backup review, notification coverage evidence, review date, and effective release scope.
- `MD-008` / `RB-008`: maintainer-verifiable destructive NuGet unlist/deprecate/account-recovery authority, backup recovery owner, owner-linked trigger/unlist/deprecate/successor coverage, review date, and effective release scope.

Successful alpha.2 OIDC publishing and the accepted recovery procedure remain supporting evidence only; they do not prove destructive recovery authority or backup continuity.

## TASK-0202 Maintainer Evidence Intake

TASK-0202 records maintainer-provided external evidence from `Cynrath` dated 2026-06-20 for planned `0.2.0-alpha.3`.

- `MD-003` / `RB-003`: complete. `ShadowFlameC` is recorded as repository `write` collaborator, independent backup security notification owner, and backup maintainer contact. Coverage includes repository security notifications, private vulnerability reporting, future security advisory escalation, and direct maintainer escalation.
- `MD-008` / `RB-008`: complete. `ShadowFlameC` is recorded as current NuGet package owner and backup package recovery owner. Coverage includes package owner continuity, unlist/deprecate coordination, recovery escalation, and successor release coordination.
- `MD-010`: release-preparation eligible / publish deferred. Primary owner-driven release preparation remains allowed for `Cynrath` / `Cyranth`; `ShadowFlameC` is backup/recovery coverage only, not a mandatory release approver.

No version bump, package metadata change, tag, GitHub Release, NuGet publish, workflow dispatch, security advisory, branch ruleset mutation, repository secret creation, owner removal, account/recovery mutation, or destructive NuGet action occurred in TASK-0202.

## TASK-0203 Release Preparation

TASK-0203 prepared the local `0.2.0-alpha.3` candidate at implementation commit `33e1897`.

- `MD-010`: local candidate prepared / publish deferred at TASK-0203 close. Package metadata, CLI runtime version, source-package smoke version parity, release-preparation docs, package verification, and installed-tool smoke evidence are recorded.
- Hosted RC evidence was pending for the exact candidate at TASK-0203 close.
- Exact-candidate GO or NO-GO was pending at TASK-0203 close.

No tag, GitHub Release, NuGet publish, release workflow dispatch, release-candidate workflow dispatch, security advisory, branch ruleset mutation, repository secret creation, owner/account/recovery mutation, or destructive NuGet action occurred in TASK-0203.

## TASK-0205 Hosted RC Evidence GO

TASK-0205 records hosted RC evidence for maintainer-dispatched run `27868539971`.

- `MD-010`: exact-candidate GO / publish deferred. The hosted run passed for exact commit `beaa14deed3dbc55ac98d216679f9a9799261801`, candidate version `0.2.0-alpha.3`, predecessor version `0.2.0-alpha.2`, and source candidate package `0.2.0-alpha.3.ci.27868539971`.
- Windows job `82476527430`, Ubuntu job `82476527450`, and macOS job `82476527416` all succeeded.
- The only annotations are non-blocking xUnit analyzer warnings (`xUnit1051` and `xUnit2013`).
- The later publish task must resolve whether publication uses the RC evidence commit or a later docs-only HEAD under the release workflow exact-commit policy.

No tag, GitHub Release, NuGet publish, release workflow dispatch, new release-candidate workflow dispatch, security advisory, branch ruleset mutation, repository secret creation, owner/account/recovery mutation, or destructive NuGet action occurred in TASK-0205.

## TASK-0206 Publication

TASK-0206 records `0.2.0-alpha.3` publication and immutable post-publish verification.

- `MD-010`: published. Final publish SHA `92984c6448332aa24b7cff94647f627bf944e535` is a docs/handoff/governance-only successor to refreshed hosted RC evidence commit `eef0adc4d5d11d7fb19adecc59dba9f9a142fd7f`.
- NuGet package `AgentContextKit` `0.2.0-alpha.3`, tag `v0.2.0-alpha.3`, and GitHub prerelease `v0.2.0-alpha.3` exist and target the publish SHA.
- `release.yml` `operation=verify-existing` run `27870813763` succeeded without package/tag/release mutation.
- `MD-007`: follow-up completed locally in TASK-0208. The publish path failed after package/tag/release creation in the provenance probe before attestation; `release.yml` now treats missing attestation HTTP 404 as `exists=false` for future releases. Do not manually attest or mutate alpha.3.

No manual tag creation, manual GitHub Release creation, manual NuGet package upload, repository secret creation, tag movement, version reuse, package replacement, owner/account mutation, or destructive NuGet action occurred in TASK-0206.

## TASK-0220 Alpha4 Authorization And Publish

TASK-0220 published `AgentContextKit 0.2.0-alpha.4` through the OIDC release workflow on 2026-06-26.

| Decision ID | Related entity | Status | Decision | Rationale | Owner role | Evidence | Effective scope | Review/expiry | Remote action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| MD-012 | Alpha4 publish | Published | `0.2.0-alpha.4` is published and immutable | TASK-0219 hosted RC evidence GO; maintainer authorized TASK-0220 publish through OIDC release workflow | Release maintainer | TASK-0220 task doc; release run `28210969527`; tag/release run `28211300136`; commit `98cdf9723a509a347bd0403f6373dafe81ba03fb` | Publish SHA `98cdf97`; package `0.2.0-alpha.4` | No version reuse or tag movement | NuGet package published, tag and GitHub prerelease created |

Predecessor release `0.2.0-alpha.3` remains published and immutable.

## TASK-0219 Alpha4 Hosted RC Evidence

TASK-0219 dispatched the `release-candidate-evidence.yml` workflow for exact candidate commit `b8e8fce68f803c50f708d1566f1a38aab4b34bde` and verified hosted RC evidence.

| Decision ID | Related entity | Status | Decision | Rationale | Owner role | Evidence | Effective scope | Review/expiry | Remote action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| MD-011 | Alpha4 RC evidence | GO | Hosted RC run `28208545684` passed for exact commit `b8e8fce68f803c50f708d1566f1a38aab4b34bde`, candidate `0.2.0-alpha.4`, predecessor `0.2.0-alpha.3` | All required jobs passed on Windows, Ubuntu, and macOS; 428/428 tests; performance tripwire PASS; config compatibility PASS; baseline/SARIF checks PASS; push-triggered CI also green | Release maintainer | TASK-0219 task doc; run `28208545684`; job IDs `83564550663/50665/50688` | Commit `b8e8fce68f803c50f708d1566f1a38aab4b34bde` only | Superseded by TASK-0220 publish | Workflow dispatch completed; no NuGet publish, tag, or release mutation |

No NuGet publish, tag mutation, GitHub Release mutation, release workflow dispatch (`release.yml`), package metadata change, version bump, or public README sync occurred in TASK-0219.
