# Suppression Audit

AgentContextKit `0.2.0-alpha.3` records configured non-Critical scanner suppressions so maintainers can review what was hidden and why.

## Audited Reasons
| JSON reason | Configuration source |
| --- | --- |
| `safeDomains` | Exact or wildcard domain configured under `safeDomains` |
| `ignoredPaths` | Repository-relative path configured under `ignoredPaths` |
| `ignoredFindingIds` | Stable rule ID configured under `ignoredFindingIds` |

Built-in technical-domain noise reduction is not emitted as a config suppression. The audit log is limited to explicit local configuration decisions.

## Human Output
When suppressions exist, `ackit scan` prints a bounded local summary after visible findings:

```text
Suppressed findings: 1
- artifacts/tool.nupkg: ACKIT003 [Medium/BuildArtifact] via ignoredFindingIds
```

The output includes no raw scanner match and no finding message.

## JSON Output
`ackit scan --json` adds `suppressionSummary` and `suppressions`. Each suppression record contains only:

- `ruleId`
- `severity`
- `category`
- repository-relative `path`
- config `reason`

It does not contain `match` or `message`.

Identical audit records are deduplicated. Repeated occurrences of the same configured safe domain in one path do not inflate the suppression count.

## Safety Boundary
- Critical findings are never suppressed and never appear as Critical suppression records.
- A source line can produce both a visible Critical finding and a suppressed lower-severity generic finding. The visible Critical finding still controls CI and redact-check behavior.
- Suppression records do not change process exit codes.
- SARIF includes visible findings only; suppression audit metadata remains local scan output.
- No audit record uploads repository content or calls a remote service.

## Review Guidance
Treat a growing suppression count as configuration debt. Review path and rule-ID suppressions before release, keep entries narrow, and remove entries when the underlying fixture or generated artifact is gone.

TASK-0212 confirms that ignored `.remember` memory logs and retained package-validation archives should not be hidden through broad suppression just to make local scans appear clean. Clean disposable ignored logs locally after count/size review when safe; retain alpha3 package-validation archives as local release evidence unless the release-evidence policy changes.
