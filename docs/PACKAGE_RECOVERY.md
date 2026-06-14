# Package Recovery Procedure

## Purpose
Define immutable-package recovery for a compromised, vulnerable, or materially broken AgentContextKit release.

## Ownership
- Decision owner: `Cynrath`, project/release maintainer.
- NuGet publication authority: verified by successful alpha.2 OIDC Trusted Publishing under configured user `Cyranth`.
- NuGet unlist/deprecate/account-recovery authority: unverified and intentionally not tested destructively.
- Backup recovery owner: not assigned.

The procedure is accepted for project operations, but a future candidate remains NO-GO until destructive recovery authority and backup coverage have an owned disposition.

## Activation Threshold
Recovery may be activated for:
- a confirmed exploitable security issue;
- leaked credentials or malicious/incorrect package content;
- a package that cannot perform its documented primary install/startup flow;
- a critical privacy regression that exposes raw secrets or repository content;
- a provenance or integrity mismatch between package, tag, release, and recorded commit.

Minor documentation defects or non-blocking usability issues use a normal successor release, not emergency unlisting.

## Procedure
1. Stop recommending the affected version in active documentation.
2. Verify package ID/version, digest, tag target, release assets, and affected behavior without changing immutable package content.
3. Decide whether to deprecate or unlist the affected NuGet version through the verified package owner account.
4. Prepare a fixed successor version; never overwrite or reuse the published version.
5. Run local gates, exact-commit hosted checks, OIDC-only publication, install smoke, and post-publish validation.
6. Update GitHub Release, README install guidance, security guidance, and support status with factual impact/remediation information.
7. Record incident dates, affected/fixed versions, remediation commit, package/tag/release actions, and follow-up ownership without private report content.

## Communication
- Security-sensitive details remain in the private advisory until coordinated disclosure.
- Public communication names affected/fixed versions and mitigation, but omits reporter identity, raw secrets, private source, and exploit details that increase risk before remediation.
- NuGet deprecation guidance points to the fixed successor.

## Tabletop Result
Documentation review on 2026-06-14 confirmed the procedure preserves immutable package history, requires a new successor version, and separates decision authority from credential custody. No package state was changed. Execution authority and backup ownership remain open evidence.

## Review Cadence
Review before each release candidate and after any owner, publishing, recovery, or security-notification change.
