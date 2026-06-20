# Web UI Prototype

AgentContextKit can generate an offline static Web UI prototype from local scan results.

## Command
Default output:

```powershell
ackit webui
```

The default path is:

```text
.ackit/webui/index.html
```

Custom repository-relative output:

```powershell
ackit webui --output .ackit/webui/current.html
ackit webui --output docs/local-webui.html --json
ackit webui --output .ackit/webui/baseline.html --baseline .ackit-baseline.json
```

## Included Views
- Scan result dashboard with readiness score, review status, severity breakdown, and recommended checks.
- Repository health summary.
- Stack signals.
- Risk finding browser with deterministic review queue, finding ID, optional match, and recommended action.
- Generated agent/context file preview with expected file category, status, size, and capped preview text.
- Latest task file preview with task ID, title, inferred status, size, path, and capped preview text.

## Safety Behavior
- The Web UI is a local static HTML file.
- No local server is started.
- No external CSS, JavaScript, fonts, images, CDNs, telemetry, or remote calls are used.
- Repository-controlled text is HTML-encoded.
- Missing expected generated files are shown as local audit hints only; the Web UI does not create them.
- Existing Web UI files are skipped by default.
- Output paths must stay inside the repository.
- `.ackit/webui/` is ignored by git and by the default scan config.
- Generated Web UI files can include local repository paths and local audit context. Keep them local; do not attach them to public GitHub Releases or NuGet packages.
- Baseline mode adds existing/new dashboard metrics and a Baseline column in the finding browser; all findings remain visible.

## No-Network Contract
Generated Web UI files are no-build, single-file HTML artifacts. They include inline CSS, a self-only Content Security Policy, `connect-src 'none'`, `data-no-network="true"` on the document body, `noindex,nofollow` robots metadata, and a `data:` favicon to avoid browser default `/favicon.ico` fetches. The generated page must not reference external scripts, stylesheets, fonts, analytics, or remote API endpoints.

## JSON Output
`ackit webui --json` returns generated file metadata and a risk summary:

```json
{
  "schemaVersion": 2,
  "toolVersion": "0.2.0-alpha.3",
  "command": "webui",
  "webUi": {
    "path": ".ackit/webui/index.html",
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
The Web UI prototype is for local review. It does not approve public release, publish packages, push commits, create release tags, replace release blocker checks, or start a hosted application. Treat generated Web UI files as local-only artifacts, not public release artifacts.

For public README preview guidance and screenshot sanitization rules, see `docs/WEB_UI_PREVIEW.md` and `docs/VISUAL_ASSETS.md`.
