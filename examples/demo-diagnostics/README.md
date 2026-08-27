# Demo: Diagnostics

Environment/config/cache/policy/task diagnostics, deterministic bundle.

```bash
mkdir -p /tmp/demo-diag && cd /tmp/demo-diag
cat > ackit.yml <<'EOF'
schemaVersion: 1
profile: codex
EOF
echo "GH_TOKEN=ghp_1234567890abcdef1234567890abcdef123456" > .env

ackit diagnostics --json | jq .profile
# { "requested": "codex", "resolved": "codex", "source": "ackit.yml" }

ackit diagnostics bundle --out ./ackit-diag.zip --redact-check
# bundle-manifest.json: [{ "path": "bundle.json", "sha256": "…", "redactedCount": 5 }]
# All 5 secret shapes [REDACTED] in terminal/JSON/SARIF/HTML/bundle:
#   AKIA… (AWS key), ghp_… (PAT), -----BEGIN PRIVATE KEY-----, postgres://user:pass@…, apikey=…

unzip -l ackit-diag.zip
# Deterministic order, fixed mtime 1980-01-01, no absolute paths
```

`ackit diagnostics bundle` runs `PACK_SECRET_GATE_RULES` + path scrub over every file — 5/5 `[REDACTED]` proof.
