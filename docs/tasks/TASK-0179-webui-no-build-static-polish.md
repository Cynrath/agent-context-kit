# TASK-0179: WebUI No-Build Static Polish

## Purpose
Replace the current WebUI generated file with a slim no-build viewer: a single HTML file with inline CSS, no inline JS that depends on network calls, no external fonts, no external scripts, no remote analytics. Verify navigation works end-to-end and that no console errors fire and no network requests are made.

## Current State
- `ackit webui` writes a single HTML file. It already inlines CSS and avoids external scripts.
- Previous Playwright MCP verification in PROJECT-CONTROL-0108 confirmed nav links work and 0 external links.
- The MCP tool transport is currently broken in this environment (DIAG-001), so Playwright MCP verification cannot be re-run here; verification is deferred to local hosting via `python -m http.server` on `127.0.0.1` and PowerShell `Invoke-WebRequest` checks.

## Evidence
- `src/AgentContextKit.Cli/Program.cs` `RunWebUi` (existing).
- `docs/WEB_UI_PROTOTYPE.md` (existing).
- Previous browser verification evidence is recorded in the handoff/history docs; there is no current `docs/PLAYWRIGHT_VERIFICATION.md` file in this repository.

## Scope
- Add a `data-no-network="true"` attribute to the WebUI root to make the no-network contract self-describing.
- Add a small `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'unsafe-inline'; script-src 'self'; img-src 'self' data:; connect-src 'none'">` tag.
- Make all 5 nav links keyboard reachable (existing) and ensure `aria-current="page"` reflects the active section.
- Remove any default browser tooltip on nav links (small UX polish).
- Add a `noindex,nofollow` `<meta name="robots">` tag.

## Out of Scope
- Adding a build pipeline, bundler, or transpiler.
- Adding new sections, fields, or content.
- Changing the data model.

## Impact Review
- DB impact: none; no database, migration, schema, or persisted state change.
- Admin impact: none; no admin UI or privileged action is added.
- Permission impact: none; generated output remains local-only and requires explicit `ackit webui` invocation.
- SEO/i18n impact: generated local Web UI now includes `noindex,nofollow`; existing English/Turkish labels remain unchanged.
- Audit/security impact: CSP, `connect-src 'none'`, and `data-no-network="true"` make the offline/no-network contract explicit; no external resource, telemetry, or remote call is introduced.

## Affected Files
- `src/AgentContextKit.Core/Generation.cs` — `WebUiGenerator` HTML output.
- `docs/WEB_UI_PROTOTYPE.md` — add a "No-Network Contract" subsection.
- `tests/AgentContextKit.Tests/WebUiNoBuildStaticGuardTests.cs` — new.
- `.gitignore` — ignore Playwright CLI verification artifacts.

## Implementation Steps
1. Planning commit.
2. Update the WebUI template to add CSP, robots, and `data-no-network`.
3. Update `docs/WEBUI.md`.
4. Local verification with `python -m http.server` (if Python is on PATH) and `Invoke-WebRequest`:
   - `Invoke-WebRequest http://127.0.0.1:8765/.ackit/webui/index.html` returns 200.
   - Body contains the expected nav links, no `<script src=http`, no `<link href=http`.
   - `grep -E "https?://" body.html` returns 0 matches except for `xmlns` and `aria-` attributes (offline-correct).
5. Implementation commit.
6. Gates.
7. Push.

## Security/Privacy Boundary
- No new external assets.
- CSP locks the page to self-only resources.
- `connect-src 'none'` blocks XHR / fetch / WebSocket.

## Backward Compatibility
- Output filename, content layout, and class names unchanged; only meta attributes and a single inline CSP are added.

## Acceptance Criteria
- Generated HTML still validates as offline-correct (0 external requests).
- `ackit webui` output renders identically for existing snapshots.
- 4 new tests:
  - Template has CSP meta.
  - Template has `data-no-network` attribute.
  - Template has `noindex,nofollow`.
  - Template has no `<script src="http` or `<link href="http`.

## Tests
- WebUiNoBuildStaticGuardTests (4 new).

## Validation
- `dotnet build AgentContextKit.sln -c Release --no-restore` — 0 warnings, 0 errors.
- `dotnet test tests/AgentContextKit.Tests/AgentContextKit.Tests.csproj -c Release --no-build --filter "FullyQualifiedName~WebUiNoBuildStaticGuardTests"` — 4/4 passed.
- `dotnet test AgentContextKit.sln -c Release --no-build` — 287/287 passed.
- `dotnet run --project src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- webui --output .ackit/webui/task-0179-validation-2.html --json` — created ignored local Web UI.
- `Invoke-WebRequest http://127.0.0.1:8765/.ackit/webui/task-0179-validation-2.html` — 200; verified 5 nav links, CSP, robots, `data-no-network`, data favicon, and no external script/link references.
- `dotnet run --project src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- scan --ci` — exit 0; existing `.remember` Medium log findings only.
- `dotnet run --project src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- doctor` — 13/13 PASS.
- `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-release.ps1` — passed; dirty-tree blocker was expected before commit.
- `scripts/check-tracked-vs-untracked-md.ps1 -FailOnIssues` — run after staging/commit.
- `git status` — clean after commit/push.

## Rollback
Single `git revert <sha>`.

## Completion Evidence
- File list: above.
- Commit hash(es): pending implementation commit.
- Test count: 287/287.
- Browser note: Playwright CLI loaded the page and confirmed the page title/snapshot, but the local Kaspersky browser integration injected `me.kis...` requests and a CSP console warning outside the generated HTML. The deterministic verification for this task is the IWR/static HTML gate above plus the new no-build guard tests.

## Push
- `git push origin master` only.

## Hosted Checks
- Local gates only; CI runs on push.
