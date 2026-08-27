# Demo: Optimize Explain

8-class taxonomy with evidence/confidence/tokenWasteEstimate/provenance/plan.

```bash
# Create synthetic fixture with duplication + oversized instruction
mkdir -p /tmp/demo-optimize && cd /tmp/demo-optimize
echo "# AGENTS" > AGENTS.md
mkdir -p docs
echo "# Duplicate content" > docs/a.md
cp docs/a.md docs/b.md  # exact duplicate

ackit optimize --explain --json | jq .suggestions[0]
# {
#   "id": "OPTIMIZE-DUPLICATE",
#   "category": "duplicate",
#   "severity": "medium",
#   "confidence": 0.95,
#   "tokenWasteEstimate": 42,
#   "evidence": ["docs/a.md", "docs/b.md"],
#   "provenance": "INSTR-DUPLICATE",
#   "plan": { "target": "docs/b.md", "action": "remove or consolidate" }
# }

ackit optimize --explain --format sarif --output optimize.sarif
ackit optimize --fix --dry-run  # preview, writes nothing without --fix
```

All 8 classes: `duplicate`, `shadowed`, `unreachable`, `conflict`, `oversized`, `redundant`, `dead`, `stale` — validated via `ackit optimize --help`.

Deterministic: same repo → same suggestions order.
