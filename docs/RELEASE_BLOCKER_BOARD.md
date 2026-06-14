# Release Blocker Board

Status date: 2026-06-14. Decision boundary: `LOCAL READY / REMOTE NO-GO` for the next release candidate.

| Blocker ID | Category | Priority | Current status | Owner role | Evidence required | Remote write? | Decision options / accepted risk | Review date | Release impact | Done criteria |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| RB-001 | Hosted RC evidence | P0 | Closed for reviewed alpha.2 state: run `27478635057` green on three OS | Release maintainer | Exact candidate commit, workflow URL, Windows/Ubuntu/macOS jobs, package/config/baseline/SARIF/performance results | Yes: push/dispatch | Rerun for a different final candidate | 2026-06-14 | Rerun-dependent | Green reviewed run for exact candidate |
| RB-002 | Private vulnerability reporting | P0 | Closed: enabled and independently verified | Security maintainer | GitHub GET `enabled: true`, report entry visible, verification date/maintainer | Yes | Recheck before future RC | 2026-06-14 | Complete | Verified enabled state and report entry |
| RB-003 | Security notification ownership | P0 | Partial: `Cynrath` primary; independent backup unassigned | Security maintainer | Backup role, notification coverage, review date | Possibly | Assign backup; no unowned accepted-risk option | 2026-06-14 | Blocks candidate | Verified primary and backup ownership record |
| RB-004 | NuGet owner identity | P1 | Disposed: bounded accepted risk; public owner `Cyranth`, package/project persona `Cynrath` | Package maintainer | Public owner/OIDC evidence and dated review | No owner change | Recheck or align before expiry | 2026-09-30 | Accepted for current scope | `docs/NUGET_OWNER_IDENTITY.md` maintained |
| RB-005 | Author signing | P1 | Disposed: bounded defer/accepted risk | Package/security maintainer | Repository signature plus dated controls/review | No signing | Revisit before expiry | 2026-09-30 | Accepted for current scope | Do not claim author signing |
| RB-006 | SBOM publication | P1 | Disposed: bounded defer/accepted risk | Release/security maintainer | Dependency/package inspection plus dated review | No publication | Validate generator/privacy before implementation | 2026-09-30 | Accepted for current scope | No false SBOM claim |
| RB-007 | Provenance/attestation | P1 | Implemented locally; hosted evidence pending next publish | Release/security maintainer | Exact release nupkg, signer workflow, verification result | Yes in publish job | No retrospective alpha.2 attestation | Next publish | Blocks completion of next publish | Successful `actions/attest@v4` and CLI verification |
| RB-008 | Package recovery | P1 | Partial: procedure/tabletop accepted; NuGet authority and backup unresolved | Package/security maintainer | Verified execution authority, backup, trigger, unlist/deprecate/successor steps | Only during remote action/incident | Complete authority/backup disposition | 2026-06-14 | Blocks unless accepted | Procedure plus verified authority and backup |
| RB-009 | Candidate version | P0/P1 dependent | Open: no next version selected | Release maintainer | Scope, compatibility, package diff, changelog, exact commit, prerequisite disposition | Yes later | Select only after required blocker decisions | TBD | Blocks candidate | Dedicated approved release-preparation task |
| RB-010 | Release approval | P0 | NO-GO | Release maintainer | Completed checklist, local/hosted evidence, blocker dispositions, package/release review | Yes later | GO or NO-GO; no implicit approval | TBD | Blocks all release writes | Signed-off GO decision for exact commit/version |

## Rules
- `TBD` is a placeholder, not a due-date commitment.
- An accepted-risk option is not accepted until the decision register has decision, rationale, owner role, evidence, review date, and exact release scope.
- Local docs/tests/gates cannot mark a remote/security/package blocker done.
- The current published `v0.2.0-alpha.2` remains unaffected; this board governs future candidate decisions.
