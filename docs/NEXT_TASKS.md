# Next Tasks

This is the unified execution queue. PROJECT-CONTROL-0103 through PROJECT-CONTROL-0109 are closed. PROJECT-CONTROL-0110 (TASK-0188 through TASK-0196) is closed as of 2026-06-19 with 428/428 tests green for the final pushed HEAD. TASK-0198 is an independent docs-only blocker evidence investigation, not a new project control. TASK-0199 completed the post-0198 state cleanup at `0aad858`. TASK-0200 completed the docs-only README/current-source CLI parity cleanup. TASK-0201 completed the docs-only `RB-003`/`RB-008` closure preflight. TASK-0202 completed the docs-only maintainer evidence intake for `ShadowFlameC` backup/security/recovery coverage. `RB-003` and `RB-008` are closed for planned `0.2.0-alpha.3` release-preparation entry. TASK-0203 prepared the local `0.2.0-alpha.3` package candidate at implementation commit `33e1897`. TASK-0204 prepared dispatch-time `origin/master` hosted RC instructions. TASK-0205 records hosted RC run `27868539971` as passed for exact commit `beaa14deed3dbc55ac98d216679f9a9799261801` with candidate `0.2.0-alpha.3` and predecessor `0.2.0-alpha.2`; exact-candidate GO is historical for its exact commit. TASK-0206 completed the authorized OIDC `0.2.0-alpha.3` publish. Release-gate script hardening changed `scripts/**`, so TASK-0206 refreshed hosted RC evidence with run `27870246504` for exact commit `eef0adc4d5d11d7fb19adecc59dba9f9a142fd7f`; all three OS jobs passed. Final publish SHA `92984c6448332aa24b7cff94647f627bf944e535` was a docs/handoff/governance-only successor to that refreshed evidence. NuGet package `0.2.0-alpha.3`, tag `v0.2.0-alpha.3`, and GitHub prerelease `v0.2.0-alpha.3` now exist and are verified.

## Completed Independent Hosted RC Evidence GO

1. TASK-0205 record alpha3 hosted RC evidence / GO - completed locally after read-only `gh` verification; run `27868539971` passed on `windows-2025`, `ubuntu-latest`, and `macos-latest`; exact candidate commit `beaa14deed3dbc55ac98d216679f9a9799261801`; candidate `0.2.0-alpha.3`; predecessor `0.2.0-alpha.2`; source candidate package `0.2.0-alpha.3.ci.27868539971`; annotations are xUnit analyzer warnings only; no publish/tag/GitHub Release/release workflow/new RC workflow/secret/owner/security-setting mutation.

## Completed Independent Alpha.3 Publish

1. TASK-0206 publish `0.2.0-alpha.3` through the existing OIDC `release.yml` workflow - completed. Plan commit `85383a9` is pushed. First three release workflow attempts failed before pack/publish and created no package/tag/release. The third failure required release-gate `git status` stderr hardening under `scripts/**`; remediation commit `eef0adc` passed local restore/build/test (`428/428`), full release gate command set, and `verify-release.ps1`. Refreshed hosted RC run `27870246504` passed on `windows-2025`, `ubuntu-latest`, and `macos-latest` for exact commit `eef0adc4d5d11d7fb19adecc59dba9f9a142fd7f`. Final publish SHA `92984c6448332aa24b7cff94647f627bf944e535` was classified as docs/handoff/governance-only relative to refreshed RC evidence. NuGet package publication occurred in release run `27870383897`; exact tag and GitHub prerelease/assets were created by recovery run `27870603776`; read-only immutable release verification succeeded in `release.yml` run `27870813763`. Publish-path provenance probe hardening remains a follow-up before the next release.

## Completed Independent Hosted RC Evidence Planning

1. TASK-0204 prepare alpha3 hosted RC evidence / GO decision - completed locally; plan commit `4517893`; documentation preparation commit `2fa9195`; dispatch-time `origin/master` is the exact candidate; candidate `0.2.0-alpha.3`; predecessor `0.2.0-alpha.2`; no hosted alpha.3 run exists yet; no workflow dispatch or publication action.

## Completed Independent Release Preparation

1. TASK-0203 prepare `0.2.0-alpha.3` local release candidate - completed locally; plan commit `da51d4d`; implementation commit `33e1897`; package validation and local install smoke passed; known Windows `git status --short` stderr caveat recorded for release gates; no tag, GitHub Release, NuGet publish, release workflow dispatch, release-candidate workflow dispatch, owner/security-setting/secret mutation, or destructive NuGet action.

## Completed Independent Maintainer Evidence Intake

