# TASK-0232: V100 maintainer decision packet and source-of-truth reconciliation

## Purpose

Record the maintainer-authorized V100 policy decisions for V100-02, V100-06, V100-08, and V100-09 in one reviewable packet, reconcile stale security/recovery records, and correct current CLI/package references without rewriting historical evidence.

## Verified starting state

- Starting HEAD and `origin/master`: `23534f83ce29d068145c91723015c0d655401326`.
- Branch: `master`; working tree was clean before task-chain creation.
- Published release: `AgentContextKit 0.2.0-alpha.4`; predecessor: `0.2.0-alpha.3`.
- `ackit --version`: `0.2.0-alpha.4`; doctor: 13/13 PASS; `scan --ci`: exit 0.
- GitHub read-only verification: no open PRs/issues; `ShadowFlameC` has repository `write` permission.
- TASK-0202 already records `ShadowFlameC` as backup security notification and package recovery owner, but several current documents still describe those roles as missing.
- `docs/CLI_CONTRACT.md`, `docs/CLI_REFERENCE.md`, and `docs/JSON_OUTPUT.md` contain current-facing alpha3 references that must be alpha4 while historical alpha2/alpha3 evidence stays unchanged.

## Dependencies

- TASK-0231 is complete and recommends this task.
- The authorized decision text in the current Codex goal is maintainer input for this task.
- Historical TASK-0127, TASK-0132, TASK-0202, TASK-0219, and TASK-0220 evidence must remain attributable to its original release scope.

## Scope

- Add `docs/V100_MAINTAINER_DECISION_PACKET.md` with exact decisions and status tokens for V100-02, V100-06, V100-08, and V100-09.
- Reconcile security notification ownership, recovery ownership, private reporting, support lifecycle, decision register, blocker board, and supply-chain handoff/evidence records.
- Close V100-06 only after its done criteria are freshly verified from current repository and read-only GitHub evidence.
- Keep V100-02, V100-08, and V100-09 open where final-candidate or hosted evidence is still pending.
- Correct current-facing CLI/package references from alpha3 to alpha4 while preserving explicitly historical alpha2/alpha3 sections.
- Register the complete TASK-0232 through TASK-0238 chain in the planning and handoff sources.

## Out of scope

- Version or package metadata changes.
- Workflow dispatch/rerun, tag, GitHub Release, NuGet publication, signing, SBOM publication, or attestation creation.
- GitHub security/collaborator/settings changes or destructive package recovery.
- Final-candidate acceptance, hosted RC evidence, or a 1.0 readiness claim.

## Planned files

- `docs/V100_MAINTAINER_DECISION_PACKET.md`
- `docs/V100_GAP_ANALYSIS.md`
- `docs/CLI_CONTRACT.md`
- `docs/CLI_REFERENCE.md`
- `docs/JSON_OUTPUT.md`
- `docs/SECURITY_RESPONSE_READINESS.md`
- `docs/SECURITY_SUPPLY_CHAIN_EVIDENCE.md`
- `docs/MAINTAINER_SECURITY_SUPPLY_CHAIN_HANDOFF.md`
- `docs/SUPPORT_LIFECYCLE.md`
- `docs/PACKAGE_RECOVERY.md`
- `docs/RELEASE_BLOCKER_BOARD.md`
- `docs/MAINTAINER_DECISION_REGISTER.md`
- `docs/NEXT_TASKS.md`
- `docs/PROJECT_EXECUTION_QUEUE.md`
- `.codex/SESSION_HANDOFF.md`
- `.codex/CONTEXT_PACK.md`
- `.codex/NEXT_STEPS.md`

## Implementation steps

1. Add the decision packet with machine-readable status tokens and evidence boundaries.
2. Re-read current owner/private-reporting evidence and close V100-06 only if every done criterion is present.
3. Replace stale current-state owner/recovery statements with the TASK-0202/current GitHub truth while retaining historical sections.
4. Correct only current-facing alpha3 CLI/package references; label historical evidence explicitly.
5. Update V100 and active planning/handoff sources to make TASK-0232 current and TASK-0233 next.
6. Run focused documentation, contract, security, ACKit, and hygiene gates.

