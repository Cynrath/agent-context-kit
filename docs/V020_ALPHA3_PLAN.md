# v0.2.0-alpha.3 Plan

Decision date: 2026-06-14. Decision owner: `Cynrath`.

## Version Decision
The smallest SemVer-compatible next prerelease is `0.2.0-alpha.3`.

The changes since `v0.2.0-alpha.2` are additive release recovery, hosted evidence, security ownership documentation, and supply-chain automation controls. They do not require a minor-version increment and do not intentionally change the CLI, JSON, SARIF, config, baseline, or package runtime contracts.

This began as a scope selection only. TASK-0203 prepared source/package metadata as `0.2.0-alpha.3` for local validation. TASK-0205 records hosted RC run `27868539971` as green for exact commit `beaa14deed3dbc55ac98d216679f9a9799261801` and records exact-candidate GO for a later publish task only. Tag creation, GitHub Release creation, NuGet publication, and release workflow dispatch remain pending until a separate authorized publish task.

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
Current decision: **GO for a later publish task only; publication not performed.**

Satisfied conditions:
1. independent backup security notification owner is recorded by TASK-0202;
2. backup package recovery coverage is recorded by TASK-0202;
3. local package validation and install smoke are recorded by TASK-0203;
4. hosted RC workflow passed on the exact candidate commit in run `27868539971`;
5. exact-version and exact-commit GO is recorded by TASK-0205 for a later publish task.

Remaining publish boundary:
1. decide whether the publish task uses hosted RC evidence commit `beaa14deed3dbc55ac98d216679f9a9799261801` or a later docs-only HEAD under the release workflow exact-commit policy;
2. if using a later docs-only HEAD, prove package/source metadata remains unchanged from the hosted RC evidence commit or record a new hosted RC run;
3. dispatch the release workflow only from a separate explicit publish task.

The provenance control can only produce hosted evidence during a future successful publish. It is not a reason to bypass the pre-publish GO conditions.

## Review
Re-evaluate this scope before metadata is changed, after any runtime behavior change, or by 2026-09-30.
