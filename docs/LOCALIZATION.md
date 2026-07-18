# Localization

## Supported Languages
- `en`: English, default.
- `tr`: Turkish.

## Fallback
Unknown language codes fall back to English.

## Architecture
- `LanguageCode` represents the selected language.
- `ITextProvider` returns CLI text.
- `TemplateCatalog` stores generated document templates.
- `TemplateRenderer` replaces structured placeholders.

## Rules
- Keep public API names in English.
- Keep Turkish output natural and technical.
- Do not scatter CLI strings across command code when a shared text/template path is practical.

## Turkish CLI Output
Human-readable Turkish CLI output may include UTF-8 Turkish characters such as `ö`, `ı`, and `ğ`.

Examples:
- `Tarama özeti`
- `oluşturuldu`
- `var olan atlandı`
- `Sağlık kontrolleri`
- `Risk bulgusu yok.`

JSON output keeps stable English field names and schema values regardless of `--lang`.

On Windows, use a UTF-8-capable terminal profile if Turkish characters render incorrectly. The CLI should not downgrade Turkish text to ASCII fallback wording.

## Parity Contract
Every command that advertises `--lang en|tr` is covered by the localization parity matrix. Equivalent English and Turkish invocations must preserve:

- the same exit code;
- the same command signature and option names;
- the same security visibility and Critical/High decisions;
- the same generated repository-relative paths and overwrite behavior;
- the same JSON schema and machine-readable semantics.

Human-readable headings, labels, summaries, yes/no values, generated-file statuses, and known argument errors may be localized. Stack names, severity enum names, scanner rule IDs, configuration diagnostic codes, file paths, and Core diagnostic/finding messages remain stable technical values.

`ackit optimize` follows the same boundary. Console headings, metric labels, review warnings, report/proposal generated-file status, and known format/output/proposal argument errors have English/Turkish parity. The proposal document itself is a technical English review artifact. `ACKITOPT` IDs, severity/category tokens, fingerprints, paths, normalized evidence/remediation, proposal mappings/metrics, JSON fields, SARIF fields, and process exit decisions remain language-independent.

JSON field names, command names, status tokens, rule IDs, diagnostic codes, and exit codes remain language-independent. JSON and SARIF must not gain translated aliases or language-specific values.

## Release Gate
Run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-localization-parity.ps1 -FailOnIssues
```

The gate verifies all 14 JSON-capable commands are represented, runs focused English/Turkish human/error/JSON tests, smokes Turkish help, and parses Turkish-mode JSON. Generated templates remain a separate content surface; this gate does not require a resource framework or rewrite every template.
