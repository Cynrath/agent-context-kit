# Published Supply-Chain Status

## TASK-0242 RC1 Partial Immutable State

One-time read-only audit on 2026-07-11 after release run `29131335084`:

| Field | State |
| --- | --- |
| NuGet package | `AgentContextKit 1.0.0-rc.1` accessible |
| Repository signature | Verified (`NuGet.org Repository by Microsoft`) |
| Repository commit | `258918b33c3d1359aac967604ee524e8b66ddf02` |
| NuGet nupkg SHA-256 | `346570f28a738c0f08d0eaa2a3ddb3f4dbcd4121d801530173bb2c40c03d23d5` |
| Global install | PASS; `AgentContextKit 1.0.0-rc.1` |
| Remote `v1.0.0-rc.1` tag | Absent |
| GitHub prerelease/assets | Absent |
| GitHub artifact attestation | Absent |

The OIDC publish step succeeded, then bounded NuGet availability verification timed out. Tag/release/provenance steps were skipped. No second dispatch, rerun, recovery, manual upload, version reuse, tag movement, or force push occurred. The alpha.2 audit below remains historical evidence and must not be relabeled as RC1 provenance.

TASK-0243 through TASK-0245 are now separately authorized to recover this exact immutable package without NuGet publication. The bounded path must use validated artifact `8242162439`, exact nupkg/snupkg hashes, exact release commit `258918b33c3d1359aac967604ee524e8b66ddf02`, one recovery dispatch, two asset attestations, and Windows/Ubuntu/macOS install verification. Until that run fully succeeds, this section remains the authoritative partial-state record.

Future-release decisions derived from this published-state evidence are tracked without closure in `docs/RELEASE_BLOCKER_BOARD.md` and `docs/MAINTAINER_DECISION_REGISTER.md`.

## Audit Scope
Read-only audit performed on 2026-06-13 for:

- NuGet package `AgentContextKit` `0.2.0-alpha.2`;
- GitHub pre-release `v0.2.0-alpha.2`;
- exact NuGet-served and GitHub Release package digests;
- package metadata, signature, archive entries, release assets, and accessible GitHub artifact attestations;
- hosted recovery verification run `27478046088` using automation commit `2f68f14dc3065dd9a810644c75c46316f8c225f0` and immutable release commit `f540479a92cbe66097f6796553828ee49ddd5512`.

This is published-state evidence. It is not approval to sign, republish, change ownership, upload an SBOM/provenance record, or modify immutable release artifacts.

## Package Identity
| Field | Verified value |
| --- | --- |
| Package ID | `AgentContextKit` |
| Version | `0.2.0-alpha.2` |
| Listed | `true` |
| NuGet published | `2026-06-13T15:20:40.63Z` |
| NuGet-served package SHA-256 | `83348398a2e52b5430456a65c3439f4a8b617760ebe1881e970141fcb5375152` |
| Package metadata author | `Cynrath` |
| Repository URL | `https://github.com/Cynrath/agent-context-kit` |
| Repository commit | `f540479a92cbe66097f6796553828ee49ddd5512` |
| License | `MIT` |

The NuGet repository signature reports owner `Cyranth`, while package metadata and the public project persona use `Cynrath`. TASK-0131 records a dated, bounded accepted-risk disposition in `docs/NUGET_OWNER_IDENTITY.md`; no account or package owner list was modified.

## Signature Result
`dotnet nuget verify --all --verbosity detailed` completed successfully for the NuGet-served package.

- Signature type: `Repository`.
- Repository signer: `NuGet.org Repository by Microsoft`.
- Repository certificate SHA-256: `1F4B311D9ACC115C8DC8018B5A49E00FCE6DA8E2855F9F014CA6F34570BC482D`.
- Repository timestamp: `2026-06-13T15:21:07Z`.
- No author signature was observed.

NuGet.org repository signing authenticates the repository/upload surface. It must not be described as AgentContextKit author signing.

## GitHub Release Assets
The pre-release targets exact commit `f540479a92cbe66097f6796553828ee49ddd5512` and was published at `2026-06-13T15:25:49Z`.

| Asset | Size | SHA-256 |
| --- | ---: | --- |
| `AgentContextKit.0.2.0-alpha.2.nupkg` | 165235 bytes | `89291454460de7db003b38719df1d58902ae2e8fcf4b8a07814c3785f64ee264` |
| `AgentContextKit.0.2.0-alpha.2.snupkg` | 40217 bytes | `3982128cae4c4c8b6795de1fb064fc81bb962dc06f66a5891e2340987c8c18e3` |

The NuGet-served nupkg hash differs from the release nupkg hash because NuGet.org repository signing changes the served package bytes. Both hashes are independently verified and must not be treated as an unexpected mutation.

## SBOM And Provenance Result
The NuGet package contains 13 archive entries. No entry name matches SBOM, SPDX, CycloneDX, provenance, in-toto, Sigstore, or attestation conventions. The GitHub Release assets are the nupkg and snupkg only; no SBOM asset is present.

The authenticated GitHub artifact-attestation endpoint returned HTTP 404 for NuGet package digest `83348398a2e52b5430456a65c3439f4a8b617760ebe1881e970141fcb5375152`. Therefore no accessible GitHub artifact attestation was found for this exact repository and digest during the audit.

## Current Decision Boundary
| Area | Verified published state | Follow-up |
| --- | --- | --- |
| NuGet owner identity | Repository signature owner `Cyranth`; project persona/author `Cynrath` | Bounded accepted risk through next pre-release decision or 2026-09-30 |
| Author signing | No author signature observed | TASK-0132 implements only with a trusted certificate; otherwise records dated deferral |
| Repository signing | Valid NuGet.org repository signature | Preserve as repository evidence; never relabel as author signing |
| SBOM | Not present in package or GitHub Release assets | TASK-0132 decides and, if safe, implements exact-artifact generation |
| Provenance | No accessible GitHub attestation for exact NuGet digest | TASK-0132 decides least-privilege GitHub attestation behavior |
| Recovery | Read-only recovery verification is green; ownership/notification disposition remains open | TASK-0130 records primary/backup ownership and recovery authority |

## Reproduction
Use a disposable path outside tracked source and remove downloaded artifacts after inspection:

```powershell
$version = "0.2.0-alpha.2"
$package = Join-Path $env:TEMP "AgentContextKit.$version.nupkg"
Invoke-WebRequest `
  -Uri "https://api.nuget.org/v3-flatcontainer/agentcontextkit/$version/agentcontextkit.$version.nupkg" `
  -OutFile $package
Get-FileHash -Algorithm SHA256 $package
dotnet nuget verify $package --all --verbosity detailed
gh release view v0.2.0-alpha.2 --repo Cynrath/agent-context-kit --json tagName,targetCommitish,isPrerelease,publishedAt,assets,url
gh api repos/Cynrath/agent-context-kit/attestations/sha256:83348398a2e52b5430456a65c3439f4a8b617760ebe1881e970141fcb5375152
Remove-Item $package -Force
```

The attestation query is expected to remain non-zero until an attestation exists for the exact digest.

## Remote Boundary
TASK-0127 performs read-only package, release, signature, digest, metadata, and attestation inspection. It does not sign, publish, attest, upload, edit a release, modify NuGet ownership, unlist/deprecate a package, move a tag, or publish a package.
