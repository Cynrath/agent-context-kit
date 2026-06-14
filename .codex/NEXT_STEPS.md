# Next Steps

PROJECT-CONTROL-0103 closed TASK-0126 through TASK-0134 with an evidence-backed alpha.3 NO-GO. PROJECT-CONTROL-0104 is now active for TASK-0135 through TASK-0138 and continues independent local product, code-quality, test, documentation, and security work.

1. Current published release: `v0.2.0-alpha.2` at exact package commit `f540479a92cbe66097f6796553828ee49ddd5512`.
2. PROJECT-CONTROL-0104 is active; starting commit is `d104e02` (issue template placeholder sync).
3. TASK-0135 issue template version placeholder sync is complete; the four `.github/ISSUE_TEMPLATE/*.yml` files now show `0.2.0-alpha.2` instead of `0.2.0-alpha.1`.
4. TASK-0136 refreshes the active queue, `NEXT_TASKS.md`, and this file to point to PROJECT-CONTROL-0104 as the active control.
5. TASK-0137 extends the scanner rule catalog with `ACKIT006` `ProductionConfigLike` (High) and `ACKIT007` `DocumentationGap` (Medium), narrows the `ACKIT001` and `ACKIT005` descriptions, and updates `docs/SCANNER_RULES.md` plus `CHANGELOG.md`. Tests went from 186 to 187.
6. TASK-0138 adds an issue-template guard test (5 tests) so future drift to `0.2.0-alpha.1` is caught in CI, and refreshes the active queue status. Total tests are now 192.
7. Local validation on 2026-06-14: `dotnet build` clean, 192/192 tests, `ackit scan --ci` and `ackit doctor` clean, local Markdown link gate clean.
8. `0.2.0-alpha.3` remains NO-GO because `RB-003` and `RB-008` are unresolved; no release write is performed.
