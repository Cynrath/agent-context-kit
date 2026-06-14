# Project Execution Queue

## Active PROJECT-CONTROL-0104 Track
| Order | Status | Task | Priority | Blocking status | Expected files | Validation required | Remote write required? | Done criteria |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 70 | Completed | TASK-0135 issue template version placeholder sync | Low | None | four `.github/ISSUE_TEMPLATE/*.yml` | `git diff --check` and local gates | Push after validation | Templates show current `0.2.0-alpha.2` placeholder |
| 71 | Completed | TASK-0136 active docs project control and test count refresh | Low | None | active queue, NEXT_TASKS, NEXT_STEPS | local Markdown link gate and `git diff --check` | Push after validation | Active control row points to PROJECT-CONTROL-0104 |
| 72 | Completed | TASK-0137 scanner rule catalog extension | Low | None | Core catalog, focused tests, SCANNER_RULES.md | `dotnet test` 187/187 green, `ackit scan --ci` and `doctor` clean | Push after validation | `ACKIT006` and `ACKIT007` added with ruleId and Suppression coverage |
| 73 | Completed | TASK-0138 issue template guard test and final audit sync | Low | None | new test, queue, NEXT_TASKS | `dotnet test` 192/192 green | Push after validation | CI guard against placeholder drift and final docs refresh |
| 74 | In progress | PROJECT-CONTROL-0105 post-0104 audit and continuation | Low | None | PROJECT-CONTROL-0105 task file, queue and SARIF_OUTPUT.md updates, next TASK | full local validation suite, hosted 3/3 | Push after validation | 10-item 0104 audit closed and next safe task queued |

## Active PROJECT-CONTROL-0103 Track
| Order | Status | Task | Priority | Blocking status | Expected files | Validation required | Remote write required? | Done criteria |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 61 | Completed | TASK-0126 release recovery verification | P0 | Complete | release workflow/scripts/tests/docs | local gates, 8/8, verify-existing run | Dispatch only; verifier read-only | Run `27478046088` green |
| 62 | Completed | TASK-0127 alpha.2 supply-chain evidence | P1 | Complete | evidence/status/gates | exact artifact audit | Read-only queries | Alpha.2 evidence is reproducible |
| 63 | Completed | TASK-0128 hosted RC evidence hardening | P0 future release | Complete for reviewed alpha.2 state | RC workflow/gates/evidence | exact hosted matrix | Dispatch only | Run `27478635057` green on three OS |
| 64 | Completed | TASK-0129 private vulnerability reporting | P0 future release | Complete | security status/evidence/script | enabled boolean re-read and public entry check | Completed | Enabled and independently verified |
| 65 | Completed to verifiable boundary | TASK-0130 notification/recovery ownership | P0/P1 | Backup and NuGet authority remain | security/recovery/decision docs | evidence structure/tabletop | No remote incident action | Truthful primary ownership/procedure and explicit blockers |
| 66 | Completed | TASK-0131 NuGet identity disposition | P1 | Bounded accepted risk | NuGet/evidence/decision docs | public identity/OIDC review | No owner mutation | Dated exception through 2026-09-30 |
| 67 | Completed locally | TASK-0132 signing/SBOM/provenance | P1 | Provenance hosted-pending | workflow/scripts/evidence | permission/action tests plus future publish verification | Publish job only | Deferrals recorded; provenance implemented |
| 68 | Completed | TASK-0133 next prerelease selection | P0 | `0.2.0-alpha.3` selected; publication deferred | scope/roadmap/changelog docs | contract/version gates | No | Smallest valid version selected without metadata bump |
| 69 | Completed to safe boundary / NO-GO | TASK-0134 next prerelease release | P0 | Independent backup security owner and recovery authority remain unresolved | release decision/status files | local gates plus planning-commit 8/8 | No release write performed | Evidence-backed NO-GO; resume conditions recorded |

