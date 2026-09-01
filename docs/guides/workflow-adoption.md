# Workflow Adoption Guide

The workflow expansion is opt-in per task. Nothing changes for repositories
that do not adopt it — this is proven by the legacy-compatibility tests.

## Legacy behavior is preserved

- `ackit.yml` without `workflow:`/`autonomy:`/`review:` sections parses exactly
  as before.
- Tasks without workflow state keep the exact pre-expansion completion rules
  (checkboxes + completion notes + dependencies).
- The managed pre-commit block's drift gate is a no-op without an active
  workflow task.
- No new findings appear in `ackit scan`.

## Adopting, one task at a time

1. Pick the profile that matches the risk of the work:
   - **quick** — small, low-risk fixes (`task → implement → verify`).
   - **standard** — normal feature work; intent + plan + evidence + verdict.
   - **high-risk** — architecture, security, migrations, release-sensitive or
     destructive work; adds spec + independent-review + release-evidence.
2. Reference the planning artifacts on the task:

   ```
   ackit intent new "Make cold scans fast"     # fill + accept the doc
   ackit task create "Faster cold scans" \
     --intent INTENT-0001 --plan docs/plans/perf.md
   ackit workflow set TASK-0007 --profile standard
   ackit task start TASK-0007
   ```

3. Advance stages as planning artifacts appear
   (`ackit workflow advance TASK-0007`). Advancement gates on artifact
   presence.
4. Implement, then record proof:

   ```
   ackit evidence sync TASK-0007
   ackit evidence verify TASK-0007 --criterion AC-001 --type test \
     --ref "pnpm vitest run (passed)"
   ```

5. Checkpoint long work so any fresh agent can continue
   (`ackit checkpoint create ...`), and hand off with
   `ackit checkpoint export`.
6. Verify independently:

   ```
   ackit verification bundle TASK-0007
   # fresh verifier reviews + authors ackit.verdict.v1
   ackit verification record TASK-0007 --verdict docs/verdict-7.yaml
   ```

7. Complete. The gate now enforces evidence + verdict + stage + drift
   (`ackit task complete TASK-0007`). `--force` remains the explicit escape
   hatch (a tier-2 policy boundary — configure `autonomy.tier2: deny` to
   refuse it outright).

## Configuration surface (all optional)

```yaml
workflow:
  defaultProfile: standard
  requireVerifier: true
  profiles:
    requireEvidence: true
autonomy:
  tier2: ask     # --force boundary: allow | ask | deny
review:
  required: [security, tests]
  blockingSeverity: [critical]
```

## When NOT to adopt

Do not attach `standard`/`high-risk` profiles to trivial fixes — that is
over-bureaucracy the quick profile exists to avoid. Do not create intent or
spec documents for work that does not need them.
