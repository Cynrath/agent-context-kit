# AgentContextKit for VS Code

Offline-first agent readiness toolkit for VS Code — readiness scoring, instruction graph, context packs, policy checks, and diagnostics.

- **Publisher:** `cynrath`
- **Version:** `0.2.1`
- **Engine:** `VS Code ^1.90.0`
- **Activation:** `onStartupFinished`
- **Category:** `Linters`

## Features

- Readiness tree (0–100 across 6 categories)
- Problems `ACKITxxx` diagnostics
- Instruction graph “instructions for current file”
- Tasks/policy/optimize views
- Palette: `ACKit: Refresh / Show Graph / Optimize / Diagnostics`
- File watcher debounced, no telemetry

## Requirements

- VS Code `^1.90.0`
- Node `>=22` for CLI (extension host only, no network)

## Links

- Repo: https://github.com/Cynrath/agent-context-kit
- Docs: https://cynrath.github.io/agent-context-kit/
- Marketplace: https://marketplace.visualstudio.com/items?itemName=cynrath.ackit-vscode

Offline-first, deterministic, no telemetry.
