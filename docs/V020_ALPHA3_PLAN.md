# v0.2.0-alpha.3 Plan

Decision date: 2026-06-14. Decision owner: `Cynrath`.

## Version Decision
The smallest SemVer-compatible next prerelease is `0.2.0-alpha.3`.

The changes since `v0.2.0-alpha.2` are additive release recovery, hosted evidence, security ownership documentation, and supply-chain automation controls. They do not require a minor-version increment and do not intentionally change the CLI, JSON, SARIF, config, baseline, or package runtime contracts.

This is a scope selection only. Source/package metadata remains `0.2.0-alpha.2` until a dedicated preparation task receives an exact-version and exact-commit GO decision.

## Included Scope
- read-only immutable-release recovery verification;
- refreshed exact alpha.2 supply-chain evidence;
- hardened three-OS release-candidate evidence;
- verified private vulnerability reporting;
- security notification and immutable package-recovery ownership procedures;
- bounded NuGet owner-identity, author-signing, and SBOM dispositions;
- least-privilege GitHub artifact provenance for the exact future release nupkg.

## Excluded Scope
- CLI command, exit-code, config, JSON, baseline, SARIF, or runtime behavior changes;
- dependency expansion;
- author signing without a trusted certificate lifecycle;
- unreviewed SBOM publication;
- retrospective alpha.2 attestation;
- NuGet owner mutation;
- version bump, tag, GitHub Release, or NuGet publication before GO.

## Compatibility
`0.2.0-alpha.3` is planned as compatible with `0.2.0-alpha.2`. Existing command names, package ID, tool command, schema versions, baseline fingerprints, generated-file conventions, and offline-first behavior remain unchanged.

## Publication Decision
Current decision: **NO-GO**.

Open conditions:
1. assign and verify an independent backup security notification owner;
2. verify destructive NuGet recovery authority and backup coverage, or record a dated release-scoped disposition that does not weaken the P0 notification requirement;
3. rerun local gates and the hosted RC workflow on the exact prepared candidate commit;
4. record exact-version and exact-commit GO before changing metadata or dispatching publication.

The provenance control can only produce hosted evidence during a future successful publish. It is not a reason to bypass the pre-publish GO conditions.

## Review
Re-evaluate this scope before metadata is changed, after any runtime behavior change, or by 2026-09-30.
