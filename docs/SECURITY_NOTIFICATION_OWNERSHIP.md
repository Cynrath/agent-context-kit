# Security Notification Ownership

## Current Assignment
Status date: 2026-06-14.

| Role | Assignment | Verification | Status |
| --- | --- | --- | --- |
| Primary security triage owner | `Cynrath`, repository owner/maintainer | Authenticated repository administration and private-reporting enablement | ASSIGNED |
| Backup security triage owner | Not assigned | No second verified human maintainer is available in repository evidence | BLOCKER |
| Private disclosure channel | GitHub private vulnerability reporting | GET returned `enabled: true`; public Security page exposes report entry | VERIFIED |
| Notification delivery | GitHub repository security notifications | No test advisory was created; delivery to an external mailbox/device was not inspected | UNVERIFIED |

No private email address, reporter identity, advisory content, notification endpoint, or authentication data is stored here.

## Primary Responsibilities
- acknowledge and triage private reports against the targets in `docs/SECURITY_RESPONSE_READINESS.md`;
- preserve report confidentiality and avoid copying private report content into issues, commits, CI logs, or public task files;
- coordinate remediation, release actions, and disclosure timing;
- invoke package recovery only through `docs/PACKAGE_RECOVERY.md`;
- assign a verified backup owner before a future release-candidate GO decision.

## Escalation
1. Primary owner reviews the private report and records only metadata needed for response tracking.
2. Critical credential exposure or active exploitation is escalated immediately to package/repository access holders.
3. If the primary owner is unavailable, release/security actions pause because no backup is currently assigned.
4. Public disclosure waits for a fix or mitigation when practical.

## Completion Boundary
Private reporting is enabled, but `RB-003` remains open until a second verified human owner and notification coverage are recorded. A fake advisory must not be created solely to test notification delivery.

