# Machine-Readable Contract Assets

These local assets support release-candidate compatibility review:

- `ackit-command-output-v2.schema.json`: Draft 2020-12 top-level contract for every JSON-capable CLI command.
- `ackit-baseline-v1.schema.json`: baseline manifest schema `1` and fingerprint algorithm contract.
- `ackit-sarif-profile-v1.schema.json`: AgentContextKit privacy/tool profile layered on SARIF `2.1.0`.

Golden fixtures live under `tests/fixtures/contracts/`. They are sanitized examples, not generated release artifacts.

Compatibility rules:

- command output schema `2` allows additive properties;
- removing/renaming fields or changing field types/semantics requires a schema increment and migration notes;
- baseline schema/fingerprint changes require a new identifier and compatibility fixture;
- the SARIF profile does not replace the official complete SARIF schema;
- fixtures must not contain real secrets, absolute local paths, private user/machine data, or raw finding matches.

TASK-0235 includes this catalog in the V100 conditional local contract freeze against source-impacting evidence base `b1604ae1e73017521d28e5a83f328bb1347406b6`. This is local preparation, not final-candidate acceptance or publication approval.

Validate locally:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-json-contract-assets.ps1 -FailOnIssues
```
