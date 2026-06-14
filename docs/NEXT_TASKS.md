# Next Tasks

This is the unified execution queue. PROJECT-CONTROL-0102 is complete; PROJECT-CONTROL-0103 now governs release recovery, security/supply-chain evidence, and conditional next-prerelease work.

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
2. Keep private vulnerability reporting enabled and assign an independent backup security notification owner; primary ownership is recorded.
3. Recheck the bounded `Cyranth`/`Cynrath` NuGet identity disposition before expiry or the next release.
4. Recheck the bounded author-signing deferral before expiry or the next release.
5. Recheck the bounded SBOM deferral before expiry or the next release.
6. Obtain hosted provenance evidence only during the next authorized publish; the control is implemented locally.
7. Verify destructive NuGet recovery authority and assign backup recovery ownership; procedure/tabletop are recorded.
8. Keep the selected `0.2.0-alpha.3` scope planning-only until the remaining P0/P1 decisions and exact-candidate evidence are complete.

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
- Current published release: `v0.2.0-alpha.2` at exact package commit `f540479a92cbe66097f6796553828ee49ddd5512`.
- GitHub Release: published pre-release.
- NuGet package: `AgentContextKit` `0.2.0-alpha.2`, published through OIDC Trusted Publishing.
- Published global tool includes `ackit sarif`.
- Local and remote `master` were aligned at PROJECT-CONTROL-0102 start on `8dadd16`.
- All eight checked `ci`, `cross-platform-smoke`, and `cross-platform-source-smoke` jobs succeeded for `8dadd16`.
- TASK-0100 local validation passed with 178/178 tests, clean source scan/doctor, parsed JSON/SARIF, sample smoke, hygiene checks, and all local readiness/release evidence gates. The pre-commit public release gate reported only the expected dirty working tree blocker.
- PROJECT-CONTROL-0101 validation passed with a zero-warning Release build, 178/178 tests, source JSON with zero findings, doctor PASS, parsed global SARIF with no Critical/High findings, sample smoke, clean hygiene/local Markdown links, and all requested local gates. The pre-commit public gate reported only the expected dirty working tree blocker.
- Post-publish commit `ead65120928835419fb91bf695e845721620c394` passed all eight standard hosted jobs: 2 CI, 3 published-package smoke, and 3 source-package smoke.

## Next Task
- PROJECT-CONTROL-0104 should begin only after an independent backup security notification owner and NuGet recovery authority/backup evidence are available. Until then, continue independent local product work without claiming release readiness.

## Execution Rule
Continue TASK-0116 through TASK-0125 in order without per-task prompts. After successful validation, normal commit/push is automatic. Tag, GitHub pre-release, and NuGet publication are allowed only through the explicitly authorized release task and OIDC workflow. Never expose credentials or use force/history-rewrite operations.
