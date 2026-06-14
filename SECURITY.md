# Security Policy

## Supported Versions
AgentContextKit is pre-release. Security fixes are prioritized for the latest published pre-release branch/tag. The immediately previous published pre-release is retained as an upgrade and rollback reference, not as a promise of parallel security maintenance.

## Reporting A Vulnerability
Do not open a public issue with secrets, private source code, production configuration, credentials, or customer data.

Use GitHub's private vulnerability reporting entry on this repository's Security page for sensitive reports. Do not include sensitive details in a public issue.

Private GitHub vulnerability reporting was enabled and verified on 2026-06-14. See `docs/PRIVATE_VULNERABILITY_REPORTING_STATUS.md`, `docs/SECURITY_RESPONSE_READINESS.md`, `docs/SECURITY_SUPPLY_CHAIN_EVIDENCE.md`, and `docs/MAINTAINER_SECURITY_SUPPLY_CHAIN_HANDOFF.md` for metadata-only evidence and response targets.

## Security Model
- The MVP is offline-first.
- Repository content is analyzed locally.
- No AI API or remote upload is used by the MVP.
- Existing files are not overwritten by default.
- Redaction checks are report-only.

## Known Limitations
- Secret detection is pattern-based and may produce false positives or false negatives.
- Brand/PII detection depends on configured keywords and simple patterns.
- Users must manually review findings before publishing a repository.
