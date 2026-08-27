# Demo: GitHub Action

Official `Cynrath/agent-context-kit@v0.2.1`

```yaml
permissions:
  contents: read
jobs:
  ackit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@f548e57e544e1ff5a4c46bf1e1b8685f8e4a348a
      - uses: Cynrath/agent-context-kit@v0.2.1
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
- Distribution: `dist/action/index.js` 6KB, node24