## Active Authorized Alpha.2 Track
| Order | Status | Task | Priority | Blocking status | Expected files | Validation required | Remote write required? | Done criteria |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 51 | Done locally | TASK-0116 documentation consistency/link audit | High | Complete | local Markdown gate/tests and active docs | focused test plus docs gates | Push after validation | Active wording and local links pass |
| 52 | Done locally | TASK-0117 scanner precision audit | High | Complete | focused Core/tests/docs | positive/negative scanner tests | Push after validation | Precision improves without weaker Critical detection |
| 53 | Done locally | TASK-0118 suppression audit polish | High | Complete | suppression code/tests/docs | sanitized audit tests | Push after validation | Audit is deterministic and raw-value-free |
| 54 | Done locally | TASK-0119 baseline-aware CI polish | High | Complete | baseline/CLI tests/docs | baseline and exit contract tests | Push after validation | New severe findings still block |
| 55 | Done locally | TASK-0120 config diagnostics polish | High | Complete | validator/CLI tests/docs | valid/warning/error tests | Push after validation | Stable sanitized diagnostics |
| 56 | Done locally | TASK-0121 full validation | P0 | Complete | evidence docs | complete local gate set | No | All contracts/performance pass |
| 57 | Done locally | TASK-0122 release automation | P0 | Complete | release workflow/scripts/docs | static/local release automation gates | Push after validation | Manual exact-SHA OIDC workflow is safe/idempotent |
| 58 | Completed | TASK-0123 alpha.2 preparation | P0 | Complete | version/release/package metadata | full package/install smoke | Yes, completed | Exact candidate commit pushed |
| 59 | Completed | TASK-0124 hosted publish | P0 | Complete | hosted release evidence | release workflow plus package/tag/release verification | Yes, completed | NuGet/tag/pre-release complete |
| 60 | Completed | TASK-0125 post-publish verification | P0 | Complete | README/workflow/status docs | installed-tool smoke and final 8/8 | Yes, completed | Clean aligned final state |

## Completed Local Execution
| Status | Task range | Scope | Validation | Remote state |
| --- | --- | --- | --- | --- |
| Done locally | TASK-0066 through TASK-0099 | Post-release docs, scanner/config/output hardening, tutorials, baseline/config product work, RC evidence, security/supply-chain state audits | Full local build/test/scan/doctor/sample/readiness/release gates per task | Remote actions remain separately controlled |

## Maintainer-Gated Release/Security Track
| Order | Status | Action | Priority | Blocking status | Expected evidence | Validation required | Remote write required? | Done criteria |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| M1 | Verified for alpha.2 state | Manual hosted RC evidence workflow | P0 | Rerun for a different final candidate | Run `27478635057`, exact `4c4fa64`, three-OS results | Hosted predecessor/config/baseline/SARIF/performance workflow | Yes | Green run recorded; future candidate must rerun |
| M2 | Partially complete | Private vulnerability reporting and notification ownership | P0 | Independent backup still blocks RC | Setting `enabled: true`; primary `Cynrath`; backup unassigned | Read-only API/UI verification plus ownership record | Setting complete | Verified channel plus primary and backup coverage |
| M3 | Accepted risk | NuGet owner identity alignment | P1 | Disposed through next prerelease decision or 2026-09-30 | `Cyranth`/`Cynrath` dated intentional exception | NuGet package/profile/OIDC review | No owner mutation | Recheck before expiry |
| M4 | Accepted risk | Author signing | P1 | Deferred through next prerelease decision or 2026-09-30 | Repository signature plus dated controls/review | Exact package verification | No signing | Recheck before expiry |
| M5 | Accepted risk | SBOM publication | P1 | Deferred through next prerelease decision or 2026-09-30 | Dependency/package controls plus dated review | Exact candidate/package review | No publication | Recheck before expiry |
| M6 | Implemented locally | Provenance/attestation | P1 | Hosted evidence requires next publish | Exact release nupkg, signer workflow, CLI verification | Workflow static tests plus future hosted attestation | Publish job only | Verified attestation on next release |
| M7 | Partially complete | Package recovery ownership | P1 | Authority and backup remain | Owner, threshold, communication, immutable successor procedure recorded | Tabletop/document review | Only during incident/action | Verify authority and backup coverage |
| M8 | Selected / NO-GO | Candidate version and release approval | P0/P1 dependent | `0.2.0-alpha.3` selected; GO packet incomplete | Version scope plus future exact commit, metadata, notes, package diff, GO/NO-GO | Full local and hosted release gates | Yes only after GO | Dedicated approved release-preparation task |

