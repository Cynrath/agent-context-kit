# Chrome Web Store Listing — ACKit Browser Companion

> Last Updated: 2026-08-29
> Extension path: `extensions/browser/` · Manifest V3 · Side Panel

## Store Listing

**Extension Name**
ACKit Browser Companion

**Short Description**
Bring your ACKit repository context, tasks and evidence into ChatGPT, Claude, Gemini and GitHub — with safe, reversible page-performance help.

**Detailed Description**
ACKit Browser Companion brings your local repository intelligence into the websites where you work.

View your active task, effective instructions and context packs without leaving the chat. Insert repository context into the page composer only when you choose — you preview first, then insert, then you press Send. Nothing is auto-submitted and nothing is uploaded silently.

For very long AI conversations, the companion can reduce browser rendering pressure by safely compacting older messages, code blocks and media previews, with Restore All and per-site controls. Every change is reversible.

How to use it:
1. Start the local ACKit bridge on your machine (`ackit browser start`) and connect the extension Side Panel.
2. Open a supported site (ChatGPT, Claude, Gemini or GitHub) and open the ACKit Side Panel.
3. Preview your active task, instructions or evidence, then use Insert to place it into the page composer. Review it and press Send yourself.
4. Use Conversation Performance controls to compact older turns when a page feels heavy, and Restore All when you need the full view.
5. If anything looks wrong, use Emergency Disconnect to stop and restore the page instantly.

Privacy: the extension never reads your filesystem directly and never runs shell commands. It talks only to your local bridge on 127.0.0.1 with a session token you control, and it never auto-submits text. See Privacy & Data Use below.

Support: https://github.com/Cynrath/agent-context-kit/issues — please include the extension version and the site where you saw the issue.

**Category**
Developer Tools

**Single Purpose**
Bring local ACKit project context into supported AI and developer websites with explicit user-controlled insert and reversible performance help.

**Primary Language**
English

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon | 128×128 PNG | ⬜ Not created | extensions/browser/icons/icon-128.png |
| Screenshot 1 | 1280×800 or 640×400 | ⬜ Not created | docs/store/screenshot-01-side-panel.png |
| Screenshot 2 | 1280×800 or 640×400 | ⬜ Not created | docs/store/screenshot-02-insert-preview.png |
| Screenshot 3 | 1280×800 or 640×400 | ⬜ Not created | docs/store/screenshot-03-performance-compact.png |
| Screenshot 4 | 1280×800 or 640×400 | ⬜ Not created | docs/store/screenshot-04-emergency-disconnect.png |
| Screenshot 5 | 1280×800 or 640×400 | ⬜ Not created | docs/store/screenshot-05-github-adapter.png |
| Small Promo Tile | 440×280 | ⬜ Not created | docs/store/small-promo-440x280.png |
| Marquee Promo Tile | 1400×560 | ⬜ Not created | docs/store/marquee-1400x560.png |

### Screenshot Notes
1. Side Panel connected state showing repository, active task and health.
2. Preview → Insert flow; text appears in native composer, user presses Send.
3. Balanced performance mode: older messages collapsed with content-visibility, Restore All visible, counts shown.
4. Emergency Disconnect, Disable on this site, Restore page, Reconnect controls.
5. GitHub adapter insight (e.g., task context beside a PR) — without modifying host page styles.

## Permissions Justification

| Permission | Type | Justification |
|------------|------|---------------|
| storage | permissions | Store per-site enable/disable, performance preferences and UI state locally in extension storage (not in website localStorage). |
| sidePanel | permissions | Render the primary ACKit UI as a Chrome Side Panel. Required for `chrome.sidePanel` API. |
| alarms | permissions | Schedule lightweight periodic health checks and circuit-breaker timers without keeping the service worker alive via polling. |
| activeTab | permissions | (If retained) Temporary access on explicit user gesture via the extension action. Not used for Side Panel composer insert — that path uses host_permissions + messaging. Document here if kept, otherwise remove before submission. |
| https://chat.openai.com/* | host_permissions | Content script + adapter for ChatGPT only. Needed to detect composer, insert previewed context on user action, and offer reversible performance help. |
| https://chatgpt.com/* | host_permissions | Same as above; ChatGPT alternate domain. |
| https://claude.ai/* | host_permissions | Content script + adapter for Claude. |
| https://gemini.google.com/* | host_permissions | Content script + adapter for Gemini. |
| https://github.com/* | host_permissions | Content script + adapter for GitHub (read-only context surface). |
| http://127.0.0.1/* | host_permissions | Reach the local ACKit Browser Bridge on loopback only (explicit 127.0.0.1, not 0.0.0.0). No remote host access. Alternatively declared as optional host permission and requested after local bridge start. |

