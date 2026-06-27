# Screenshot Capture Plan

Status: capture plan approved; first dashboard asset committed. `docs/assets/screenshots/ackit-webui-preview-alpha4.webp` captured via TASK-0229 from a synthetic demo repository. Remaining candidates (report overview, scan terminal) are deferred until future tasks.

## Goal
Add useful README and documentation previews later without publishing local paths, private repository data, raw scanner matches, or generated local HTML.

## Capture Candidates
Capture in this order so the first asset has the highest documentation value:

| Priority | Proposed file | View | Purpose |
| --- | --- | --- | --- |
| 1 | `docs/assets/screenshots/webui-dashboard.webp` | Cropped Web UI dashboard | Show readiness score, stacks, health, and finding counts. |
| 2 | `docs/assets/screenshots/report-overview.webp` | Cropped HTML report summary | Show the offline report layout and severity summary. |
| 3 | `docs/assets/screenshots/scan-terminal.png` | Cropped terminal output | Show a clean `ackit scan --ci` result only if it adds value beyond command examples. |

Do not capture finding detail rows, repository headers that expose paths, browser address bars, shell prompts with user profiles, or generated file previews containing machine-specific content.

## Safe Demo Source
Use a disposable repository containing only synthetic data. Do not use a customer, employer, private, or personal project.

Recommended preparation:

```powershell
$demoRoot = Join-Path $env:TEMP "ackit-public-demo"
New-Item -ItemType Directory -Path $demoRoot -Force | Out-Null
Push-Location $demoRoot
dotnet new console -n DemoApp
Set-Location DemoApp
git init
ackit init --lang en
ackit generate --target all --lang en
ackit task "Review repository readiness" --lang en
ackit report --output .ackit/reports/demo.html
ackit webui --output .ackit/webui/demo.html
Pop-Location
```

The temporary path is still private display data. Crop it completely from the final image. Generated HTML remains local-only and must not be copied into `docs/`.

## Capture Procedure
1. Open the generated HTML locally with network access disabled when practical.
2. Use a viewport near 1440 by 900 so the layout is readable without excessive scaling.
3. Capture only the useful content region; exclude browser chrome and local file URLs.
4. Crop before annotation. Do not blur a secret or path when it can be removed by cropping.
5. If redaction is unavoidable, replace the region with an opaque solid block and re-export the image. Do not use translucent blur.
6. Export as WebP for dashboard/report views or PNG when text clarity is materially better.
7. Strip image metadata during export and reopen the final file to inspect it at 100 percent zoom.
8. Keep the final width at or below 1400 pixels and target 400 KB or less per image.
9. Use lowercase kebab-case filenames and descriptive English alt text.

## Sanitization Review
Reject the asset if any item is visible or recoverable:

- Absolute or user-profile path.
- Browser address bar or local-file URL.
- User name, machine name, private repository name, or organization name.
- Customer/client data or personal email address.
- Secret, token, password, environment value, or raw finding match.
- Shell history, unrelated window content, notification, or system tray detail.
- Image metadata containing author, software profile, location, or local path data.

The reviewer should compare the final asset against `docs/VISUAL_ASSETS.md`, inspect the image outside the editor, and confirm that the corresponding `.ackit` HTML is not staged.

## Commit Review
Before an asset commit:

```powershell
git status --short
git diff --cached --name-only
git ls-files docs/assets/screenshots
git ls-files | rg -n "\.(html|sarif|nupkg|snupkg|zip|rar|7z)$"
```

Only reviewed PNG/WebP assets and documentation links should be staged. Generated HTML, SARIF, packages, archives, and `.ackit/` content must remain untracked or ignored.

## README Placement
Add the first approved dashboard image under the existing Preview section. Use equivalent, factual alt text in `README.md` and `README.tr.md`. Keep the current text-only preview until the image passes the review above.

## Refresh Policy
- Re-capture only when the visible UI changes materially.
- Record the source release or commit in the asset pull request or task notes, not in the image.
- Remove stale images rather than keeping screenshots that contradict current command behavior.
- Animated GIF/video remains deferred until a static image proves insufficient.
