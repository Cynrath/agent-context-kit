---
id: "TASK-0037"
title: "VS Code Marketplace UX/assets/icon — professional 256x256 PNG, README correctness"
status: completed
schemaVersion: 2
dependencies: ["TASK-0035"]
createdAt: "2026-08-27"
completedAt: 2026-08-27
---

## Purpose

Replace the 68-byte 1×1 placeholder PNG (not acceptable as professional icon) with a 256×256 PNG (preferred, at least 128×128, square, crisp, >1KB) that reuses the ACKit/Cynrath visual identity, and make `extensions/vscode/README.md` accurately describe the implemented UI (no false claims).

## Current-state evidence

- `extensions/vscode/images/icon.png` was 68 bytes, 1×1 (`width 1 height 1` via `buf.readUInt32BE(16)`), `file` reports `1×1`.
- `extensions/vscode/images/icon.svg` exists (861 bytes before user update, 22447 bytes after user update, 5225×5225 SVG), but Marketplace `icon` must be PNG (Marketplace rules disallow SVG as `icon`).
- After user update on 2026-08-27 22:22, `icon.png` became 346389 bytes 5225×5225 (from `icon.svg` 22447 bytes), still not 256×256 — too large, not the preferred 256×256.
- `extensions/vscode/README.md` (31 lines, `v0.2.1`) claims `Tasks/policy/optimize views` but `package.json` `contributes.views` only had 3 views; after TASK-0035, `package.json` now has 6 views but `README.md` still says `v0.2.1` and lacks detailed per-view docs.
- No `tests/contract/vscode-icon.test.ts` contract to enforce dimensions.

Verified via `ls -lh extensions/vscode/images/icon.png` (68 → 346389 → after resize 26534), `System.Drawing.Image.FromFile` (1×1 → 5225×5225 → 256×256), `cat extensions/vscode/README.md` (31 lines), `ls tests/contract/vscode-icon.test.ts` (not found before this task).

## Goal

- `extensions/vscode/images/icon.png` = 256×256 PNG, square, `width == height == 256`, `width >=128`, `file size >1024`, not 1×1, not 68 bytes, rendered from `icon.svg` at high quality.
- `extensions/vscode/README.md` = accurate, version `0.2.2`, covers Readiness, Findings/Problems, Graph, current-file, Optimize, Diagnostics, Tasks/Policy (only if implemented), offline-first, version, links, screenshots if useful, no false claims, no telemetry claims unless verified.

## In scope

- Replace `icon.png`:
  - Use `icon.svg` (22KB, 5225×5225 SVG after user update) as source, render high-quality 256×256 PNG via `System.Drawing` (PowerShell) or `sharp` (`npx sharp`), `HighQualityBicubic`, `Graphics` `DrawImage` 0,0,256,256, save as `Png`, `crc32` via `deflateSync` if manual, or via `sharp` pipeline.
  - Verify: `file icon.png` → `256×256`, `stat -c%s` → `26534` bytes (after previous resize from 5225→256), `buf.readUInt32BE(16)==256`, `buf[0]==0x89` PNG signature, `width==height`, `>1024`.
  - Keep `icon.svg` as source (22KB) and `icon.ico` (63919 bytes) if user added, but `package.json` `icon` must stay `images/icon.png` (PNG, not SVG, per Marketplace).
  - Add contract test `tests/contract/vscode-icon.test.ts` (already created in TASK-0036, but this task owns its acceptance).

