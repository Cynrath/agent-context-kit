# Exit Codes

AgentContextKit uses small, automation-friendly exit codes.

## General Codes
- `0`: command completed without a blocking condition.
- `1`: command error, invalid invocation, warning-level blocking condition, or high-risk CI condition.
- `2`: critical risk condition.

## Command Matrix
| Command | Exit code behavior |
| --- | --- |
| `ackit help` | `0` |
| `ackit version` | `0` |
| `ackit init` | `0` when config inspection/write completes |
| `ackit config-check` | `0` for missing/default, valid, or warning-only config; `1` when Error diagnostics exist |
| `ackit scan` | `0` in default report-only mode |
| `ackit scan --ci` | `0` with no high/critical findings, `1` with high findings, `2` with critical findings |
| `ackit scan --baseline <path> --ci` | `0` with no new high/critical findings, `1` with new high findings or an invalid baseline, `2` with new critical findings |
| `ackit baseline` | `0` when a new sanitized baseline is written, `1` for invalid paths or an existing file without `--update` |
| `ackit baseline --update` | `0` when an existing baseline is explicitly replaced |
| `ackit sarif` | `0` when SARIF creation/skip reporting completes, `1` when required output path is missing or invalid |
| `ackit report` | `0` when report creation/skip reporting completes |
| `ackit webui` | `0` when Web UI creation/skip reporting completes |
| `ackit prompt-pack` | `0` when prompt-pack creation/skip reporting completes |
| `ackit context-export` | `0` when manifest creation/skip reporting completes, `1` when required approval or prompt-pack input is missing |
| `ackit generate` | `0` when generation/skip reporting completes |
| `ackit task "<title>"` | `0` when task creation/skip reporting completes |
| `ackit task` without a title | `1` |
| `ackit redact-check` | `0` with no findings, `1` with non-critical findings, `2` with critical findings |
| `ackit doctor` | `0` with no failed high/critical checks, `1` with failed high/critical checks |
| `ackit mcp` | `0` when the provided JSON-RPC request is routed or written, `1` when `--stdio` is missing or `--output` is invalid. JSON-RPC tool errors are returned in the response body and do not change the process exit code in this prototype. |
| Unknown command | `1` |
| Unhandled runtime error | `1` |

## Notes
- `ackit scan` is report-only by default so existing local workflows are not broken by findings.
- Use `ackit scan --ci` in automated checks when high or critical findings should fail the job.
- Use `ackit scan --baseline <path> --ci` only after reviewing the baseline diff. Existing findings remain visible; baseline status is not suppression.
- `ackit config-check` warnings are review signals, not blockers. Error diagnostics fail with `1`; no config migration or rewrite is automatic.
- JSON output uses the same process exit code as human-readable output.
- Exit codes are language-independent and must not change when `--lang` changes.
- The localization parity gate runs equivalent English/Turkish success and invalid-invocation cases to enforce this rule.
- Automation should branch on the numeric process exit code, not localized output text.
- New non-blocking output fields or messages must not change an existing command's exit decision.
- Public release approval is not implied by exit code `0`; release blockers remain documented separately.

## Compatibility
- Existing meanings of `0`, `1`, and `2` are stable within the current command contract.
- A command-specific exit-code change requires tests, documentation, changelog notes, and an explicit compatibility review.
- JSON payloads that expose an `exitCode` field must match the actual process exit code.
- TASK-0092 conditionally freezes this matrix for release-candidate preparation. A changed exit decision is breaking and must reopen the contract freeze.
