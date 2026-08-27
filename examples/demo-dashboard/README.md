# Demo: Dashboard

Local dashboard, localhost-only, CSP, live polling.

```bash
mkdir -p /tmp/demo-dashboard && cd /tmp/demo-dashboard
echo "# AGENTS" > AGENTS.md
echo "API_KEY=secret" > .env  # will be redacted as [REDACTED]

ackit dashboard --port 0 --open &
# → http://127.0.0.1:54321
# CSP: default-src 'self', X-Content-Type-Options: nosniff, Cache-Control: no-store
# API: /api/scan.json?page=1&limit=100, /api/graph.json, /api/readiness.json, /api/tasks.json

curl -s http://127.0.0.1:54321/api/scan.json | jq .total
# findings count, paginated, XSS-escaped via textContent

# Non-loopback requires opt-in:
ackit dashboard --host 0.0.0.0 --port 0  # exit 2, refuses without --allow-nonlocal
ackit dashboard --host 0.0.0.0 --allow-nonlocal --port 0  # warns, allows
```

`ackit report serve ./report.html --port 0` similarly localhost-only.

No remote fonts, no CDN, <50KB vanilla JS polling every 2s.
