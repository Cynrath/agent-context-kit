# HTML Reports

AgentContextKit can generate an offline static HTML report from local scan results.

## Command
Default output:

```powershell
ackit report
```

The default report path is:

```text
.ackit/reports/scan-report.html
```

Custom repository-relative output:

```powershell
ackit report --output docs/local-scan-report.html
ackit report --output .ackit/reports/current.html --json
ackit report --output .ackit/reports/baseline.html --baseline .ackit-baseline.json
```

## Safety Behavior
- The report is self-contained.
- No external CSS, JavaScript, fonts, images, CDNs, telemetry, or remote calls are used.
- Repository content shown in the report is HTML-encoded.
- Existing report files are skipped by default.
- Output paths must stay inside the repository.
- `.ackit/reports/` is ignored by git.
- Generated reports can include local repository paths and local audit context. Keep them local; do not attach them to public GitHub Releases or NuGet packages.
- Baseline mode adds existing/new metrics and a per-finding status column; it does not hide existing findings.

## JSON Output
`ackit report --json` returns generated file metadata and a risk summary:

```json
{
  "schemaVersion": 2,
  "toolVersion": "0.2.0-alpha.3",
  "command": "report",
  "report": {
    "path": ".ackit/reports/scan-report.html",
    "status": "Created",
    "created": true
  },
  "riskSummary": {
    "total": 0,
    "critical": 0,
    "high": 0,
    "medium": 0,
    "low": 0,
    "info": 0
  }
}
```

When `--baseline` is supplied, JSON also includes the shared sanitize-only baseline summary and classified finding identities documented in [JSON_OUTPUT.md](JSON_OUTPUT.md).

## Review Notes
HTML reports are local artifacts for review. They do not approve public release, publish packages, push commits, create release tags, or replace release blocker checks. Treat generated reports as local-only artifacts, not public release artifacts.

If report screenshots are later used in README or docs, sanitize them first using `docs/VISUAL_ASSETS.md`. Do not commit generated report HTML.

## Accessibility
The generated HTML report includes a `lang` attribute on the root element, an `<h1>` heading, and a `<main>` landmark so screen readers and keyboard navigation receive a sensible document outline. A focused guard test asserts these landmarks stay present.
