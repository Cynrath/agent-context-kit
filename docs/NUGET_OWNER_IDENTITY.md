# NuGet Owner Identity Disposition

## Verified State
Status date: 2026-06-14.

- Package: `AgentContextKit` `0.2.0-alpha.2`.
- Public NuGet owner/signature identity: `Cyranth`.
- Package author, company, repository owner, and public project persona: `Cynrath`.
- Alpha.2 publication through GitHub OIDC Trusted Publishing succeeded with the NuGet login user configured as `Cyranth`.

Public evidence does not prove that the two account names belong to the same human, and this repository does not store private account-recovery data.

## Disposition
**ACCEPTED RISK through the next pre-release decision or 2026-09-30, whichever occurs first.**

The package remains under the existing `Cyranth` NuGet owner identity. Package metadata continues to use the public project persona `Cynrath`. No owner transfer, account rename, or package metadata rewrite is attempted in this task.

## Rationale
- Existing OIDC Trusted Publishing succeeded without an API key and proves the configured GitHub workflow can publish the package under the current NuGet owner boundary.
- Package metadata and repository URLs consistently identify the public project as `Cynrath/agent-context-kit`.
- Changing package ownership without interactive account verification could disrupt publishing or recovery access.
- The visible spelling difference is operationally confusing but does not alter package ID, repository URL, artifact digest, or installed command identity.

## Compensating Controls
- OIDC Trusted Publishing only; no persistent NuGet API key.
- Exact commit/version validation before publication.
- Repository/package metadata and package digest verification.
- Immutable-version recovery through a fixed successor.
- Recheck the public owner identity and OIDC publication boundary before the next release candidate.

## Remaining Boundary
Successful publication does not prove that unlist/deprecate/account-recovery actions are available to the current GitHub session. Those destructive/account actions are not tested. `RB-008` remains partial until recovery execution authority and backup ownership are verified.

