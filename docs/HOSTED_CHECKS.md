# Hosted Checks Summary

`scripts/hosted-checks-summary.ps1` is a read-only local inspector for recent GitHub Actions workflow runs. It is intended for maintainers who need a compact terminal summary before or after a push.

The script uses only `gh api` for GitHub remote reads. It does not trigger workflows, rerun jobs, post comments, write issues, create releases, update deployments, cache responses, or print tokens.

## Usage

```powershell
powershell -ExecutionPolicy Bypass -File scripts/hosted-checks-summary.ps1
powershell -ExecutionPolicy Bypass -File scripts/hosted-checks-summary.ps1 --count 1
powershell -ExecutionPolicy Bypass -File scripts/hosted-checks-summary.ps1 --workflow ci.yml
powershell -ExecutionPolicy Bypass -File scripts/hosted-checks-summary.ps1 --help
```

No arguments prints the last 10 workflow runs across workflows. `--count` must be a positive integer. `--workflow` accepts the workflow id or workflow file name accepted by the GitHub Actions workflow-runs API.

## Output

The normal output is a Markdown table:

```text
| Workflow | Run ID | Status | Conclusion | URL | Duration |
| --- | --- | --- | --- | --- | --- |
```

The script intentionally limits run rows to these fields:

- Workflow name
- Run ID
- Status
- Conclusion
- URL
- Duration

Duration is calculated from `run_started_at` or `created_at` to `updated_at` when GitHub returns enough timestamps. Otherwise it is shown as `n/a`.

## Failure Behavior

This script is an inspector, so local developer flow should not fail because GitHub is unavailable.

- Missing `gh`: print a clear message and exit `0`.
- Unauthenticated `gh` or GitHub API failure: print a clear message and exit `0`.
- No workflow runs returned: print the table header and no data rows, then exit `0`.
- Invalid arguments such as `--count 0`: print an argument error and exit `2`.

The script does not echo raw `gh` stderr, environment variables, or credentials.

## Deployment Notes

The `nuget-release` GitHub Deployments page can show historical failed deployment status entries from the release workflow environment. Those entries are not the same as current `master` CI status. This script reports recent Actions workflow runs only; it does not alter deployment history or release state.
