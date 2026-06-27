# TASK-0229: public presentation screenshot asset and Web UI preview

## Purpose

Advance V100-12 by producing one public-safe, sanitized Web UI dashboard screenshot from a disposable synthetic demo repository and wiring it into public documentation.

## Scope

- Create a disposable synthetic .NET console demo repository.
- Generate `ackit webui`, `ackit generate`, `ackit task` output for a rich dashboard.
- Capture a 1440x900 viewport screenshot via Playwright Chromium (headless).
- Sanitize by removing the absolute-path `<p>` from the generated HTML before capture.
- Crop to the dashboard area (1400x1166 final).
- Convert to WebP, strip all metadata.
- Verify privacy checklist: no absolute path, private username, machine name, secret, raw finding, browser chrome, local file URL.
- Commit image to `docs/assets/screenshots/ackit-webui-preview-alpha4.webp`.
- Update README.md and README.tr.md with the screenshot reference.
- Update WEB_UI_PREVIEW.md, SCREENSHOT_CAPTURE_PLAN.md, V100_GAP_ANALYSIS.md, ISSUE_BACKLOG.md.
- Add `.ackit-demo/` to `.gitignore` and clean up the demo directory.

## Out of scope

- Feature implementation or code changes.
- Package metadata, version bump, tag, GitHub Release, or NuGet mutation.
- GitHub issue creation.
- GitHub Pages or docs-site activation (remains deferred).
- Animated GIF/video capture (remains deferred).
- Claiming full V100-12 closure or 1.0 readiness.

## Affected files

- `.gitignore` (add `.ackit-demo/`)
- `docs/assets/screenshots/ackit-webui-preview-alpha4.webp` (new)
- `README.md` (add screenshot)
- `README.tr.md` (add screenshot)
- `docs/WEB_UI_PREVIEW.md` (add public preview path)
- `docs/SCREENSHOT_CAPTURE_PLAN.md` (update status)
- `docs/V100_GAP_ANALYSIS.md` (update V100-12 evidence)
- `docs/ISSUE_BACKLOG.md` (mark issue 5 completed)
- `.codex/SESSION_HANDOFF.md`, `.codex/CONTEXT_PACK.md`, `.codex/NEXT_STEPS.md` (current task)
- `docs/NEXT_TASKS.md` (current task)

## Data/database impact

None.

## Security impact

Sanitized screenshot contains no private data, secrets, paths, or metadata. Privacy review passed.

## Permission/auth impact

None.

## Localization impact

README.tr.md updated with Turkish screenshot reference and alt text.

## UX impact

README and README.tr now show a visual Web UI preview instead of a placeholder text.

## Logging/audit impact

None.

## Acceptance criteria

1. Sanitized Web UI dashboard screenshot committed under `docs/assets/screenshots/`.
2. README.md and README.tr.md reference the screenshot.
3. Generated `.ackit/` output is not committed.
4. Demo directory is cleaned up and gitignored.
5. Privacy checklist passes: no absolute path, username, machine name, secret, raw finding, browser chrome, local file URL, or metadata.
6. V100-12 is advanced with exact evidence.
7. Working tree clean.
8. All validations pass.

## Screenshot evidence

- **Source repo**: Disposable synthetic .NET console app in `%TEMP%`, then copied to `.ackit-demo/` under project root (gitignored, cleaned up).
- **Commands run**: `ackit init`, `ackit scan --ci`, `ackit generate --target all --lang en`, `ackit task "Review AI handoff readiness" --lang en`, `ackit webui`.
- **Capture method**: Playwright Chromium headless at 1440x900 viewport, fullPage screenshot, cropped to 1400x1166.
- **Sanitization**: Removed `<p>` containing absolute temp path from HTML before capture.
- **Metadata stripping**: Saved as WebP via Python Pillow with `method=6`; zero EXIF; only standard WebP frame/background headers.
- **Final asset**: `docs/assets/screenshots/ackit-webui-preview-alpha4.webp`, 1400x1166 pixels, 40.8 KB.

## Privacy checklist result

| Check | Status |
| --- | --- |
| No absolute path visible | PASS |
| No private username visible | PASS |
| No secret, token, password, or personal email | PASS |
| No customer/client data | PASS |
| No local machine name | PASS |
| No raw finding match | PASS |
| Image cropped to useful UI area | PASS (dashboard + health + findings) |
| File size < 400 KB | PASS (40.8 KB) |
| No browser chrome, local file URL, shell prompts | PASS (headless capture) |
| Image metadata stripped | PASS (zero EXIF, only WebP frame/background) |

## Test steps

1. `ackit --version` -> AgentContextKit 0.2.0-alpha.4
2. `ackit doctor` -> all PASS
3. `ackit scan --ci` -> exit 0
4. `dotnet build -c Release --no-restore` -> 0 warnings, 0 errors
5. `dotnet test -c Release --no-build` -> 428/428 green
6. `git diff --check` -> clean
7. `check-tracked-vs-untracked-md.ps1` -> pass
8. `check-local-markdown-links.ps1 -FailOnIssues` -> pass
9. `check-localization-parity.ps1` -> pass
10. Windows Unicode temp guard -> PASS
11. `Get-Item docs/assets/screenshots/*` -> webp exists and clean
12. `git ls-files .ackit` -> empty (no `.ackit/` committed)

## Risks

- Screenshot tooling blocked: mitigated by using already-available Playwright Chromium.
- Private data in screenshot: mitigated by sanitizing HTML before capture, cropping, and privacy checklist.

## Rollback plan

`git revert HEAD` if any asset fails review. The screenshot is a new file; removal is clean.

## Completion notes

TASK-0229 completed successfully. First public-facing sanitized screenshot of the Web UI dashboard committed. V100-12 advanced (screenshot asset done; docs-site remains deferred). Recommended next task: **TASK-0230: V100 local contract and readiness gate rerun against alpha4** -- the next highest-value local-only gap reduction that does not require maintainer input.
