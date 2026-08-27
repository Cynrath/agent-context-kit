# Demo: Provider Pack

Provider-aware, budgeted context packs.

```bash
mkdir -p /tmp/demo-pack && cd /tmp/demo-pack
echo "# AGENTS" > AGENTS.md
echo "console.log('hello')" > app.ts

ackit pack --profile codex --max-tokens 50000 --json | jq .manifest[0]
# { "relativePath": "AGENTS.md", "action": "included", "reason": "score 40", "estimatedTokens": 12, "sha256": "…" }

ackit pack --profile claude --max-tokens 1000 --json | jq .profile
# { "requested": "claude", "resolved": "claude", "source": "cli" }

# Profiles: codex, claude, copilot, gemini, generic — all succeed
for p in codex claude copilot gemini generic; do
  echo "profile $p:"; ackit pack --profile $p --max-tokens 50000 > /dev/null && echo "ok $p"
done
```

Weighted deterministic ranking, manifest `hash/reason/tokens` per file, budget `includePriority`.
