# Scanner Rules

AgentContextKit scanner findings use a stable rule catalog. The same catalog drives human output, JSON `ruleId` fields, SARIF rule metadata, and configurable non-Critical finding suppression.

## Rule Catalog
| Rule ID | Category | Default severity | SARIF level | What it detects | Why it matters | How to fix |
| --- | --- | --- | --- | --- | --- | --- |
| `ACKIT001` | SecretLike | Critical | `error` | Secret-like values, credentials, private keys, key-store files, provider-token-like values, and connection-string-like values. | Secrets in source can expose accounts, infrastructure, or production data. | Remove the value, rotate it if it was real, and move runtime values to a safe local secret store. |
| `ACKIT002` | PiiOrBrandLike | Medium | `warning` | PII-like, email-like, phone-like, IP-like, domain-like, brand keyword, and configured PII keyword values. | Public releases and AI context exports can leak private people, customer, or brand data. | Replace with safe placeholders or confirm the value is intentionally public. |
| `ACKIT003` | GeneratedOrBuildArtifact | Medium | `warning` | Build output, archives, package artifacts, database files, backup files, logs, and configured risky extensions. | Generated artifacts can be large, stale, private, or contain embedded secrets. | Remove from source control and keep generated output ignored. |
| `ACKIT004` | LocalPathOrPrivateLocation | Low | `note` | Drive-rooted local paths, Unix home paths, file URI paths, and private machine locations. | Local paths can leak workstation structure and make docs non-portable. | Use repository-relative paths or generic placeholders. |
| `ACKIT005` | RepositoryHygiene | Medium | `warning` | Repository hygiene, configuration, and release readiness findings. | Hygiene gaps can weaken public release quality or context safety. | Review the item and update config/source hygiene as needed. |
| `ACKIT006` | ProductionConfigLike | High | `error` | Production configuration files, environment-specific appsettings, deployment manifests, and live-service connection strings. | Production-only config in a public repository can leak infrastructure, environment names, or service topology. | Replace production values with safe local or placeholder equivalents before public release. |
| `ACKIT007` | DocumentationGap | Medium | `warning` | Documentation gaps, stale guidance, missing required public documents, and unclear wording surfaced by scanner rules. | Outdated or missing docs weaken onboarding, AI context quality, and public release clarity. | Update or add the relevant public documentation so the next reader receives accurate, current guidance. |
| `ACKIT008` | HighEntropyString | High | `error` | Long high-entropy strings that may indicate an embedded secret, signing key, or signing token. | Defense-in-depth signal that catches credentials, JWTs, base64 signing keys, and similar tokens even when no known prefix matches. | Confirm the value is intentionally public; if it is a credential, remove it from source, rotate it, and move it to a safe local secret store. |
| `ACKIT999` | GeneralFinding | Info | `note` | Fallback for scanner findings that do not map to a specific rule. | Keeps unknown future findings representable without breaking SARIF or JSON. | Review and decide whether a more specific rule is needed. |

## User Action Per Severity
| Severity | What to do |
| --- | --- |
| `Critical` | Stop and review before sharing or releasing. Rotate any real secret. |
| `High` | Review before release or share. Replace placeholder values with safe local equivalents. |
| `Medium` | Inspect before public release. Confirm the value is intentional or fix it. |
| `Low` | Informational or hygiene. Tidy the path or wording when convenient. |
| `Info` | Awareness only. No action is required unless the rule recommends otherwise. |

## Current Expansion Coverage
- Private key and certificate indicators: private key file names, key-store extensions, signing key files, and private key header blocks.
- Environment and production config: real environment files, environment-specific appsettings files, and local secrets config files.
- Database artifacts: common database, backup, export, and deployment package extensions.
- Archive and package artifacts: common compressed archives and NuGet package artifacts.
- Local path leakage: drive-rooted paths, Unix home paths, and file URI paths.
- Provider-token-like values: OpenAI-like keys, GitHub-like tokens, AWS access key-like values, bearer token-like values, and generic assignment patterns for tokens, passwords, connection strings, and service credentials.

Scanner messages avoid requiring raw values. Human, JSON, HTML, Web UI, baseline, and SARIF outputs do not write the internal raw `Match` value; JSON keeps the compatible `match` field as `null`.

Email, phone, and IP rules evaluate all distinct candidates in a file. A safe documentation example appearing before a reportable value therefore cannot hide the later value.

Case-insensitive scanner regexes use culture-invariant matching. ASCII token, email, domain, and local-path patterns therefore keep the same behavior under Turkish and other process cultures.

The built-in technical-domain allowlist includes public package, documentation, source-hosting, and badge infrastructure used by this repository. It also recognizes common .NET namespace-shaped tokens such as `System.IO` and `System.Net` so they are not reported as domains.

## Config Allowlist Behavior
`.ackit/config.yml` supports narrow local scanner controls:

```yaml
safeDomains:
  - docs.example.invalid
ignoredPaths:
  - generated-reports/
ignoredFindingIds:
  - ACKIT003
```

Behavior:
- `safeDomains` suppresses domain-like Low findings for exact configured domains. A leading `*.` can match subdomains only.
- `ignoredPaths` suppresses non-Critical findings under repository-relative paths while keeping files visible in scan file lists.
- `ignoredFindingIds` suppresses non-Critical findings for stable rule IDs.
- Critical findings cannot be silently ignored by `safeDomains`, `ignoredPaths`, or `ignoredFindingIds`.
- Current source records explicit config suppressions as sanitized local audit entries; built-in technical allowlists are not logged as config decisions.
- Legacy `ignorePaths` excludes files from scanning and should be used sparingly.

Safe example configs are available under `docs/examples/config/`. They show baseline, strict review, and CI-oriented settings without real secrets or Critical suppression examples.

Regression fixture coverage and safe synthetic-data conventions are documented in `docs/SCANNER_FIXTURES.md`. Positive fixtures assert severity, category, and stable rule ID; negative fixtures cover known technical domains, documentation IP ranges, and narrow fixture-email exemptions.

Suppression audit fields and privacy boundaries are documented in `docs/SUPPRESSION_AUDIT.md`. SARIF excludes suppressed findings and does not carry the local suppression audit.

## SARIF Mapping
| AgentContextKit severity | SARIF level |
| --- | --- |
| Critical | `error` |
| High | `error` |
| Medium | `warning` |
| Low | `note` |
| Info | `note` |

SARIF rules are emitted from the central rule catalog with ID, name, description, default severity context, and recommendation/help text.

## Safety Boundary
The scanner is pattern based. It reduces risk and highlights review targets, but it cannot prove a repository is safe. Public release still requires maintainer review.
