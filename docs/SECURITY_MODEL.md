# Security Model

The authoritative current default is `docs/NO_NETWORK_DEFAULT_POLICY.md`. Installation/package acquisition and explicitly selected future external/networked workflows are separate trust boundaries; they do not weaken the no-network default for normal commands.

## External Executable And Output Boundary
External tools are not part of the AgentContextKit trusted computing base. Their binaries, dependencies, caches, telemetry, network behavior, and outputs require separate evidence and explicit opt-in. See `docs/EXTERNAL_TOOL_PRIVACY_THREAT_MODEL.md`; external findings never inherit stable ACKIT rule IDs without a reviewed mapping policy.

Future external artifact parsing must follow `docs/EXTERNAL_OUTPUT_IMPORT_BOUNDARY.md`: bounded inputs, repository-relative containment, no raw secret ingestion, namespaced identities, sanitized summaries, and isolated failure.

## Trust Boundary
AgentContextKit runs locally against a repository path. The MVP does not upload repository contents, does not call AI APIs, and does not automatically redact or delete files.

## Risk Categories
- Secret
- PII
- Brand
- LocalPath
- ProductionConfig
- BuildArtifact
- RepositoryHygiene
- Documentation

## Severity
- Critical
- High
- Medium
- Low
- Info

## Safe Defaults
- Existing files are skipped.
- Generated files are opt-in by command.
- Redaction checks are report-only.
- Critical risks return non-zero exit codes in `redact-check`.
- Configured `ignorePaths` only suppress reporting for selected paths; they do not delete or mutate files.
- SARIF output is generated only when `ackit sarif --output <repo-relative.sarif>` is requested.
- SARIF artifacts use repository-relative paths and do not include raw scanner match values.
- GitHub Code Scanning upload is not automatic; upload workflows remain maintainer-only and example-only unless explicitly enabled.

## Scanner Precision Notes
- The full "User Action Per Severity" table lives in `docs/SCANNER_RULES.md`; this model defers to that table for operator guidance.
- Real environment files such as `.env` and `.env.local` are Critical.
- Sample environment files such as `.env.example`, `.env.sample`, `.env.template`, and `.env.dist` are review findings, not Critical by path alone.
- Private key and key-store file names such as `id_rsa`, `id_ed25519`, `.pfx`, `.p12`, and `.key` are Critical.
- Private key blocks include generic, RSA, DSA, EC, OpenSSH, PGP, and encrypted private key headers.
- Loopback, wildcard, and documentation-reserved IP addresses are ignored to reduce docs false positives.
- Private/internal IP addresses remain reportable.
- Configured brand and PII keywords use token-boundary matching to reduce substring false positives.
- Safe technical domain references for common platform/package documentation are allowlisted by default, including GitHub, Microsoft Learn, Microsoft/.NET namespaces, NuGet, the NuGet API host, and Shields.io badge assets.
- Fixture/sample/test paths can contain clearly non-real placeholder email values without being treated as real PII. Real-looking domains and configured PII keywords remain reportable.
- Critical secret-like values remain reportable even in test, sample, and fixture paths.
- Configured `safeDomains`, `ignoredPaths`, and `ignoredFindingIds` suppress only narrow non-Critical scanner noise.
- Configured `ignoredFindingIds` uses stable scanner rule IDs documented in `docs/SCANNER_RULES.md`.
- Provider-token-like patterns include OpenAI-like keys, GitHub-like tokens, AWS access key-like values, and bearer token-like values without requiring raw matches in SARIF.
- Case-insensitive scanner regexes use culture-invariant semantics so process locale does not weaken ASCII token, email, or domain detection.

## Scanner Allowlist Policy
Built-in allowlists are intentionally narrow and technical. They are for public platform/package domains and explicit placeholder fixture data, not customer domains, production hosts, private organizations, or broad path suppression.

Config allowlists are local-only, explicit, reviewable, and documented. They cannot silently suppress Critical findings. Legacy `ignorePaths` excludes files from scanning and should be used sparingly because it hides files from reports.

