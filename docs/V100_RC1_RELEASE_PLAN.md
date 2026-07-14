# AgentContextKit 1.0.0-rc.1 Release Plan

## Status

Prepared by TASK-0239 and accepted by TASK-0241. TASK-0242 consumed its publish dispatch and left a partial immutable state. The owner later created exact tag `v1.0.0-rc.1`. TASK-0252 adapted recovery to verify that tag without mutation and passed standard CI. TASK-0253 consumed one exact recovery dispatch in run `29345313517`; GitHub Release creation returned HTTP 403, leaving prerelease/assets/attestations absent. TASK-0254 was not executed.

| Field | Value |
| --- | --- |
| Candidate version | `1.0.0-rc.1` |
| Exact owner-created tag | `v1.0.0-rc.1` at `258918b33c3d1359aac967604ee524e8b66ddf02` |
| Published predecessor | `0.2.0-alpha.4` |
| Current published release | `0.2.0-alpha.4` |
| Candidate commit | Source candidate `548b6affd0da25cb379ec1b153b1064fd5ff6f0b`; later bridge commits are docs/evidence/governance-only |
| Publication status | Partial immutable state: NuGet and exact tag exist; GitHub prerelease/assets/provenance absent; TASK-0253 dispatch consumed after release creation HTTP 403 |
| Release body | Publication-ready `docs/RELEASE_BODY_V100_RC1.md` |

## Version Availability

Read-only checks on 2026-07-10 found no `v1.0.0-rc.1` remote tag, no matching GitHub Release, and no `AgentContextKit 1.0.0-rc.1` NuGet version. These checks did not reserve, tag, release, or publish the version.

## Candidate Commit Rule

The TASK-0239 commit is the exact source/workflow/test/package-metadata candidate. It must be pushed to `master`, equal `origin/master`, and pass `ci`, `cross-platform-smoke`, and `cross-platform-source-smoke` before the single authorized hosted RC dispatch.

After hosted evidence starts, TASK-0240 and TASK-0241 may change documentation, evidence, and governance files only. Any source, test, script, workflow, package/version metadata, schema, or behavioral fixture change creates a new candidate SHA and invalidates earlier hosted evidence.

## Scope

- Freeze the existing CLI commands/options, exit behavior, config schema `1`, baseline schema `1`, JSON schema `2`, SARIF `2.1.0`, stable identifiers, generated-file conventions, localization technical tokens, and offline-first safety boundary.
- Validate exact published predecessor `0.2.0-alpha.4` config generation and upgrade behavior.
- Validate build/tests, local package metadata/content, symbols, isolated install, help/version, scan/config/baseline/SARIF behavior, localization, and resource thresholds.
- Record primary/backup security and recovery ownership plus bounded signing/SBOM decisions without changing remote ownership or settings.

## Compatibility Promise

- Package ID remains `AgentContextKit`; tool command remains `ackit`.
- Existing command/option meanings and exit decisions remain unchanged.
- Config remains schema `1` and is never auto-migrated or rewritten by diagnostics.
- Baseline fingerprints keep `sha256-rule-path-location-occurrence-v1`.
- JSON schema `2` and SARIF `2.1.0` remain compatible; new fields may be additive only.
- English/Turkish human text may differ, but commands, options, JSON fields/status tokens, paths, severities, rule/diagnostic IDs, and exit decisions remain language-independent.
- Existing generated files remain skip-by-default.

## Open Risks

- Hosted three-OS exact-candidate evidence completed in TASK-0240 run `29118452246`.
- Final candidate acceptance and gap reconciliation completed in TASK-0241.
- TASK-0255 created and fully verified the exact GitHub prerelease/body/nupkg/snupkg without NuGet or tag mutation. V100-09 remains open only for both attestations and TASK-0256 Windows/Ubuntu/macOS installed-package proof.
- Author signing and SBOM publication remain bounded accepted risks through their recorded review boundary.
- `1.0.0` GA readiness is not claimed.

## Rollback Plan

Before publication, correct the source with a normal successor commit and rerun candidate evidence; never rewrite history. After any future publication, never overwrite or reuse `1.0.0-rc.1`: deprecate/unlist only under the recovery procedure when justified and publish a fixed successor version. Restore the reviewed alpha4 config/baseline backup and reinstall `0.2.0-alpha.4` for rollback.