## Local-Only Ecosystem/Product Intelligence Track
| Order | Status | Task | Priority | Blocking status | Expected files | Validation required | Remote write required? | Done criteria |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 35 | Done locally | TASK-0100 offline OSS ecosystem catalog and roadmap reset | Medium | None | ecosystem/positioning/workflow docs, queue reset, README links | Official-source research plus full local gates | No | Initial catalog and split roadmap exist without dependencies |
| 36 | Done locally | TASK-0101 related tools comparison matrix | Medium | None | normalized comparison/evidence docs | Source/license/offline review plus docs gates | No | Higher-confidence matrix with review dates and evidence links |
| 37 | Done locally | TASK-0102 offline workflow examples with external tools | Medium | Tools installed manually for optional validation | disposable example docs/scripts only if approved | No-upload disposable smoke and hygiene | No | Safe copy-ready workflows with no auto-install/network default |
| 38 | Done locally | TASK-0103 optional interoperability design, no dependency | Medium | Requires TASK-0101/0102 evidence | architecture/ADR/schema proposal | Threat model, license/privacy/output contract review | No | Opt-in adapter boundary designed without implementation |
| 39 | Done locally | TASK-0104 agent context pipeline taxonomy | Low | None | taxonomy/product/docs updates | Docs review and scanner hygiene | No | Product categories and handoff stages are consistently named |
| 40 | Done locally | TASK-0105 README ecosystem positioning section | Low | Waits for comparison/taxonomy review | concise README/docs updates | Docs/hygiene/release gates | No | Public positioning is concise, accurate, and stable |
| 41 | Done locally | TASK-0106 ecosystem evidence schema and review policy | Medium | TASK-0101 evidence format | evidence schema/review policy | Evidence-field and staleness review plus docs gates | No | Catalog claims have source, confidence, review, and stale-after metadata |
| 42 | Done locally | TASK-0107 external tool privacy threat model | High | TASK-0103 trust boundaries | privacy threat model and linked security docs | Threat coverage, hygiene, security/docs gates | No | External output and executable risks have mitigations and residual-risk owners |
| 43 | Done locally | TASK-0108 disposable offline workflow lab plan | Medium | TASK-0102 examples and TASK-0107 threats | lab/evidence-capture plan | Static privacy/offline/cleanup review | No | Future smoke uses synthetic disposable samples without secrets or committed outputs |
| 44 | Done locally | TASK-0109 `ackit external-tools` command design | Medium | TASK-0103/0107 | design-only CLI docs | CLI docs consistency and trust-boundary review | No | Discovery/probe design exists without implementation or default doctor changes |
| 45 | Done locally | TASK-0110 `ackit workflow` command design | Medium | TASK-0102/0103 | design-only CLI/workflow docs | CLI docs consistency and example review | No | Guidance-only workflow family is specified without execution |
| 46 | Done locally | TASK-0111 external output import boundary | High | TASK-0103/0107 | SARIF/JSON/SBOM/graph import design | Contract/privacy/security review | No | Namespaced, size-limited, sanitized summary boundary is specified without parser code |
| 47 | Done locally | TASK-0112 docs quality toolchain decision | Low | None | docs quality/site decision | Docs inventory and local-only validation | No | Markdown stays canonical and optional tools have activation gates |
| 48 | Done locally | TASK-0113 no-network/default-offline policy hardening | High | TASK-0107 | authoritative offline policy and aligned public docs | Terminology, scan, privacy/security/release gates | No | Default commands and outputs have an unambiguous no-upload/no-call boundary |
| 49 | Done locally | TASK-0114 release blocker board and maintainer decision register | High | Existing RC/security evidence | blocker board/register and linked evidence docs | Cross-document and security/supply-chain gates | No | Open P0/P1 items are visible without being closed |
| 50 | Done locally | TASK-0115 `v0.2.0-alpha.2` candidate planning refresh | Medium | TASK-0114 blocker truth | planning-only scope docs | Version/reference and full local gates | No | Scope is current, no version changes occur, and release remains maintainer-gated |
| 51 | Superseded by active track | TASK-0116 ecosystem documentation consistency and local link audit | Low | TASK-0101 through TASK-0115 | See active authorized track | See active authorized track | See active authorized track | Tracked above |

## Guardrail
Maintainer-gated work does not block local-only product/docs progress, but no local task may claim release-ready, 1.0-ready, active security controls, signing, SBOM, provenance, or hosted RC completion without exact evidence.

## Local Validation
Last verified locally on 2026-06-14 at commit `d104e02`:
- `dotnet build AgentContextKit.sln -c Release` clean, 0 warnings, 0 errors.
- `dotnet test AgentContextKit.sln -c Release --no-build` 186/186 green.
- `ackit scan --ci` and `ackit doctor` clean.
- `powershell -ExecutionPolicy Bypass -File scripts/check-local-markdown-links.ps1 -FailOnIssues` clean across 227 local targets.

## Alpha.3 Status
- `0.2.0-alpha.3` remains NO-GO. `RB-003` (independent backup security owner) and `RB-008` (destructive NuGet recovery authority) remain maintainer-gated blockers; see `docs/V020_ALPHA3_RELEASE_DECISION.md`, `docs/RELEASE_BLOCKER_BOARD.md`, and `docs/MAINTAINER_DECISION_REGISTER.md`.
