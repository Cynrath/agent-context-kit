# V100 Maintainer Decision Packet

## Status

Decision date: 2026-07-10. Maintainer: `Cynrath`. Repository: `Cynrath/agent-context-kit`.

This packet records the maintainer-authorized policy decisions and TASK-0241 final acceptance for V100-02, V100-06, V100-08, and V100-09. Exact candidate `1.0.0-rc.1` passed hosted run `29118452246`; publication remains unauthorized. No tag, GitHub Release, repository/security/collaborator setting, SBOM, attestation, or package recovery action is performed.

## Verified Decision Inputs

- Current published release and exact RC predecessor: immutable `AgentContextKit 0.2.0-alpha.4`; older `0.2.0-alpha.3` evidence remains historical.
- TASK-0239 entry HEAD: `5c1a7782579f1bdc54a0d3706c886108382914cb`.
- Selected candidate: `1.0.0-rc.1`; exact candidate SHA `548b6affd0da25cb379ec1b153b1064fd5ff6f0b`; hosted run `29118452246`.
- Installed tool: `AgentContextKit 0.2.0-alpha.4`.
- Private vulnerability reporting: freshly verified `enabled: true` on 2026-07-10 with `scripts/check-private-vulnerability-reporting.ps1 -RequireEnabled`.
- Primary security triage owner: `Cynrath`.
- Backup security notification owner and backup maintainer contact: `ShadowFlameC`; repository permission freshly verified as `write` on 2026-07-10 through the GitHub collaborator permission endpoint.
- Backup package recovery ownership: recorded by TASK-0202 and `docs/PACKAGE_RECOVERY.md`. No destructive NuGet action was used as a test.
- Author signing and SBOM: dated bounded accepted risks remain in force through the next pre-release review or 2026-09-30.
- Provenance: implemented locally for the next authorized publish path; hosted evidence remains unavailable until that path is executed.

No private contact information, report content, credentials, tokens, recovery material, or private endpoints are stored here.

## V100-02 — CLI And Machine-Readable Contract

### Decision

The current shipped and documented CLI surface is the V100 target contract.

Machine-readable stability includes:

- command and option names and meanings;
- JSON envelope fields and command-specific required fields;
- JSON schemas and their versioning rules;
- command identifiers and machine-readable status tokens;
- scanner rule IDs and config diagnostic IDs;
- exit-code semantics;
- the AgentContextKit SARIF `2.1.0` profile expectations.

Localized human-readable text is not byte-for-byte stable. Localization must not change command/option names, JSON fields, schema/status tokens, rule/diagnostic IDs, paths, severity names, or exit decisions.

### Status

```text
MAINTAINER_DECISION_RECORDED
FINAL_CANDIDATE_CONTRACT_ACCEPTED
CLOSED_BY_TASK_0241
```

The decision and TASK-0241 acceptance bind the target contract to the exact candidate. Any candidate-impacting change reopens the freeze.

## V100-06 — Security Response Ownership

### Decision

- Primary owner: `Cynrath`.
- Backup owner: `ShadowFlameC`.
- Private disclosure channel: GitHub private vulnerability reporting.
- Sensitive vulnerability data must not be placed in public issues.
- The latest published pre-release receives planned security fixes.
- Acknowledgement target: 3 business days.
- Initial triage target: 7 business days.
- These targets are maintainer objectives, not contractual SLAs.

### Fresh Done-Criteria Verification

| Criterion | Evidence | Result |
| --- | --- | --- |
| Primary owner | `docs/SECURITY_NOTIFICATION_OWNERSHIP.md`; repository owner/maintainer | VERIFIED |
| Independent backup owner | TASK-0202 plus fresh GitHub `write` permission check for `ShadowFlameC` on 2026-07-10 | VERIFIED |
| Private channel | Fresh `enabled: true` check on 2026-07-10 | VERIFIED |
| Coverage path | Repository security notifications, private reporting, advisory escalation, and direct maintainer escalation | VERIFIED |
| Non-public sensitive-data rule | `SECURITY.md` and response/handoff docs | VERIFIED |
| Response targets | `docs/SECURITY_RESPONSE_READINESS.md` | VERIFIED |
| Supported security-fix scope | Latest pre-release policy in response/support docs | VERIFIED |
| Review date and non-sensitive reference | This packet, 2026-07-10 | VERIFIED |

### Status

```text
MAINTAINER_DECISION_RECORDED
DONE_CRITERIA_FRESHLY_VERIFIED
CLOSED
```

V100-06 is closed for the current repository state. Reopen it after an owner, notification, disclosure-channel, or support-policy change.

## V100-08 — Runtime And Support Lifecycle

### Decision

- Runtime baseline: .NET 10.
- Tested platforms: Windows, Ubuntu/Linux, and macOS.
- The latest published pre-release receives planned fixes.
- The predecessor remains available for upgrade and rollback evidence.
- Breaking pre-1.0 changes require changelog and migration notes.
- .NET 9 and older are unsupported.
- Hosted/cloud Web UI is unsupported.
- Telemetry and repository upload are unsupported.
- `ackit` does not perform release or publish operations.

### Status

```text
MAINTAINER_DECISION_RECORDED
FINAL_RC_CROSS_PLATFORM_CONFIRMATION_PASS
CLOSED_BY_TASK_0241
```

The policy is approved and exact candidate run `29118452246` passed the supported three-OS matrix.

## V100-09 — Supply Chain And Recovery

### Decision

The minimum V100 supply-chain baseline is:

- OIDC Trusted Publishing only;
- immutable published versions;
- no tag movement;
- no package replacement;
- commit/tag/release alignment;
- package metadata and content inspection;
- digest recording;
- NuGet repository-signature verification;
- GitHub Release asset verification;
- upgrade and rollback evidence;
- an immutable-successor recovery procedure with primary/backup ownership;
- provenance/attestation evidence on the next authorized publish path.

Author signing and SBOM remain documented accepted risks within their current dated scope. They must not be described as implemented. Hosted provenance is required from the next authorized publish path and cannot be fabricated locally or retroactively attached to an immutable release.

### Status

```text
MAINTAINER_DECISION_RECORDED
RECOVERY_OWNERSHIP_RECONCILED
ACCEPTED_RISK_RECORDED_FOR_SIGNING_AND_SBOM
SIGNING_AND_SBOM_ACCEPTED_RISK_ACTIVE
OPEN_PENDING_PUBLISH_PATH_PROVENANCE
```

## Resulting Boundary

- V100-02, V100-06, and V100-08 are closed.
- V100-09 remains open pending publish-path provenance.
- V100-07 and V100-10 are closed by exact candidate evidence and TASK-0241 acceptance as recorded in the gap register.
- Open P0 gaps: 0.
- Decision: `CONDITIONAL GO FOR A SEPARATELY AUTHORIZED PUBLISH TASK`.
- No `1.0.0` GA or published-RC claim is made.

The single authorized RC evidence action completed as TASK-0240 run `29118452246`. Historical TASK-0241 marker: Publication authorized: No. TASK-0242 later published NuGet RC1 through OIDC. The owner-created exact tag now exists, but TASK-0253 run `29345313517` received HTTP 403 at GitHub prerelease creation; prerelease/assets/provenance remain absent and V100-09 remains open.
