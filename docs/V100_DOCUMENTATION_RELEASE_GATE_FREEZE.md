# v1.0 Documentation And Release Gate Freeze

This page records the v1.0 target documentation and release gate freeze. It validates local readiness documentation only; it does not approve public release.

This is a historical asset freeze, not evidence that 1.0 GA criteria are complete. See `docs/V100_GAP_ANALYSIS.md` for current blockers.

## Freeze Scope
The v1.0 documentation freeze covers:
- CLI contract and command reference.
- Config and generated-file conventions.
- JSON output and exit code docs.
- Version readiness docs from v0.2 through v1.0 final local readiness.
- Public release blockers, public release audit, package metadata review, and public release gate orchestration.
- Maintainer-only release handoff.

## Release-Critical Docs
These docs must remain present and linked from `docs/DOCUMENTATION_INDEX.md`:

```text
docs/CLI_CONTRACT.md
docs/CLI_REFERENCE.md
docs/CONFIGURATION.md
docs/CONFIG_GENERATED_CONVENTIONS.md
docs/JSON_OUTPUT.md
docs/EXIT_CODES.md
docs/V020_READINESS.md
docs/V030_READINESS.md
docs/V040_READINESS.md
docs/V050_READINESS.md
docs/V100_STABILIZATION_PLAN.md
docs/V100_DOCUMENTATION_RELEASE_GATE_FREEZE.md
docs/V100_READINESS.md
docs/V100_GAP_ANALYSIS.md
docs/PUBLISHED_SUPPLY_CHAIN_STATUS.md
docs/RELEASE_VALIDATION.md
docs/RELEASE_BLOCKERS.md
docs/PUBLIC_RELEASE_AUDIT.md
docs/PUBLIC_RELEASE_GATES.md
docs/NUGET_METADATA.md
docs/MAINTAINER_RELEASE_HANDOFF.md
docs/PACKAGING.md
docs/RELEASE_CHECKLIST.md
docs/RELEASE_CANDIDATE_0.1.0-alpha.1.md
```

## Release Gate Scripts
These local scripts must remain present and documented from release validation:

```text
scripts/check-cli-contract.ps1
scripts/check-config-generated-conventions.ps1
scripts/check-v020-readiness.ps1
scripts/check-v030-readiness.ps1
scripts/check-v040-readiness.ps1
scripts/check-v050-readiness.ps1
scripts/check-v100-documentation-release-gates.ps1
scripts/check-v100-readiness.ps1
scripts/check-published-supply-chain-status.ps1
scripts/check-package-metadata.ps1
scripts/audit-public-release.ps1
scripts/check-release-blockers.ps1
scripts/check-public-release-gates.ps1
scripts/check-release-workflow.ps1
scripts/test-existing-package-recovery.ps1
scripts/verify-existing-package-recovery.ps1
scripts/verify-release.ps1
```

## Public Release Blockers
GitHub source publication, GitHub Release creation, NuGet publication, and global install verification for `v0.2.0-alpha.1` are complete. There are no active blockers for that already-published pre-release. Future package releases and 1.0 GA remain separate maintainer decisions after local product gaps close.

Failing public gates should pass locally when package metadata is final, tracked artifact checks are clean, and the release tag exists locally. Remote tag verification, GitHub Release status, and NuGet package availability remain external checks.

## Local Freeze Validation
Run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-v100-documentation-release-gates.ps1
```

Run as a failing local gate:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-v100-documentation-release-gates.ps1 -FailOnIssues
```

Then run the full local release verification:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/verify-release.ps1
```

## Safety Boundary
The documentation/release gate freeze does not:
- Push commits.
- Create or push tags.
- Create remotes.
- Publish NuGet packages.
- Upload repository content.
- Call LLM providers.
- Read, store, generate, or validate API keys.
- Redact or delete files.

Follow `docs/MAINTAINER_RELEASE_HANDOFF.md` only after explicit maintainer approval.
