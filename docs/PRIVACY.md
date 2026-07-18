# Privacy

Current default network behavior is governed by `docs/NO_NETWORK_DEFAULT_POLICY.md`: normal commands do not upload repository content, call model APIs, send telemetry, or invoke external tools.

## External Tool Boundary
AgentContextKit does not install or invoke external tools by default. External prompt bundles, graphs, indexes, SARIF, JSON, SBOMs, and reports remain separate local artifacts and are governed by `docs/EXTERNAL_TOOL_PRIVACY_THREAT_MODEL.md` and `docs/EXTERNAL_OUTPUT_PRIVACY.md`.

AgentContextKit MVP is local-only.

## Data Handling
- Repository files are read locally.
- No remote upload is performed.
- No telemetry is collected.
- No LLM API is called.
- No automatic redaction is performed.

## Generated Output
Generated files can include project structure, stack information, instruction wording, relative source paths, and source line mappings. Review generated files before committing or sharing them.

## Risk Reports
Human, JSON, HTML, Web UI, baseline, and SARIF outputs omit raw scanner match values. Optimize finding outputs use sanitized evidence; review proposals additionally sanitize recognized secret/PII/local-path patterns before rendering retained instruction text. Relative paths, rule metadata, instruction meaning, messages, and finding existence can still be sensitive, so treat reports/proposals as local review artifacts until approved for sharing.

## User Responsibility
Before publishing a repository, manually review:
- secrets
- production config
- private domains
- names, addresses, emails, phone numbers
- local paths
- backups, dumps, uploads, logs
