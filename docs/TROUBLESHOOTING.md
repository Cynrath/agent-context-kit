# Troubleshooting

## Turkish Characters Or Mixed-Language Output
Use `--lang tr` for Turkish human-readable output and a UTF-8-capable terminal profile. Command names, option names, severity names, rule IDs, diagnostic codes, paths, and JSON values intentionally remain stable technical English tokens. This is not a fallback failure.

Verify the local contract with:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-localization-parity.ps1 -FailOnIssues
```

If Turkish characters render as replacement glyphs, first change the terminal encoding/font. Do not rewrite JSON field names or scanner IDs as a display workaround.

## `dotnet --info` prints an exception
The local environment may still build and test successfully. Prefer the release validation script:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/verify-release.ps1
```

If build/test fails, capture the exact command and output.

## `dotnet tool install` finds another package source
Use an isolated temp source and exact version:

```powershell
dotnet tool install AgentContextKit --tool-path <temp-tools> --add-source <temp-nupkg> --version 0.2.0-alpha.3 --ignore-failed-sources
```

## PowerShell cannot run scripts
Use:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/verify-release.ps1
```

## `ackit scan` reports false positives
Review the finding first. If it is safe to suppress, add a targeted rule to `.ackit/config.yml`:

```yaml
ignorePaths:
  - generated/
```

Avoid broad rules such as `src/`.

## `ackit generate` skips files
This is expected. Existing files are not overwritten by default.

## JSON output changes
JSON output is alpha. Treat `schemaVersion` as early and review `docs/JSON_OUTPUT.md` before relying on it in CI.