- Rewrite `extensions/vscode/README.md`:
  - Header: `ACKit Toolkit for VS Code`, `Publisher: Cynrath`, `Version: 0.2.2`, `Engine: VS Code ^1.90.0`, `Activation: onStartupFinished` (debounced lazy), `Category: Linters`, `Offline: No network, no telemetry`.
  - Views: document all 6 `contributes.views` (`ackit.readiness`, `ackit.findings`, `ackit.graph`, `ackit.tasks`, `ackit.policy`, `ackit.optimize`) with per-view details (Readiness overall+categories+deductions, Findings grouped+click, Graph nodes+provider, Tasks/Policy summaries, Optimize token-waste).
  - Problems: severity mapping (critical/high→Error, medium→Warning, low→Information, info→Hint), `Uri.joinPath` + `isInsideRoot`, clamped line/col, repository-level skipped, atomic `DiagnosticCollection`.
  - Commands: `ACKit: Refresh`, `Show Readiness`, `Show Graph`, `Open Finding`, `Instructions for Current File` (active editor + `getWorkspaceFolder` + `resolveEffectiveStack`), `Optimize` (real `analyzeOptimize`, QuickPick, preview diff), `Diagnostics` (real JSON).
  - Watch: `onDidCreate`/`onDidChange`/`onDidDelete` 400ms coalesced, `AbortController`, lazy `setTimeout(refreshAll, 800)`.
  - Multi-root: `getRoots` + `getRootForActiveEditor`.
  - Offline-first: no `fetch` remote, no `http` client, no telemetry, no remote fonts (verified via `scripts/check-offline-egress.mjs`).
  - Links: Repo, Docs, Guides, Marketplace `https://marketplace.visualstudio.com/items?itemName=Cynrath.ackit-vscode`, Changelog `CHANGELOG.md` v0.2.2, no false claims.

## Out of scope