## Data/database impact

None. The repository has no database, migrations, or runtime persistence in scope.

## Admin impact

None. No admin UI or administrative setting changes.

## Security impact

Positive documentation impact: ownership and disclosure boundaries become consistent. No private contact, advisory content, credential, token, recovery secret, or private endpoint may be recorded.

## Permission/auth impact

No permission mutation. Read-only collaborator evidence is recorded without changing access.

## SEO/i18n impact

No public marketing claim or localized runtime text change. Technical tokens and English/Turkish CLI behavior remain unchanged.

## Logging/audit impact

The decision register and packet provide a metadata-only audit trail. No remote event or sensitive incident data is created.

## Acceptance criteria

1. All four authorized decisions are recorded exactly with their required status tokens.
2. V100-06 is closed only with current evidence for primary, backup, disclosure channel, coverage, targets, and review date.
3. V100-02, V100-08, and V100-09 remain open for their stated final-candidate/hosted evidence.
4. Current CLI/package notes use alpha4; historical alpha2/alpha3 evidence remains intact.
5. No stale current-state document says the backup owner/recovery role is unassigned.
6. The full TASK-0232–0238 chain is registered before implementation continues.
7. Focused gates pass and one local commit contains this task only.

## Validation commands

```powershell
ackit doctor
ackit scan --ci
powershell -ExecutionPolicy Bypass -File scripts/check-cli-contract.ps1 -FailOnIssues
powershell -ExecutionPolicy Bypass -File scripts/check-security-supply-chain-evidence.ps1 -FailOnIssues
powershell -ExecutionPolicy Bypass -File scripts/check-published-supply-chain-status.ps1 -FailOnIssues
powershell -ExecutionPolicy Bypass -File scripts/check-v100-readiness.ps1 -FailOnIssues
powershell -ExecutionPolicy Bypass -File scripts/check-tracked-vs-untracked-md.ps1 -FailOnIssues
powershell -ExecutionPolicy Bypass -File scripts/check-local-markdown-links.ps1 -FailOnIssues
git diff --check
```

## Risks

- Erasing historical truth while fixing current state. Mitigation: edit only current-facing statements and retain dated historical sections.
- Overclaiming V100 closure. Mitigation: use exact open/closed tokens and preserve hosted/final-candidate boundaries.
- Recording sensitive ownership data. Mitigation: metadata-only names/roles and public permission status.

## Rollback plan

Revert the TASK-0232 commit. No remote state, package, tag, workflow, or runtime data rollback is required.

## Completion-state requirements

- Task file records actual validation evidence and commit.
- Planning/handoff sources identify TASK-0233 as next.
- Working tree contains no unrelated or generated `.ackit/` changes.

## Completion notes

Completed on 2026-07-10.

- Added `docs/V100_MAINTAINER_DECISION_PACKET.md` with the exact V100-02, V100-06, V100-08, and V100-09 policies/status tokens.
- Fresh read-only verification passed: private reporting `enabled: true`; `ShadowFlameC` repository permission `write`.
- Closed V100-06 from exact current evidence. V100-02, V100-08, and V100-09 remain open at their final-candidate/hosted boundaries.
- Reconciled current security notification and package recovery ownership while preserving dated historical pre-TASK-0202 records.
- Corrected current CLI/JSON/architecture package references to `0.2.0-alpha.4`; alpha3 remains the immutable predecessor.
- Registered and fully planned TASK-0232 through TASK-0238 before implementation continued.
- Focused validation passed: ACKit doctor 13/13, `scan --ci` exit 0, CLI contract gate, security/supply-chain gate, published supply-chain gate, V100 readiness gate, local Markdown links (422 files / 231 targets), and `git diff --check`.
- No version, package, tag, GitHub Release, workflow, setting, owner, advisory, recovery, or generated `.ackit/` mutation occurred.

Commit: `c194c91`. The next task is TASK-0233.
