# TASK-0179: WebUI No-Build Static Polish

## Purpose
Replace the current WebUI generated file with a slim no-build viewer: a single HTML file with inline CSS, no inline JS that depends on network calls, no external fonts, no external scripts, no remote analytics. Verify navigation works end-to-end and that no console errors fire and no network requests are made.

## Current State
- `ackit webui` writes a single HTML file. It already inlines CSS and avoids external scripts.
- Previous Playwright MCP verification in PROJECT-CONTROL-0108 confirmed nav links work and 0 external links.
- The MCP tool transport is currently broken in this environment (DIAG-001), so Playwright MCP verification cannot be re-run here; verification is deferred to local hosting via `python -m http.server` on `127.0.0.1` and PowerShell `Invoke-WebRequest` checks.

## Evidence
- `src/AgentContextKit.Cli/Program.cs` `RunWebUi` (existing).
- `docs/WEBUI.md` (existing).
- `docs/PLAYWRIGHT_VERIFICATION.md` (existing).

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

## Affected Files
- `src/AgentContextKit.Core/Templates.cs` — `WebUi` template (or whatever the current key is; check first).
- `docs/WEBUI.md` — add a "No-Network Contract" subsection.

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
- `dotnet build` — 0 errors.
- `dotnet test` — 286+ / 0 / 0.
- `ackit scan --ci` — exit 0.
- `ackit doctor` — 14/14 PASS.
- `scripts/verify-release.ps1` — pass.
- `scripts/check-tracked-vs-untracked-md.ps1 -FailOnIssues` — clean.
- `git status` — clean.

## Rollback
Single `git revert <sha>`.

## Completion Evidence
- File list: above.
- Commit hash(es): planning + implementation.
- Test count: 286+.

## Push
- `git push origin master` only.

## Hosted Checks
- Local gates only; CI runs on push.