## Publish Prerequisites

1. TASK-0239 exact candidate local validation and standard CI pass.
2. TASK-0240 exact-SHA Windows/Ubuntu/macOS hosted RC evidence passes once.
3. TASK-0241 closes all P0 gaps and all target non-provenance P1 gaps, records the V100-09 boundary, and final standard CI passes.
4. Local/remote HEAD are synchronized and the tree is clean.
5. A separate explicit TASK-0242 authorization is received.
6. Publication uses only the existing OIDC `release.yml` path and exact synchronized TASK-0242 publication HEAD for both automation/release inputs; its bridge from the hosted source candidate must remain docs/evidence/governance-only.

## Post-Publish Validation

TASK-0242 verified NuGet availability, repository signature/commit, digest, and global install after its partial failure. TASK-0243 implemented exact-package recovery. TASK-0244/TASK-0247/TASK-0250/TASK-0253 preserve their distinct failures. New full authorization enabled TASK-0255 to diagnose the Actions integration 403 and use authenticated ADMIN local `gh` to create exact release `353913024`. The exact body, target, prerelease state, only two asset IDs, sizes, API digests, and downloaded hashes passed; NuGet/tag/settings remained unchanged. TASK-0256 now owns attestation-only provenance and three-platform proof. Do not republish NuGet, reuse/rebuild assets, mutate the tag/release assets, change settings/PAT/secrets, force push, or rewrite history.

## TASK-0239 Evidence

Evidence date: 2026-07-10.

| Area | Result |
| --- | --- |
| Dependency vulnerability review | PASS; NuGet.org and local SDK sources available; no vulnerable direct/transitive package in CLI, Core, or Tests |
| Dependency deprecation review | PASS; no deprecated package in CLI, Core, or Tests |
| Restore/build/test | PASS; 0 warnings, 0 errors, 431/431 tests |
| Windows Unicode temp guard | PASS; 0 unexpected root directories before and after tests |
| Package identity/metadata | `AgentContextKit` `1.0.0-rc.1`; repository URL/type, MIT license, and `README.nuget.md` verified |
| Candidate nupkg | 12 entries, 218366 bytes, disposable SHA-256 `9085be5587c3a6aa33ea362b2d763be36d4c42b6e6b6d7e399adc523efe9c23f` |
| Candidate snupkg | 6 entries with PDBs, 50077 bytes, disposable SHA-256 `85c72268bdb98218779d50cb41aeb880bf2aa4eaa10ba6e335fa0845db9af84d` |
| Package hygiene | PASS; no generated `.ackit/`, `bin`, `obj`, artifact, `.env`, local repo/user path, or credential marker entry/content |
| Isolated install/version/help | PASS; `AgentContextKit 1.0.0-rc.1`; required commands present |
| Predecessor-to-candidate smoke | PASS from installed `0.2.0-alpha.4`; config valid, migration false, hash unchanged, baseline entry count 0, SARIF parsed, final scan passed |
| Contract/readiness gates | PASS; V100, docs/release, CLI, config, JSON, localization, security/supply-chain, RC workflow/input, and RC local-readiness |
| RC-gate resource benchmark | PASS; 2,000 mixed files, 5.691 seconds, 45.1 MiB; thresholds 30 seconds and 512 MiB |
| Standalone resource benchmark | PASS; 2,000 mixed files, 4.193 seconds, 44.6 MiB; thresholds 30 seconds and 512 MiB |
| Markdown link audit | PASS; 428 Markdown files, 231 local targets, no broken targets |

The nupkg/snupkg were generated and removed in a disposable local path. Their hashes are local candidate-validation evidence, not future published-artifact digests. Exact candidate standard-CI evidence is recorded after the TASK-0239 commit is pushed.

## Publication Prohibition

TASK-0239, TASK-0240, and TASK-0241 must not publish NuGet, dispatch `release.yml`, create or move `v1.0.0-rc.1`, create/edit a GitHub Release, upload artifacts/SARIF, or claim provenance. The next boundary is `TASK-0242: Authorized 1.0.0-rc.1 OIDC publication and provenance verification`, which requires a separate explicit prompt.
