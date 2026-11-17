# Demo: GitHub Action

Official `Cynrath/agent-context-kit@v0.5.5`

```yaml
permissions:
  contents: read
jobs:
  ackit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@f548e57e544e1ff5a4c46bf1e1b8685f8e4a348a
      - uses: Cynrath/agent-context-kit@v0.5.5
        with:
          command: scan
          args: "--json"
          fail-threshold: high
          upload-sarif: "false"
      # optional: upload SARIF via github/codeql-action/upload-sarif@v3
      # optional: upload findings via actions/upload-artifact@v4
```

- Inputs `command/args/fail-threshold/upload-sarif`, outputs `findings-json/sarif-path`
- Safe `execFile` arg split, SARIF 2.1.0, job summary, least-privilege
- Verified via `actionlint` and local `uses: ./` smoke (annotations + SARIF valid)
- Distribution: composite Action builds the exact tagged source with pinned
  Node 24/pnpm setup and a frozen install, then runs offline against the consumer.
  Setup requires registry access; generated `dist` is not tracked
  ([ADR-0034](../../docs/decisions/ADR-0034-source-built-action-distribution.md)).
