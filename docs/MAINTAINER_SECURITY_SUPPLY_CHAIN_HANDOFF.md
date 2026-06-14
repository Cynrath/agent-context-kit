# Maintainer Security And Supply-Chain Handoff

Use `docs/RELEASE_BLOCKER_BOARD.md` for current P0/P1 visibility and `docs/MAINTAINER_DECISION_REGISTER.md` to record explicit decisions. No board row is currently implicit approval.

## Boundary
This is a maintainer procedure. PROJECT-CONTROL-0103 explicitly authorized private-reporting enablement and related security work; certificate/credential handling, fake signing evidence, API-key publishing, and unrelated remote changes remain prohibited.

Use `docs/SECURITY_SUPPLY_CHAIN_EVIDENCE.md` as the single evidence register. Keep records metadata-only.

The published `0.2.0-alpha.1` starting state is recorded in `docs/PUBLISHED_SUPPLY_CHAIN_STATUS.md`: valid NuGet.org repository signature, no observed author signature, no package/release SBOM, no accessible GitHub package attestation, and a public owner-profile mismatch (`Cyranth` versus `Cynrath`).

## 1. Private Vulnerability Reporting
Verified status on 2026-06-14: `enabled: true`. The public Security page exposes the private report entry point. See `docs/PRIVATE_VULNERABILITY_REPORTING_STATUS.md`.

1. Recheck the setting with the read-only script before a future RC.
2. Confirm the public repository security surface still offers a private report path. Do not submit a fake or sensitive report merely to test the UI.
3. Confirm and record primary and backup security notification owners under TASK-0130.
4. Do not publish a private email address unless intentionally selected and protected.

Read-only verification:

```powershell
gh api -H "Accept: application/vnd.github+json" -H "X-GitHub-Api-Version: 2026-03-10" repos/Cynrath/agent-context-kit/private-vulnerability-reporting
```

The setting blocker is closed. Do not treat it as complete operational readiness until primary and backup notification owners are recorded.

## 2. Final-Candidate Dependency Review
Run on the exact candidate commit:

```powershell
dotnet restore AgentContextKit.sln
dotnet list AgentContextKit.sln package --vulnerable --include-transitive
dotnet list AgentContextKit.sln package --deprecated --include-transitive
```

Record the candidate commit, date, reachable package sources, and result. A network/source failure is incomplete evidence, not a clean result.

## 3. NuGet Signing Decision
Before choosing sign/defer, resolve or explicitly accept the NuGet owner-profile identity mismatch. Package metadata and the project persona use `Cynrath`; the current public NuGet owner profile is `Cyranth`.

Choose one path:

### Sign
- Use a controlled certificate lifecycle and timestamp service following Microsoft guidance: <https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-nuget-sign>.
- Keep certificate material and private identifiers outside the repository.
- Verify the signed package before publish and record only non-sensitive certificate identity metadata, package digest, verification result, owner, and recovery/rotation procedure.

### Defer
- Record `Package signing decision: DEFER`.
- Add an `ACCEPTED RISK` entry with owner, reason, affected release scope, compensating controls, and next review date.
- Do not describe the package as author-signed. NuGet repository signing must not be presented as equivalent to a project author-signing decision.

## 4. SBOM Decision
Choose one path:

### Publish
- Prefer an SPDX-compatible SBOM tied to the exact candidate commit. GitHub's dependency graph can export an SPDX SBOM: <https://docs.github.com/code-security/supply-chain-security/understanding-your-software-supply-chain/exporting-a-software-bill-of-materials-for-your-repository>.
- Review the file for local paths, private package sources, unexpected dependencies, or sensitive metadata.
- Record format/version, generation method, candidate commit, digest, publication location, date, and owner.

### Defer
- Record `SBOM decision: DEFER` with owner, reason, release scope, compensating dependency review, and next review date.

Do not commit generated SBOM files unless a dedicated task defines the public artifact path, format, privacy review, and release lifecycle.

## 5. Provenance Decision
Choose one path:

### Attest
- Use a dedicated release workflow, not ordinary CI, and review GitHub's artifact attestation requirements: <https://docs.github.com/actions/security-for-github-actions/using-artifact-attestations/using-artifact-attestations-to-establish-provenance-for-builds>.
- Grant only the documented read-only contents permission plus write access for the OpenID Connect identity token and attestations to the attestation job.
- Record workflow/run URL, candidate commit, subject digest, verification command/result, publication location, date, and owner.

### Defer
- Record `Provenance decision: DEFER` with owner, reason, release scope, compensating package hash/content review, and next review date.

## 6. Bad-Package Recovery Acceptance
The project procedure is accepted in `docs/PACKAGE_RECOVERY.md`. `Cynrath` owns the decision, but the public NuGet owner identity is `Cyranth`; TASK-0131 must verify or disposition execution authority. No backup recovery owner is assigned.

The accepted procedure must:

- stop recommending the affected version;
- preserve immutable published package content;
- unlist or deprecate through maintainer-controlled NuGet actions when appropriate;
- publish a fixed successor version;
- update GitHub Release/install/security guidance;
- record impact, remediation commit, package/tag actions, and post-incident review.

Do not execute an unlist/deprecate action merely to test access.

## 7. Final Evidence Check
Run locally:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-security-supply-chain-evidence.ps1 -FailOnIssues
powershell -ExecutionPolicy Bypass -File scripts/check-published-supply-chain-status.ps1 -FailOnIssues
```

The local gate proves the evidence structure and pending/verified distinctions exist. It cannot prove GitHub settings, certificate custody, signing, SBOM publication, or provenance attestations. Those require maintainer evidence in the register.