Notes:
- No `<all_urls>` — only the four provider families plus loopback.
- `tabs` permission is intentionally NOT requested unless `tab.url` is actually read in the service worker; if needed, justification: “Read current tab URL to map site-specific adapter (chatgpt/claude/gemini/github) and to scope Emergency Disconnect / Safe Mode per-site.” Do not add without code use.
- No `scripting` `eval`, no `webNavigation` unless justified by a feature.

## Privacy & Data Use

### Data Collection

**Does the extension collect user data?** No — for store form purposes, the extension does not collect or transmit user data off-device except for user-initiated local bridge reads and explicit Insert actions that place text into the page composer you control. The extension processes website content only locally to locate the composer and to apply reversible performance modes.

| Data Type | Collected? | Transmitted Off-Device? | Purpose | Shared with Third Parties? |
|-----------|-----------|------------------------|---------|---------------------------|
| Personally identifiable info | No | No | — | No |
| Health info | No | No | — | No |
| Financial info | No | No | — | No |
| Authentication info | No | No | — | No |
| Personal communications | No* | No | See note | No |
| Location | No | No | — | No |
| Web history | No | No | — | No |
| User activity | No | No | — | No |
| Website content | Processed locally only | No* | Detect composer, apply reversible compact modes; only text you explicitly Insert leaves the extension into the page DOM | No |

*Note: “Personal communications / Website content” — the extension never uploads repository content automatically. The only egress is when you click Insert: the extension writes the previewed ACKit text into the page's composer element so you can review and then yourself press the site's Send/Submit. The bridge itself (`127.0.0.1`) only serves repository-local reads (status/task/instructions/context/evidence) and never contacts the internet.

### Data Use Certification
- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

## Privacy Policy

**Privacy Policy URL**
https://github.com/Cynrath/agent-context-kit/blob/master/docs/reference/privacy.md
(Will be published as https://cynrath.github.io/agent-context-kit/privacy/ after hosted-docs sync — update this line before first CWS submission.)

## Distribution

**Visibility**: Public
**Regions**: All regions

## Developer Info

**Publisher Name**
Cynrath

**Contact Email**
cynrath@users.noreply.github.com

**Support URL / Email**
https://github.com/Cynrath/agent-context-kit/issues

**Homepage URL**
https://github.com/Cynrath/agent-context-kit

## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 0.3.0 | 2026-08-29 | Browser Companion v0.3 — MV3 extension shell, local bridge (read-only, 127.0.0.1, session token), Side Panel, Emergency Disconnect / per-site Safe Mode / circuit breaker, reversible Conversation Performance (Balanced, content-visibility + reversible collapse), adapters for ChatGPT/Claude/Gemini/GitHub (isolated contracts). No <all_urls>, no auto-submit. | Draft |

## Review Notes

### Known Issues / Limitations
- Screenshots and promo tiles not yet rendered — will be generated from the final Side Panel UI (1280×800) before submission.
- Host permissions are intentionally narrow (four providers + loopback). If the submission checklist demands optional host permissions instead of required, the manifest will be switched to `optional_host_permissions` and the justifications above stay identical — CWS “justification” text does not change, only the request timing does.
- Do not publish before `CHROMEWEBSTORE.md` Privacy Policy URL is live and the 128×128 icon exists — those are hard pre-publish blockers in `references/webstore/review-checklist.md`.

### Rejection History
| Date | Reason | Fix Applied | Resubmitted |
|------|--------|-------------|-------------|
| — | — | — | — |
