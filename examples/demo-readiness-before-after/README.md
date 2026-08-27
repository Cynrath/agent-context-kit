# Demo: Readiness Before/After

Reproducible readiness scoring across 6 categories (25/25/20/10/10/10) with weighted renormalization.

## Before (empty repo)

```bash
mkdir /tmp/demo-readiness && cd /tmp/demo-readiness
echo "# Empty" > README.md
ackit readiness --json | jq .overall
# 32/100
# deductions: Instructions 25, Security 0, Context 20, Task 10, Skills 10, Policy 10 — all low due to missing AGENTS.md, scan findings, etc.
```

## After (add AGENTS.md + task)

```bash
cat > AGENTS.md <<'EOF'
# AGENTS.md — Agent instructions
Use ackit task for every change. No secrets in logs.
EOF
mkdir -p .agents/skills/example && echo "# Skill" > .agents/skills/example/SKILL.md
ackit readiness
# Readiness 88/100 ██████████████████░░  (threshold 80 — pass)
#   Instructions        90/100
#   Security            90/100
#   Context Efficiency  70/100
#   Task Hygiene        85/100
#   Skills              80/100
#   Policy              90/100
ackit readiness --strict --fail-below 80  # exit 0
```

Validated against `ackit@0.2.1`: `node dist/cli/index.js readiness --json` returns `ackit.readiness.v1` with `overall`, `categories`, `deductions`.

Deterministic: same repo → byte-identical JSON.
