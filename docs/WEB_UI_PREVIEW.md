# Web UI Preview

AgentContextKit can generate an offline static Web UI for local repository review.

## What It Shows
The Web UI dashboard shows readiness score, stack signals, health checks, findings, generated context files, and task previews.

## Local-Only Behavior
The Web UI is generated as a local HTML file. It starts no server, uses no external assets, and makes no remote calls.

Generate a preview:

```powershell
ackit webui --output .ackit/webui/demo.html
```

The published NuGet `0.2.0-alpha.3` global tool supports `ackit webui` and `ackit sarif`.

## Public Preview Asset
A sanitized Web UI dashboard screenshot is committed at `docs/assets/screenshots/ackit-webui-preview-alpha4.webp`. It was captured from a disposable synthetic demo repository, cropped to the dashboard region, and stripped of metadata. See `docs/SCREENSHOT_CAPTURE_PLAN.md` and `docs/VISUAL_ASSETS.md` for the capture and review process.

## Public Artifact Rule
Generated Web UI HTML can include local repository paths and local audit context. Keep it local and do not publish it as a GitHub Release asset, NuGet package asset, or committed docs file.

## Safe Screenshot Workflow
1. Generate the local Web UI under `.ackit/webui/`.
2. Use a disposable synthetic demo repository; do not use a private or customer repository.
3. Open it locally and capture only the UI region needed for documentation.
4. Remove or crop any local path, private username, machine name, customer/client data, and raw finding match.
5. Exclude browser chrome and local file URLs, strip image metadata, and reopen the export for inspection.
6. Save only a sanitized, small PNG or WebP under `docs/assets/screenshots/`.
7. Review the image using `docs/SCREENSHOT_CAPTURE_PLAN.md` and `docs/VISUAL_ASSETS.md`.

## Screenshot Checklist
- No absolute path.
- No private username.
- No secret, token, password, or personal email.
- No customer/client data.
- No local machine name.
- No raw finding match.
- No generated `.ackit` HTML committed.

## Completed
- First sanitized Web UI dashboard screenshot captured via TASK-0229 and committed as `docs/assets/screenshots/ackit-webui-preview-alpha4.webp`.
- README.md and README.tr.md updated with the screenshot reference.
- Visual asset checklist passed: no absolute path, private username, secret, machine name, raw finding match, browser chrome, or local file URL.
- Image metadata stripped (zero EXIF, zero private fields).

## Future Plan
- Consider an optional short GIF demo later if it stays small and sanitized.
- Consider docs-site activation for hosted documentation pages.
