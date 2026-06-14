# Release Blocker Board

Status date: 2026-06-14. Decision boundary: `LOCAL READY / REMOTE NO-GO` for the next release candidate.

| Blocker ID | Category | Priority | Current status | Owner role | Evidence required | Remote write? | Decision options / accepted risk | Review date | Release impact | Done criteria |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| RB-001 | Hosted RC evidence | P0 | Closed for reviewed alpha.2 state: run `27478635057` green on three OS | Release maintainer | Exact candidate commit, workflow URL, Windows/Ubuntu/macOS jobs, package/config/baseline/SARIF/performance results | Yes: push/dispatch | Rerun for a different final candidate | 2026-06-14 | Rerun-dependent | Green reviewed run for exact candidate |
| RB-002 | Private vulnerability reporting | P0 | Closed: enabled and independently verified | Security maintainer | GitHub GET `enabled: true`, report entry visible, verification date/maintainer | Yes | Recheck before future RC | 2026-06-14 | Complete | Verified enabled state and report entry |
| RB-003 | Security notification ownership | P0 | Partial: `Cynrath` primary; independent backup unassigned | Security maintainer | Backup role, notification coverage, review date | Possibly | Assign backup; no unowned accepted-risk option | 2026-06-14 | Blocks candidate | Verified primary and backup ownership record |
| RB-004 | NuGet owner identity | P1 | Open: public owner `Cyranth`, package/project persona `Cynrath` | Package maintainer | Alignment or dated intentional exception with recovery owner | Yes if changing ownership | Align; or accept documented mismatch with review date | TBD | Blocks unless accepted | Evidence and explicit disposition recorded |
| RB-005 | Author signing | P1 | Open: repository signature observed; no author signature observed | Package/security maintainer | Sign/defer decision, certificate/identity lifecycle if selected, package verification | Yes if signing | Implement author signing; or dated accepted risk | TBD | Blocks unless accepted | Exact candidate verification or approved defer record |
| RB-006 | SBOM publication | P1 | Open: no published SBOM | Release/security maintainer | Format, generation source, digest, privacy review, location, retention | Yes if publishing | Publish reviewed SBOM; or dated accepted risk | TBD | Blocks unless accepted | Exact candidate SBOM evidence or defer record |
| RB-007 | Provenance/attestation | P1 | Open: no accessible GitHub package attestation | Release/security maintainer | Workflow, subject digest, builder identity, verification command/location | Yes | Publish provenance; or dated accepted risk | TBD | Blocks unless accepted | Verified exact-artifact attestation or defer record |
| RB-008 | Package recovery | P1 | Partial: procedure/tabletop accepted; NuGet authority and backup unresolved | Package/security maintainer | Verified execution authority, backup, trigger, unlist/deprecate/successor steps | Only during remote action/incident | Complete authority/backup disposition | 2026-06-14 | Blocks unless accepted | Procedure plus verified authority and backup |
| RB-009 | Candidate version | P0/P1 dependent | Open: no next version selected | Release maintainer | Scope, compatibility, package diff, changelog, exact commit, prerequisite disposition | Yes later | Select only after required blocker decisions | TBD | Blocks candidate | Dedicated approved release-preparation task |
| RB-010 | Release approval | P0 | NO-GO | Release maintainer | Completed checklist, local/hosted evidence, blocker dispositions, package/release review | Yes later | GO or NO-GO; no implicit approval | TBD | Blocks all release writes | Signed-off GO decision for exact commit/version |

## Rules
- `TBD` is a placeholder, not a due-date commitment.
- An accepted-risk option is not accepted until the decision register has decision, rationale, owner role, evidence, review date, and exact release scope.
- Local docs/tests/gates cannot mark a remote/security/package blocker done.
- The current published `v0.2.0-alpha.2` remains unaffected; this board governs future candidate decisions.
