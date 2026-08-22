# Threat Model

Scope: the ACKit CLI, its MCP server, and every artifact they generate.
Default trust stance (REQ-SEC-002): **repository content is UNTRUSTED input.**
Every threat below is from MS§26 and names its deterministic mitigation and
the regression surface that keeps it closed.

| # | Threat | Mitigation | Regression coverage |
|---|--------|------------|---------------------|
| T1 | Malicious instruction/skill content (prompt poisoning) | Advisory-only analysis with deterministic evidence; no LLM verdicts; hidden-unicode/external-ref/root-escape flags | TASK-0273 fixtures (ACKIT310-314), no-critical-without-evidence policy |
| T2 | Malicious links / external references | External URLs flagged as advisories; nothing is fetched at runtime | references scan + network-spy test in policy resolution |
| T3 | Data exfiltration via generated artifacts | Offline-first: zero network calls in product code; packs scrub machine-local absolute paths; secrets hard-excluded from pack candidates | REQ-GOV-001/002 sweep, context-pack exclusion tests |
| T4 | Skill/policy poisoning through install/sync | Ownership lock (`skills.lock.json`) with checksums; third-party names refused; locked rules cannot be weakened | skills install tests (refused-third-party), POL-LOCKED-CONFLICT |
| T5 | Unsafe script execution (skill `scripts/`) | Scripts are detected and reported, NEVER executed | child_process spy test asserting zero invocations |
| T6 | Plugin/code-execution risk | No JS plugin system; policies are declarative YAML only | ADR-0011 boundary; grep-gate on final gate |
| T7 | Supply-chain compromise of dependencies | Minimal dep set, lockfile frozen, CI installs with `--frozen-lockfile`, Actions pinned by SHA (TASK-0286) | CI config tests |
| T8 | Path traversal / root escape via links or globs | Every access passes normalize→realpath→containment against canonical root; escapes denied with FS-PATH-ESCAPES-ROOT | filesystem security fixture suite (Windows+POSIX CI) |
| T9 | Secret leakage into reports/logs/terminal | Redaction at finding construction before any reporter; baselines store structural fields only; pack excludes secret-shaped files | redaction regressions across terminal/JSON/SARIF/HTML |
| T10 | Terminal/ANSI injection & log forging | All diagnostic/report text sanitized (ANSI escape + C0 control stripping) | diagnostics unit tests |
| T11 | Resource exhaustion (huge repos/files) | Engine-level limits (maxFiles/maxFileBytes/maxTotalBytes/maxDepth/deadlineMs) each emitting diagnostics; watch debounce coalescing | walk-limits suite |
| T12 | Symlink/junction cycles | Visited-canonical-set termination with FS-CYCLE-SKIPPED | cyclic-link fixture |
| T13 | Malformed inputs (YAML/frontmatter/config) | Real parsers with structured errors carrying file:line; walker never crashes on unreadable entries | config error snapshots, dangling-link fixture |
| T14 | Malicious glob patterns (ReDoS/overreach) | Conservative glob engine (picomatch), user excludes validated by zod before fs layer; applyTo unreachable-glob advisory | config validation tests |
| T15 | Dangerous MCP writes | Server ships read-only tools ONLY; any future write tool requires an explicit capability-gate design (documented in TASK-0283) | tools/list contract test asserting exact read-only set |

Out of scope by product decision (REQ-GOV-009): LLM APIs, vector stores,
SAST/SBOM platforms, cloud services — these surfaces cannot introduce
threats because they do not exist.

Reporting: see SECURITY.md for private vulnerability disclosure.
