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
| T16 | Malicious repository content altering workflow state (`.ackit/workflow/`) | State files are strict-schema validated (unknown fields rejected); ids validated `^TASK-\d{4}$` before any path construction; writes contained under canonical root; workflow state is advisory to the committed task doc | TASK-0045 workflow store unit tests (tamper + traversal fixtures) |
| T17 | Forged evidence (fabricated verification records) | Criterion source of truth is the committed task doc; registry criteria must match it (forged ids rejected); evidence refs are length-capped, secret-gated strings never executed; manual-only evidence insufficient unless configured | TASK-0050 evidence validation tests + TASK-0060 forgery security tests |
| T18 | Forged verifier verdict | `ackit.verdict.v1` strict schema; registration validates task existence, criterion references, and blocking-finding/verdict consistency; append-only store (a REWORK verdict cannot be overwritten, only superseded by a later registered verdict) | TASK-0052 verdict validation matrix + TASK-0060 forgery tests |
| T19 | Path traversal in artifact refs (intent/spec/plan/verdict/checkpoint ids and paths) | All ids regex-validated before path construction; all path refs repository-relative POSIX and containment-checked against the canonical root; absolute paths rejected | TASK-0046/0047/0048/0052 traversal security tests |
| T20 | Stale checkpoint reuse (resuming against moved git state) | `ackit checkpoint validate` compares recorded gitHead/changed-areas vs current; `STALE_CHECKPOINT` finding; git-unavailable is an explicit advisory, never a fabricated fresh state | TASK-0048 staleness tests |
| T21 | Task-id collision / cross-repository artifact confusion | Workflow/evidence/verdict/checkpoint state keyed under per-repository `.ackit/workflow/TASK-####/`; a task id resolves only inside the canonical root that owns it; stores refuse ids that do not exist in the owning task set | TASK-0060 cross-repo confusion test |
| T22 | Manipulated git state feeding drift/bundle surfaces | git is invoked read-only through the existing bounded runner; outputs used only for deterministic comparisons; failures degrade to explicit advisories, never silent assumptions | TASK-0051 drift input tests (git-unavailable paths) |
| T23 | Policy bypass (autonomy tier evasion) | Deny in any active layer denies; `--force` completion override is itself tier2-enforced (`POLICY-TIER-DENIED` exit 4); enforcement points enumerated in ADR-0028; non-tty `ask` is treated as deny (no silent bypass) | TASK-0054 enforcement tests |
| T24 | Unsafe hook execution / shell injection via config | Gate schema is declarative-only and structurally cannot represent commands (contract test proves `command`/`script`/`run` fail validation); the only executed hook is the user-installed managed pre-commit block invoking the repository-built ACKit CLI | TASK-0055 no-execution schema test |
| T25 | Provider-specific metadata spoofing (verifier `agent` labels, role claims) | `verifier.agent` is a bounded free-form label never resolved or executed; role contracts are data-only; bundles embed the built-in verifier contract that cannot be shadowed by repository content | TASK-0052/0056 validation + non-shadowing tests |
| T26 | Secret/absolute-path leakage into new artifacts (bundles, checkpoints, resume, journal) | Same canonical secret-gate and scrubber as packs run over every emitted surface (defense in depth, single rule source); journal redacts at construction with a closed event-kind list | TASK-0048/0052/0058 output gates + TASK-0060 offline-runtime extension |

Out of scope by product decision (REQ-GOV-009): LLM APIs, vector stores,
SAST/SBOM platforms, cloud services — these surfaces cannot introduce
threats because they do not exist.

The workflow expansion (ADR-0025..0028) adds no new trust boundary beyond
untrusted repository/local content processed by strict validators: no network
surface, no executable content, no provider interception. Rows T16–T26 above
cover its specific forgery/tamper/traversal/policy threats; each row names the
task whose regression tests keep it closed.

## Offline-first guarantee (v0.2.1)

The product/runtime never initiates outbound network access. Distribution/maintainer steps may use the network (npm install/publish, Actions download, Marketplace), but repository analysis/runtime never sends content anywhere.

