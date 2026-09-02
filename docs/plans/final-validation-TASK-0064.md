# Plan: Audit-Fidelity Corrections (TASK-0064, INTENT-0001)

Narrow corrective work closing the independent final-validation audit's
actionable findings so shipped code matches ADR-0028 claims and docs match
shipped surface. Plan-first per AGENTS.md Rule 3.

## Audit findings mapped to work items

1. **PARTIAL — policy v2 (ADR-0028 §1)**: `ACKIT_BOUNDARY_TIERS` declares
   `checkpointExport`/`verdictRegistration` (tiers.ts:71-78) but
   `evaluateBoundary` is only invoked for `forceCompletion`
   (task.ts:229). → wire both boundaries into `checkpoint.ts` export paths
   and `verification.ts` record path.
2. **PARTIAL — policy v2 (ADR-0028 §2)**: `checkVerdictAgainstReview` never
   called from the completion gate; `blockingSeverity` never enforced
   (tiers.ts:214-235 has dead `void severities`). → wire into
   `tasks/store.ts` completion gate via the VERDICT_BLOCKING path;
   enforce blockingSeverity; remove dead code.
3. **PASS-with-discrepancy — sdk docs (15a)**: `docs/reference/sdk.md:40-43`
   claims `scoreRepository`/`evaluateRulePack` "not yet exported" — both
   ARE exported (src/index.ts:45,58-61); symbol table stale. → fix doc.
4. **PASS-with-discrepancy — MCP drift fidelity (15b)**:
   `server.ts:369-370` passes `existingArtifacts: ["task", evidence]` and
   empty `referencePathsExist` vs CLI's full resolution (drift.ts:107-169)
   → false MISSING_REQUIRED_ARTIFACT/PLAN_REFERENCE_MISSING from MCP. →
   resolve identical inputs.
5. **PASS-with-coverage-gaps — completion gate (9)**: blocking-drift-only
   and missing-verdict-only denial paths implemented but never singly
   asserted. → add two negative tests.

## Deferred (documented, not silently dropped)

- `workflow:` config keys parsed-but-unwired (audit 1a): wiring
  `resolveProfileRequirements` would change gate semantics mid-validation;
  documented as known limitation + config.md honesty note instead.
- Advance-gate planning-artifact existence vs declaration (audit 1b):
  semantic change for existing state files; follow-up task.
- Checkpoint write atomicity (audit 4): crash-window cosmetic; follow-up.
- Resume/handoff markdown-structure injection nuance (audit residual):
  fence-escaping already prevents breakout; structure-only injection noted
  as future hardening.

## Implementation order

1. Boundary wiring (checkpoint.ts, verification.ts) + policy-v2-cli tests
2. Review-policy gate integration (store.ts, tiers.ts) + completion-gate +
   policy-v2 unit tests
3. Completion-gate negative tests (audit 9)
4. MCP fidelity (server.ts) + conformance test
5. Docs truth (sdk.md, config.md)
6. Full gate matrix; push; CI on exact SHA; verdict re-registration

## Compatibility-preserving design decision (boundaries)

ADR-0028 defaults tier2=ask; the --force precedent treats non-tty ask as
deny. Applying that to exports by default would break every unpolicy'd
repository's export commands. Resolution: boundary enforcement consults the
resolved table; an EXPLICIT layer setting the tier (deny → exit 4; ask →
non-tty deny) enforces; the pure-default table (no explicit layer for that
tier) keeps today's proceed behavior. Asserted on both sides by tests.

## Non-goals

No ADR rewrite (wiring makes ADR true). No gate weakening. No workflow
config-key removal (compat). No Browser Companion. No merge/publish/tag.