1. TASK-0202 record `ShadowFlameC` backup/security/recovery evidence for `RB-003` and `RB-008` - completed; docs-only; no version/tag/NuGet/GitHub Release/workflow/security-setting/owner mutation; `0.2.0-alpha.3` is release-preparation eligible but unpublished.

## Completed Independent Blocker Closure Preflight

1. TASK-0201 perform `RB-003`/`RB-008` closure preflight - completed; docs-only; recorded found/missing maintainer evidence; did not close either blocker; no release/tag/NuGet/version/workflow/security-setting/owner/recovery mutation; TASK-0202 later records maintainer evidence.

## Completed Independent README Parity Task

1. TASK-0200 sync README CLI command surface with current-source `--help`, `docs/CLI_CONTRACT.md`, and `docs/CLI_REFERENCE.md` - completed; docs-only; no release/tag/NuGet/version/workflow/security-setting mutation; `0.2.0-alpha.3` remained NO-GO at that time.

## Completed Independent State Cleanup

1. TASK-0199 post-0198 state cleanup - completed and pushed at `0aad858`; docs-only; marked TASK-0198 completed consistently and recorded final clean-tree/push evidence.

## Completed Independent Blocker Investigation

1. TASK-0198 investigate `RB-003` and `RB-008` closure evidence - completed and pushed at `533b64a`; docs-only; no release/tag/NuGet/version/security-setting mutation; recorded exact missing maintainer evidence and kept `0.2.0-alpha.3` NO-GO at that time.

## Closed PROJECT-CONTROL-0110 (2026-06-19)

PROJECT-CONTROL-0110 closed at TASK-0196 on 2026-06-19. Cumulative suite: 428/428 green. No release, no tag, no NuGet publish, no version bump; `0.2.0-alpha.3` remained NO-GO at control closure.

1. TASK-0188 MCP transport step 2 (real stdio loop with redaction + safety bounds) - completed; pushed.
2. TASK-0189 `ackit watch` local implementation (FileSystemWatcher, debounce, ignore list, cancellation) - completed; pushed.
3. TASK-0190 `ackit watch` debounce + ignore-list + cancellation unit tests - completed; pushed.
4. TASK-0191 trim edge case tests (binary input, large files, UTF-8 boundary) - completed; pushed.
5. TASK-0192 MCP tool surface extension (`ackit.rules` read-only metadata tool) - completed; pushed.
6. TASK-0193 localization parity for new commands and MCP step 2 error surface - completed; pushed.
7. TASK-0194 docs update (MCP_STDIO_DESIGN Step 2, WATCH_MODE implementation notes, CLI_REFERENCE) - completed; pushed.
8. TASK-0195 docs-first local audit + state sync - completed; pushed.
9. TASK-0196 final validation and hosted check sync - completed; PROJECT-CONTROL-0110 closed.

## Active PROJECT-CONTROL-0109
1. TASK-0177 hook expansion (Anthropic + Continue targets, dry-run preview) - hosted-verified.
2. TASK-0178 MCP transport prototype step 1 (Core interface + JSON-RPC plumbing, no process spawn) - hosted-verified; 283/283 tests green.
3. TASK-0179 webui no-build static polish - hosted-verified; 287/287 tests green.
4. TASK-0180 hosted check status reporter script - hosted-verified; 293/293 tests green.
5. TASK-0187 release deployment failure audit and script hardening - hosted-verified; 296/296 tests green; no release/tag/NuGet/deployment mutation.
6. TASK-0181 SARIF roundtrip regression test - hosted-verified; 299/299 tests green; pushed HEAD `52399d5`; no production code change.
7. TASK-0182 prompt pack edge cases (empty repo, single-file repo, docs-only repo, secret-bearing fixture) - hosted-verified; 303/303 tests green; pushed HEAD `8fc1361`.
8. TASK-0183 catalog rule id and severity stability test - hosted-verified; 305/305 tests green; pushed HEAD `4aaa157`.
9. TASK-0184 scan `--include` / `--exclude` glob filters - hosted-verified; 313/313 tests green; pushed HEAD `f5873eb`.
10. TASK-0185 nightly local check workflow (`.github/workflows`) - hosted-verified; 315/315 tests green; pushed HEAD `7311d4e`.
11. TASK-0186 final validation and hosted check sync - hosted-verified; 315/315 tests green; pushed HEAD `a1151c7`; PROJECT-CONTROL-0109 closed.