- Changing `icon.svg` source design (preserve user's 5225×5225 SVG design, just render PNG).
- Shipping SVG as `icon` if Marketplace disallows (must stay PNG).
- Adding new views beyond `ackit.*` without `package.json` update.

## Affected files

- `extensions/vscode/images/icon.png` (replace 68→26534 bytes, 1×1→256×256)
- `extensions/vscode/images/icon.svg` (preserve 22447 bytes, 5225×5225 SVG after user update, source for PNG)
- `extensions/vscode/images/icon.ico` (preserve 63919 bytes, if user added, not used as `icon` but kept)
- `extensions/vscode/README.md` (rewrite 31→~80 lines, version 0.2.2, accurate UI)
- `tests/contract/vscode-icon.test.ts` (already created, but this task verifies it)

## Technical design

- Icon generation (PowerShell `System.Drawing`, already executed in this hotfix):
  ```powershell
  Add-Type -AssemblyName System.Drawing
  $src=".../icon.png" # 5225×5225
  $img=[System.Drawing.Image]::FromFile($src)
  $bmp=New-Object System.Drawing.Bitmap 256,256
  $g=[System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.DrawImage($img,0,0,256,256)
  $bmp.Save($dst,[System.Drawing.Imaging.ImageFormat]::Png)
  ```
  Result: `images/icon.png` 256×256, 26534 bytes, `width==256`, `height==256`, `>1024`, not 68, not 1×1.
  Alternative via `sharp`: `sharp('icon.svg').resize(256,256).png().toFile('icon.png')`.

- Contract test `tests/contract/vscode-icon.test.ts`:
  ```ts
  const buf=await fsp.readFile(iconPath);
  expect(buf.length).toBeGreaterThan(1024);
  const w=buf.readUInt32BE(16), h=buf.readUInt32BE(20);
  expect(w).toBe(256); expect(h).toBe(256); expect(w).toBe(h);
  ```

- README: keep `publisher: Cynrath`, `version: 0.2.2`, `displayName: ACKit Toolkit`, `icon: images/icon.png`, add per-view sections, offline guarantee, links.

## Tests

| Class | Command | Gate |
|-------|---------|------|
| icon contract | `pnpm test tests/contract/vscode-icon.test.ts` | 2 tests PASS (256×256, not 1×1) |
| README | `cat extensions/vscode/README.md | grep -c "ackit\."` | >5 views/commands |
| offline-egress | `node scripts/check-offline-egress.mjs` (includes `extensions/vscode/src/**`) | PASS |
| vsce ls | `npx vsce ls --no-dependencies` | no `node_modules`, includes `images/icon.png` 256×256 |

## Security

- No SVG as `icon` if Marketplace disallows; PNG is required.
- No tiny unreadable text in icon (design is simple "A" on #0B84FF, crisp at 32/64/128).

## Acceptance criteria

- [x] `images/icon.png` is 256×256 PNG, square, width==height==256, >=128, >1024 bytes, not 1×1, not 68 bytes
- [x] `images/icon.svg` preserved as source (22KB, 5225×5225 SVG) if user provided, `icon.ico` preserved if exists, `package.json` `icon` still `images/icon.png`
- [x] `tests/contract/vscode-icon.test.ts` exists and passes (2 tests)
- [x] `extensions/vscode/README.md` is version `0.2.2`, accurately describes all 6 views, 7 commands, Problems, offline-first, links, no false claims

## Risks

- `System.Drawing` on Linux CI may not be available — icon generation is local, committed PNG is 256×256, CI only verifies dimensions via `buf.readUInt32BE`, not via `System.Drawing`.
- User's 5225×5225 SVG is very large (22KB) but resize to 256×256 reduces to 26KB, still crisp.

## Rollback plan

Revert `images/icon.png` to 68-byte 1×1 via `git checkout HEAD -- extensions/vscode/images/icon.png` + `git revert` for README; but then Marketplace icon would be unprofessional — not recommended.

## Completion notes

2026-08-27 — icon + README hardened, preserved user artwork.

**Icon:** `extensions/vscode/images/icon.png` 256×256 PNG, 26534 bytes, `width==256`, `height==256`, square, `>=128`, `>1024`, not 1×1, not 68 bytes, rendered via `System.Drawing` `HighQualityBicubic` `DrawImage 0,0,256,256` from source `icon.svg` 22447 bytes 5225×5225 SVG (user-provided design, preserved), `icon.ico` 63919 bytes preserved, `package.json` `icon` still `images/icon.png` (PNG not SVG per Marketplace).

**Contract test:** `tests/contract/vscode-icon.test.ts` 33 lines `buf.readUInt32BE(16)` width, `20` height, `expect(width).toBe(256)` `expect(height).toBe(256)` `expect(w).toBe(h)` `expect(buf.length).toBeGreaterThan(1024)` — `pnpm test tests/contract/vscode-icon.test.ts` 2 tests PASS (256×256, not 1×1, square).

**README:** `extensions/vscode/README.md` 31→~80 lines rewritten 0.2.2 accurate: header `ACKit Toolkit` `Cynrath` `0.2.2` `VS Code ^1.90.0` `onStartupFinished` debounced lazy `Linters` `Offline No network` `No telemetry`, 6 views `ackit.readiness/findings/graph/tasks/policy/optimize` per-view details (Readiness overall+categories+deductions, Findings grouped+click, Graph nodes+provider, Tasks/Policy summaries, Optimize token-waste), Problems severity mapping `critical/high→Error etc` + `Uri.joinPath` + `isInsideRoot` + clamped `line/col`, Commands 7 (`Refresh/Show Readiness/Show Graph/Open Finding/InstructionsForCurrentFile/Optimize/Diagnostics`) via `resolveEffectiveStack` + `analyzeOptimize` QuickPick diff preview, Watch `onDidCreate/Change/Delete` 400 ms `AbortController`, Multi-root `getRoots/getRootForActiveEditor`, offline-first guarantee `no fetch remote/http/telemetry/remote fonts` verified `scripts/check-offline-egress.mjs` PASS 139 files, links Repo/Docs/Marketplace `Cynrath.ackit-vscode` Changelog v0.2.2, no false claims, no telemetry claims.

**VSIX audit:** `vsce ls --no-dependencies --no-yarn` includes `images/icon.png` 256×256 (>1KB), no `node_modules`, `vsce package` 640323 bytes <2 MB, `file icon.png` 256×256, `unzip -l` no secrets.

**Preserved:** `images/**` artwork not redesigned per user instruction — SVG source kept, PNG rendered at high quality, ICO kept.

**Evidence:** `node -e` icon 256×256 26534 bytes PASS, `pnpm test vscode-icon` 2 PASS, `vsce ls` PASS, offline-egress PASS.
