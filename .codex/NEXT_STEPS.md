# Next Steps

PROJECT-CONTROL-0107 closed TASK-0159 through TASK-0167 with 257/257 tests green. PROJECT-CONTROL-0108 is now active for TASK-0168 through TASK-0176 and continues independent local product, code-quality, test, documentation, and security work.

1. Current published release: `v0.2.0-alpha.2` at exact package commit `f540479a92cbe66097f6796553828ee49ddd5512`.
2. PROJECT-CONTROL-0108 planning commit `08442c0` is the active entry point; TASK-0168 through TASK-0176 are queued.
3. PROJECT-CONTROL-0107 closed TASK-0159 through TASK-0167: post-0158 audit and state sync; scanner severity guidance polish; actionable config-check examples; baseline diff documentation and tests; SARIF rule metadata completeness; offline report accessibility polish; prompt pack and context export redaction hardening; sample gallery coverage expansion; final validation and hosted check sync.
4. TASK-0160 added a "User Action Per Severity" table to `docs/SCANNER_RULES.md` and a cross-reference from `docs/SECURITY_MODEL.md`, guarded by `ScannerSeverityGuidanceGuardTests`.
5. TASK-0161 added two new example config files (`with-warning.yml`, `with-error.yml`) and `ActionableConfigCheckExamplesGuardTests`.
6. TASK-0162 added a baseline diff cross-reference from `docs/GITHUB_ACTIONS_USAGE.md` and `docs/JSON_OUTPUT.md`, plus `BaselineSeverityEscalationRegressionTests`.
7. TASK-0163 added `SarifRuleIdAlignmentGuardTests` that asserts the SARIF rule catalog matches the Core `RiskRuleCatalog` exactly.
8. TASK-0164 added `ReportHtmlAccessibilityGuardTests` that asserts the generated HTML carries a `lang` attribute, an `<h1>`, and a `<main>` landmark, and is still offline-only.
9. TASK-0165 added `PromptPackRedactionFreshMarkerTests` with a fresh synthetic marker for the prompt pack and the explicit-approve context export.
10. TASK-0166 added `SampleGalleryFindingCountGuardTests` that asserts each safe sample stays within a documented finding count bound and produces no Critical findings.
11. Local validation on 2026-06-15: `dotnet build` clean, 257/257 tests green, `ackit scan --ci` and `ackit doctor` clean, sample smoke clean, local Markdown link gate clean (229 targets), tracked-vs-untracked guard clean, `check-public-release-gates`, `check-release-workflow`, `check-cli-contract`, `check-config-generated-conventions`, `check-json-contract-assets`, `check-localization-parity`, `check-package-metadata`, and `check-private-vulnerability-reporting` all green.
12. Hosted evidence: every pushed commit on the current branch passed the standard 3/3 (CI, cross-platform smoke, cross-platform source smoke).
13. `0.2.0-alpha.3` remains NO-GO because `RB-003` and `RB-008` are unresolved; no release write is performed.