- **Static gate**: `scripts/check-offline-egress.mjs` + `tests/security/offline-egress-contract.test.ts` forbid `fetch`, `node:https`, `http.request/get`, `net.connect`, `tls.connect`, `dgram`, `dns.resolve`, `WebSocket`, `EventSource`, `axios/got/undici`, `curl`, git network commands. Allowlist: `node:http` only in `src/core/dashboard/server.ts` / `src/core/reporting/serve.ts` for localhost `createServer`; `fetch('/api/...')` relative only (no absolute/protocol-relative/dynamic).
- **Runtime harness**: `tests/security/offline-runtime.test.ts` patches `fetch`, `http.request/get`, `https.request/get`, `net.connect`, `Socket.connect`, `tls.connect`, `dgram`, `dns`, `WebSocket`, `EventSource` and runs `doctor`, `scan`, `scan --ci`, `readiness`, `instructions`, `pack`, `optimize`, `diagnostics`, rule-pack evaluation, SDK and MCP consumers — all pass without egress. Dashboard/report may bind `127.0.0.1` loopback only; non-loopback requires `--allow-nonlocal` warning (see `assertBindableHost`).
- **Policy isolation**: rule packs and provider profiles refuse `http/https/ftp` locations (`POL-NETWORK-REFUSED`, `PROFILE-NETWORK-REFUSED`); missing npm packs are not auto-fetched (`POL-OFFLINE-BLOCKED`); provider profiles are bundled/local, no API calls; MCP is stdio-only (`src/mcp/stdio.ts` + `McpServer`); VS Code extension has no telemetry/network client.

Permanent CI enforcement: `scripts/check-offline-egress.mjs` + `tests/security/offline-*` run in normal `ci.yml` verify job, not release-only. A future commit introducing outbound primitives fails CI (allowlisted loopback servers excluded). Manual verification: `node scripts/check-offline-egress.mjs` must show `PASS` and `pnpm test` must show 21 offline tests green.

Reporting: see SECURITY.md for private vulnerability disclosure.

## v0.5 adversarial containment delta (TASK-0084)

Live adversarial matrix (`tests/security/adversarial-paths.test.ts`,
executed against the built CLI/MCP on Windows; symlink-file rows are
OS-gated and additionally execute on Linux/macOS CI): absolute paths,
`../`/nested/backslash traversal, NUL bytes, file-symlink reads, dir
symlink/junction writes, Windows case semantics, repo-root boundary,
task-title injection, MCP hostile ids, and the explicit-output contract.

| # | Threat | Mitigation | Regression coverage |
|---|--------|------------|---------------------|
| T27 | CLI `--out` write escape via planted links/junctions (lexically contained path redirected outside the root) | Link-aware write containment (`resolveContainedWritePath`: string-level refusal plus realpath of the nearest existing ancestor and of pre-existing final paths against the real root), wired into all root-contained `--out` writers (verification bundle, checkpoint md/json export, skills export) and the skills scaffold fixed path | Matrix R12/R13 refusal rows + helper regression suite (dir/junction/file-link refusal, legit nested writes) |
| — | Preventive MCP path allow-list (contested proposal) | REJECTED on evidence: string containment + link-aware writes + strict id patterns + schema validation on every read already close the matrix; a parallel allow-list would be redundant configuration with its own bypass surface | Matrix negative findings R1–R11/R15–R20 + allow-list decision record in TASK-0084 |

Negative findings (contained, no change): file-symlink reads
(schema validation is the boundary — attacker-owned bytes cannot become
verdicts/bundles/handoffs); `scan`/`diagnostics` free `--output` paths
(operator-explicit contract relied upon by CI runner-temp recipes);
task titles (slug folding makes traversal unrepresentable); MCP free
paths (none exist — root confined at construction, ids pattern-guarded).
Known residual (accepted, out of scope): hardlinks aliasing outside
files are invisible to any realpath-then-contain scheme — low
exploitability (git cannot transport hardlinks; requires a local plant
plus an operator `--out` through the exact path). No new config surface
was added.
