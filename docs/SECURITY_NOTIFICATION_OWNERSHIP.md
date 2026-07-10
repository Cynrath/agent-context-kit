# Security Notification Ownership

## Current Assignment
Status date: 2026-06-20.

| Role | Assignment | Verification | Status |
| --- | --- | --- | --- |
| Primary security triage owner | `Cynrath`, repository owner/maintainer | Authenticated repository administration and private-reporting enablement | ASSIGNED |
| Backup security triage owner | `ShadowFlameC`, independent backup security notification owner / backup maintainer contact | Maintainer-provided evidence dated 2026-06-20 records `ShadowFlameC` as repository `write` collaborator for `Cynrath/agent-context-kit` | ASSIGNED |
| Private disclosure channel | GitHub private vulnerability reporting | GET returned `enabled: true`; public Security page exposes report entry | VERIFIED |
| Notification coverage | GitHub repository security notifications, private vulnerability reporting, future security advisory escalation, direct maintainer escalation | Maintainer-provided evidence records primary/backup coverage without storing private endpoints or advisory content | COVERED |

No private email address, reporter identity, advisory content, notification endpoint, or authentication data is stored here.

## Primary Responsibilities
- acknowledge and triage private reports against the targets in `docs/SECURITY_RESPONSE_READINESS.md`;
- preserve report confidentiality and avoid copying private report content into issues, commits, CI logs, or public task files;
- coordinate remediation, release actions, and disclosure timing;
- invoke package recovery only through `docs/PACKAGE_RECOVERY.md`;
- keep backup/recovery coverage current before release-candidate decisions.

## Escalation
1. Primary owner reviews the private report and records only metadata needed for response tracking.
2. Critical credential exposure or active exploitation is escalated immediately to package/repository access holders.
3. If the primary owner is unavailable, `ShadowFlameC` is the backup maintainer contact for notification coverage and escalation.
4. Public disclosure waits for a fix or mitigation when practical.

## Completion Boundary
Private reporting is enabled and TASK-0202 records independent backup notification coverage. `RB-003` is closed for planned `0.2.0-alpha.3` release-preparation entry. A fake advisory must not be created solely to test notification delivery.

## TASK-0232 V100-06 Reverification

On 2026-07-10, private reporting was freshly rechecked as `enabled: true`, and `ShadowFlameC` repository permission was freshly read as `write`. Together with the recorded primary/backup coverage path, public-sensitive-data prohibition, latest-pre-release security-fix scope, and 3/7-business-day non-SLA response targets, the exact V100-06 done criteria are satisfied. Status: `MAINTAINER_DECISION_RECORDED`, `DONE_CRITERIA_FRESHLY_VERIFIED`, `CLOSED`.

Reopen V100-06 after an owner, notification, disclosure-channel, or support-policy change. Do not create a fake advisory or store private contact/report data for reverification.

## TASK-0201 Closure Preflight

2026-06-20 TASK-0201 preflight result: `RB-003` remained open/partial before TASK-0202 maintainer evidence.

Found evidence:
- primary security triage owner: `Cynrath`;
- private disclosure channel: GitHub private vulnerability reporting, previously verified enabled;
- existing review status date: 2026-06-14.

Missing closure evidence:
- second verified human backup security triage owner or role;
- non-secret notification coverage path covering primary and backup review;
- non-secret notification coverage evidence;
- review date for the completed primary/backup coverage record;
- effective release scope for the completed ownership record.

Maintainer handoff checklist:
- record the backup owner or role without storing private contact details;
- record how security notifications reach the primary and backup coverage path without storing private endpoints or advisory content;
- update `docs/RELEASE_BLOCKER_BOARD.md` and `docs/MAINTAINER_DECISION_REGISTER.md` with the same evidence and review scope;
- only then consider closing `RB-003`.

## TASK-0202 Maintainer Evidence Intake

2026-06-20 result: `RB-003` is closed for planned `0.2.0-alpha.3` release-preparation entry.

Maintainer-provided evidence from `Cynrath`:
- repository: `Cynrath/agent-context-kit`;
- primary owner: `Cynrath`;
- backup user: `ShadowFlameC`;
- repository permission: `write` collaborator;
- purpose: independent backup security notification owner and backup maintainer contact;
- coverage: repository security notifications, private vulnerability reporting, future security advisory escalation, direct maintainer escalation;
- release approval role: not mandatory reviewer; backup/recovery coverage only.

No private contact detail, advisory content, notification endpoint, credential, API key, token, or recovery secret is recorded. No security advisory, security setting mutation, branch ruleset mutation, repository secret creation, owner removal, workflow dispatch, tag, GitHub Release, NuGet publish, or package action occurred.
