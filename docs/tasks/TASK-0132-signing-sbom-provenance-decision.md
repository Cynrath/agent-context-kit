# TASK-0132 Signing SBOM And Provenance Decision

## Purpose
Implement safe SBOM/digest/provenance controls where feasible and record a truthful author-signing decision.

## Current State
NuGet repository signing exists; no verified author signature, published SBOM, or accessible project attestation is recorded for alpha.2.

## Scope
Author-signing feasibility/defer decision, deterministic SBOM generation/privacy review, artifact digest recording, optional GitHub attestation workflow with least privilege, tests and docs.

## Out Of Scope
Generating certificates, fabricating signatures, exposing certificate identity/private material, API keys, or implicit attestation from ordinary CI.

## Affected Files
Supply-chain workflows/scripts/tests/docs, decision/evidence registers, release automation and queue/handoff files.

## Implementation
Defer author signing if no trusted certificate exists; generate a reviewed SBOM; add isolated attestation only if GitHub permissions/tooling support exact artifacts safely.

## Security/Privacy Boundary
No secrets, local paths, private feeds, certificate material, or unreviewed dependency metadata in public artifacts.

## Compatibility
No CLI/package runtime break; release assets may gain additive SBOM/provenance evidence in a future version.

## Acceptance Criteria
Every area has IMPLEMENT/DEFER status, owner, rationale, compensating controls, evidence, and review date; implemented controls pass verification.

## Tests
SBOM schema/content/privacy checks, workflow permission static gate, digest/attestation verification where available.

## Validation
Local generation/parse/hash, hosted workflow if added, and evidence/security gates.

## Rollback
Disable/revert optional workflow or remove unshipped generated artifacts; never falsify prior evidence.

## Completion Evidence
Implemented locally on 2026-06-14. Author signing is deferred with bounded accepted risk because no trusted certificate lifecycle exists. SBOM publication is deferred with bounded accepted risk until deterministic .NET 10 generation, privacy, and lifecycle are validated. Future publish runs now download the exact GitHub Release nupkg, skip duplicate digest attestations, use `actions/attest@v4` only in the publish job, and verify the signer workflow with GitHub CLI. `verify-existing` remains read-only. Static positive/negative tests pass; hosted provenance evidence requires the next actual publish and is not claimed for alpha.2.

## Commit
`security: add supply-chain evidence controls`

## Push
Normal push after validation.

## Hosted Checks
Standard 8/8 plus optional dedicated attestation validation.