## Active PROJECT-CONTROL-0108
1. TASK-0168 post-0107 audit and state sync - completed.
2. TASK-0169 add `generate` targets for Anthropic and Continue - completed.
3. TASK-0170 safe `ackit hooks` command design and implementation - completed.
4. TASK-0171 `ackit diff` for baselines - completed.
5. TASK-0172 `ackit trim` design and minimal safe implementation - completed.
6. TASK-0173 `ackit watch` design and local implementation plan - completed (design-only).
7. TASK-0174 entropy scanner rule research and guard tests - completed.
8. TASK-0175 MCP stdio design-only - completed.
9. TASK-0176 final validation and hosted check sync - completed; 270/270 tests green.

## Active PROJECT-CONTROL-0107
1. TASK-0159 post-0158 audit and state sync - completed.
2. TASK-0160 scanner severity explanation polish - completed.
3. TASK-0161 config-check actionable diagnostics examples - completed.
4. TASK-0162 baseline diff documentation and tests - completed.
5. TASK-0163 SARIF rule metadata completeness - completed.
6. TASK-0164 report and WebUI accessibility and offline UX polish - completed.
7. TASK-0165 prompt pack and context export redaction hardening - completed.
8. TASK-0166 sample gallery coverage expansion - completed.
9. TASK-0167 final validation and hosted check sync - completed; 257/257 tests green.

## Active PROJECT-CONTROL-0106
1. TASK-0140 repo rules commit and push policy sync - completed.
2. TASK-0141 project queue and handoff consistency audit - completed.
3. TASK-0142 scanner rule doc contract consistency - completed.
4. TASK-0143 agent instruction surface consistency - completed.
5. TASK-0144 next local product work selection - completed; seven TASK-0146 through TASK-0152 files created.
6. TASK-0145 final validation and hosted check sync - completed.

## Independent Local Product/Code-Quality Track
1. TASK-0146 scanner severity explanation polish - completed.
2. TASK-0147 config-check actionable diagnostics examples - completed.
3. TASK-0148 baseline diff documentation and tests - completed.
4. TASK-0149 SARIF rule metadata completeness - completed.
5. TASK-0150 report and Web UI accessibility and offline UX polish - completed.
6. TASK-0151 prompt pack and context export redaction hardening - completed.
7. TASK-0152 sample gallery test coverage expansion - completed.
8. TASK-0156 brand/PII keyword starter config - completed; 238/238 tests green.
9. TASK-0157 safe domain and ignored paths starter config - completed.
10. TASK-0158 Turkish CLI locale fallback guard - completed.

## Active PROJECT-CONTROL-0104
1. TASK-0135 issue template version placeholder sync - completed.
2. TASK-0136 active docs project control and test count refresh - completed.
3. TASK-0137 scanner rule catalog extension - completed; `ACKIT006` and `ACKIT007` added.
4. TASK-0138 issue template guard test and final audit sync - completed; 192/192 tests green.
5. PROJECT-CONTROL-0105 post-0104 audit and continuation - completed; SARIF doc and queue refresh merged.

## Active PROJECT-CONTROL-0105
1. TASK-0139 end-to-end coverage for new scanner rule IDs - completed; 197/197 tests green.

## Active PROJECT-CONTROL-0103
1. TASK-0126 release recovery and idempotent verification - completed.
2. TASK-0127 alpha.2 supply-chain evidence refresh - completed.
3. TASK-0128 hosted release-candidate evidence hardening - completed; run `27478635057` green on three operating systems.
4. TASK-0129 private vulnerability reporting verification - completed; `enabled: true` verified 2026-06-14.
5. TASK-0130 security notification and recovery ownership - completed to verifiable boundary; backup/authority blockers recorded.
6. TASK-0131 NuGet owner identity disposition - completed with bounded accepted risk.
7. TASK-0132 signing, SBOM, and provenance implementation/decision - completed locally; provenance hosted-pending next publish.
8. TASK-0133 next prerelease scope and version selection - completed; `0.2.0-alpha.3` selected without metadata changes.
9. TASK-0134 conditional next prerelease preparation, publication, and verification - completed to safe boundary with evidence-backed NO-GO; no candidate or publication was attempted.

## Active Alpha.2 Execution
1. TASK-0116 documentation consistency and local Markdown-link audit.
2. TASK-0117 scanner precision audit and hardening.
3. TASK-0118 suppression audit polish.
4. TASK-0119 baseline-aware CI policy polish.
5. TASK-0120 config diagnostics polish.
6. TASK-0121 contract, regression, and performance validation.
7. TASK-0122 OIDC release automation and credential boundary.
8. TASK-0123 `v0.2.0-alpha.2` release preparation and exact-commit push - completed.
9. TASK-0124 hosted validation and publication - completed.
10. TASK-0125 post-publish verification and final hosted validation - completed.

