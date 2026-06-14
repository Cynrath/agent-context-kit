# Maintainer Decision Register

This register records future maintainer decisions. It contains no approval yet.

| Decision ID | Related blocker | Status | Decision | Rationale | Owner role | Evidence | Effective scope | Review/expiry | Remote action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| MD-001 | RB-001 hosted evidence | Verified for reviewed alpha.2 state | Rerun for a different candidate | Run `27478635057` passed exact three-OS evidence | Release maintainer | Exact commit/run/results in hosted status | Commit `4c4fa64` only | Next candidate | Dispatch completed |
| MD-002 | RB-002 private reporting | Complete | Enabled | Secure repository disclosure path is required | Cynrath | GET `enabled: true` and public entry verification on 2026-06-14 | Repository | Before next RC | Setting enabled |
| MD-003 | RB-003 notifications | Partial | Primary assigned; backup pending | Private reports need continuity beyond one account | Cynrath primary; backup unassigned | `docs/SECURITY_NOTIFICATION_OWNERSHIP.md` | Repository | Before next RC | No test advisory created |
| MD-004 | RB-004 owner identity | Accepted risk | Keep `Cyranth` NuGet owner and `Cynrath` public metadata for current scope | OIDC publish works; unverified ownership mutation risks access disruption | Cynrath package maintainer | `docs/NUGET_OWNER_IDENTITY.md`, alpha.2 OIDC publish | Through next pre-release decision | 2026-09-30 | No owner change |
| MD-005 | RB-005 author signing | Pending maintainer | TBD | Current package has repository signature only | Package/security maintainer | Exact package signature verification | Next candidate | TBD | Signing pipeline if selected |
| MD-006 | RB-006 SBOM | Pending maintainer | TBD | Privacy and publication lifecycle are unresolved | Release/security maintainer | Exact SBOM/digest/location or defer record | Next candidate | TBD | Publication if selected |
| MD-007 | RB-007 provenance | Pending maintainer | TBD | No accessible package attestation is recorded | Release/security maintainer | Attestation and subject digest or defer record | Next candidate | TBD | Attestation if selected |
| MD-008 | RB-008 recovery | Partial | Procedure accepted; execution authority/backup pending | Immutable successor recovery is required, but NuGet identity and continuity remain unresolved | Cynrath decision owner | `docs/PACKAGE_RECOVERY.md`, tabletop 2026-06-14 | Package lifecycle | Before next RC | No package state changed |
| MD-009 | RB-009 candidate | Pending maintainer | TBD | Candidate selection waits for prerequisite decisions | Release maintainer | Scope/version/commit/package diff | Next candidate | TBD | Later release writes |
| MD-010 | RB-010 approval | NO-GO | No release approval | Required P0/P1 evidence is incomplete | Release maintainer | Full decision packet | Exact future candidate | Until replaced | No remote write authorized |

## Recording A Decision
Replace `TBD` only with explicit maintainer evidence. Record the exact commit/version scope. Accepted risk must include why, compensating controls, owner role, review/expiry date, and rollback/recovery path. Do not use this register to store credentials, certificates, private report content, or recovery secrets.
