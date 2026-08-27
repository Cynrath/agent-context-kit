# Demo: Instruction Graph

Provider-aware `instructions --explain` with provenance.

```bash
mkdir -p /tmp/demo-graph && cd /tmp/demo-graph
cat > AGENTS.md <<'EOF'
---
applyTo: ["src/**/*.ts"]
includeScopes: ["src/"]
excludeScopes: ["src/generated/**"]
---
# AGENTS
EOF
mkdir -p .github/instructions
cat > .github/instructions/feature.instructions.md <<'EOF'
---
applyTo: "src/feature/**/*.ts"
---
# Feature instructions
EOF

ackit instructions --explain --json | jq .nodes[0]
# {
#   "id": "instr:codex:AGENTS.md",
#   "provider": "codex",
#   "precedence": 11,
#   "depth": 0,
#   "provenance": [{ "source": "applyTo", "reason": "applyTo src/**/*.ts" }],
#   "shadowedBy": null,
#   "duplicateOf": null
# }

ackit instructions --provider codex --for src/app.ts --explain
# codex/AGENTS.md → captured (ancestor)
# .github/instructions/feature.instructions.md → not matched (different provider)
```

5 providers: `codex`, `claude`, `copilot`, `gemini`, `generic` — validated via `ackit instructions --help`.