## Completed Local Execution
- TASK-0066 through TASK-0099 are completed locally.
- The current published release is `v0.2.0-alpha.2`.
- Standard `ci`, published-package smoke, and source-package smoke are green for current remote `master`.
- The release-candidate evidence boundary remains `LOCAL READY / REMOTE NO-GO` where applicable.
- Completed local documentation, tests, and gates do not claim 1.0 readiness or close remote P0/P1 decisions.

## Maintainer-Gated Release/Security Track
These actions require explicit maintainer control and do not block safe local-only product/documentation work:

1. Rerun the manual hosted RC evidence workflow only for a different selected final-candidate commit; alpha.2 evidence is green at `4c4fa64`.
2. Keep private vulnerability reporting enabled and maintain the independent backup security notification owner record; primary ownership is recorded.
3. Recheck the bounded `Cyranth`/`Cynrath` NuGet identity disposition before expiry or the next release.
4. Recheck the bounded author-signing deferral before expiry or the next release.
5. Recheck the bounded SBOM deferral before expiry or the next release.
6. Obtain hosted provenance evidence only during the next authorized publish; the control is implemented locally.
7. Maintain NuGet backup recovery ownership and recovery procedure/tabletop evidence.
8. Maintain the TASK-0206 `0.2.0-alpha.3` publish evidence. Do not mutate the published package, tag, or GitHub Release; use successor-release policy for any correction.

## Local-Only Ecosystem/Product Intelligence Track
1. TASK-0100 offline OSS ecosystem catalog and roadmap reset - completed locally.
2. TASK-0101 related tools comparison matrix - completed locally.
3. TASK-0102 offline workflow examples with external tools - completed locally.
4. TASK-0103 optional interoperability design, no dependency - completed locally.
5. TASK-0104 agent context pipeline taxonomy - completed locally.
6. TASK-0105 README ecosystem positioning section - completed locally.
7. TASK-0106 ecosystem evidence schema and review policy - completed locally.
8. TASK-0107 external tool privacy threat model - completed locally.
9. TASK-0108 disposable offline workflow lab plan - completed locally.
10. TASK-0109 optional command design: `ackit external-tools` - completed locally.
11. TASK-0110 optional command design: `ackit workflow` - completed locally.
12. TASK-0111 external SARIF/JSON/SBOM/graph import boundary - completed locally.
13. TASK-0112 docs quality toolchain decision - completed locally.
14. TASK-0113 no-network/default-offline policy hardening - completed locally.
15. TASK-0114 release blocker board and maintainer decision register - completed locally.
16. TASK-0115 `v0.2.0-alpha.2` candidate planning refresh - completed locally.
17. TASK-0116 ecosystem documentation consistency and local link audit - completed.

## Current Remote State
- Current published release: `v0.2.0-alpha.3` at exact publish commit `92984c6448332aa24b7cff94647f627bf944e535`.
- GitHub Release: `v0.2.0-alpha.3` published pre-release.
- NuGet package: `AgentContextKit` `0.2.0-alpha.3`, published through OIDC Trusted Publishing.
- Published global tool includes `ackit sarif`.
- Local and remote `master` were aligned at PROJECT-CONTROL-0102 start on `8dadd16`.
- All eight checked `ci`, `cross-platform-smoke`, and `cross-platform-source-smoke` jobs succeeded for `8dadd16`.
- TASK-0100 local validation passed with 178/178 tests, clean source scan/doctor, parsed JSON/SARIF, sample smoke, hygiene checks, and all local readiness/release evidence gates. The pre-commit public release gate reported only the expected dirty working tree blocker.
- PROJECT-CONTROL-0101 validation passed with a zero-warning Release build, 178/178 tests, source JSON with zero findings, doctor PASS, parsed global SARIF with no Critical/High findings, sample smoke, clean hygiene/local Markdown links, and all requested local gates. The pre-commit public gate reported only the expected dirty working tree blocker.
- Post-publish commit `ead65120928835419fb91bf695e845721620c394` passed all eight standard hosted jobs: 2 CI, 3 published-package smoke, and 3 source-package smoke.

## Next Task
- Recommended next action: harden the `release.yml` provenance probe so missing attestation state does not fail before `actions/attest@v4`, then separately update published-package smoke workflow/docs to `0.2.0-alpha.3` if desired. No mutation of the published `0.2.0-alpha.3` package, tag, or GitHub Release is authorized.

## Execution Rule
After the closure of PROJECT-CONTROL-0110, the queue is in pause except for explicitly requested independent docs/release-preparation tasks. Tag, GitHub pre-release, NuGet publication, and workflow dispatch are allowed only through the explicitly authorized release task and OIDC workflow. Never expose credentials or use force/history-rewrite operations.