Current source keeps config suppressions auditable through sanitized local scan output. Audit entries omit raw matches and messages, do not change exit codes, and are not added to SARIF. See `docs/SUPPRESSION_AUDIT.md`.

## Local Artifact Retention Policy
Ignored local artifacts are not automatically safe and are not automatically disposable.

TASK-0212 defines the current local policy for the two recurring post-alpha3 artifact classes:

- `.remember/logs/**/*.log` files are local-only runtime/memory/autonomous logs. They are not release evidence and may be removed from a local workspace after recording count and size when they are ignored, untracked, and no longer needed for local operator continuity. Do not paste raw log contents into docs or reports.
- `artifacts/package-validation/<version>/*.{nupkg,snupkg}` files are ignored local package-validation artifacts. The `0.2.0-alpha.3` files are retained local release evidence and must not be deleted by generic cleanup unless a maintainer explicitly changes release-evidence retention policy.

Do not use broad `ignoredPaths`, baseline acceptance, or scanner suppression to make these classes disappear from output without a separate policy task proving the change cannot hide real secrets or release blockers.

The scanner rule catalog, configurable allowlist foundation, and expanded scanner patterns are part of the published `0.2.0-alpha.4` package and current source. Stable `ACKIT` rule IDs and their category mapping are documented in `docs/SCANNER_RULES.md`; the latest additions are `ACKIT006` (`ProductionConfigLike`, High) for production configuration and `ACKIT007` (`DocumentationGap`, Medium) for documentation gaps.

Scanner regression fixtures are synthetic and assembled to avoid committed live-looking credentials. The fixture matrix in `docs/SCANNER_FIXTURES.md` verifies both detection and known-noise boundaries without weakening Critical findings.

GitHub Code Scanning upload is not enabled by default. `ackit sarif` creates local SARIF output; upload requires maintainer opt-in, reviewed workflow permissions, and the decision process in `docs/CODE_SCANNING_DECISION.md`.

The opt-in design scopes `security-events: write` to one manual upload job and uploads only the validated SARIF file. See `docs/SARIF_UPLOAD_WORKFLOW_DESIGN.md`.

## SARIF Output Privacy
`ackit sarif` is designed as a local report format, not an upload action. The generated SARIF file:

- uses stable AgentContextKit rule IDs instead of embedding scanner internals;
- maps file locations to repository-relative URI paths with `/` separators;
- omits raw secret/PII match text from result messages;
- does not include absolute drive roots, user profile paths, or local workspace paths; and
- is written under an explicit repository-relative `.sarif` output path.

If maintainers later upload SARIF to GitHub Code Scanning, they should review the artifact first and enable upload from a dedicated workflow with `security-events: write` permission.

## Baseline Identity Privacy
The baseline workflow computes SHA-256 finding identities from a stable rule ID, normalized repository-relative path, optional numeric line/column, and deterministic occurrence number. It rejects absolute/traversal paths and does not store raw matches, messages, secrets, usernames, machine names, repository roots, or timestamps.

`ackit baseline` refuses to overwrite an existing file unless `--update` is explicit. Loading validates the baseline schema, fingerprint algorithm, duplicate identities, and each stored fingerprint. Baseline-aware scan keeps every finding visible, including existing Critical findings. Only the opt-in CI decision changes: `scan --baseline <path> --ci` fails on new High/Critical findings. See `docs/BASELINE_MODEL.md`.

SARIF baseline properties omit raw match/message data. HTML report and Web UI remain local-only artifacts and may show the normal local finding details, but baseline status itself contains only existing/new classification and sanitized identity metadata.

## Configuration Diagnostic Safety
The read-only Core config validator detects unsafe paths/domains, unknown finding IDs, and Critical suppression attempts. `ackit config-check` exposes codes, line numbers, keys, and sanitized messages without echoing raw values or full config lines. It never rewrites or auto-migrates config; warning-only checks return `0` and Error diagnostics return `1`.

## Limitations
Pattern-based scanners cannot guarantee full detection. Public release still requires manual review.
