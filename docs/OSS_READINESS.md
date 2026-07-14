# OSS Readiness

## Current Target
Maintain and verify the completed `v0.2.0-alpha.4` public pre-release while keeping future version, security, signing, SBOM, provenance, and recovery decisions maintainer-reviewed.

## Required Signals
- Clear README.
- License.
- Security policy.
- Contribution guide.
- Contributor onboarding.
- Code of conduct.
- Issue templates.
- Pull request template.
- GitHub label plan.
- GitHub settings checklist.
- Support matrix.
- Maintainer guide.
- Changelog.
- Roadmap.
- CI.
- Tests.
- Task-first docs.
- Safe defaults.

## Release Stance
The first release should be small, working, documented, and honest about limitations.

## Current Local Readiness Notes
- Source archive hygiene is documented in `docs/SOURCE_ARCHIVE.md`.
- Local ZIP/RAR archives must exclude `.git/`, `.ackit/`, `bin/`, `obj/`, test output, coverage, packages, archives, logs, and local secrets.
- GitHub source packages differ from local working-directory archives because GitHub uses tracked content rather than ignored local artifacts.
- Self-scan stack detection reports the main product as `.NET`, `.NET CLI / .NET Tool`, and `GitHub Actions`.
- Sample projects under `samples/` are intentionally not reported as main repository stacks.
- Package metadata uses the selected public URL `https://github.com/Cynrath/agent-context-kit`.
- Codex for OSS application material is prepared in `docs/CODEX_FOR_OSS_APPLICATION.md`.
- GitHub repository is public.
- `v0.2.0-alpha.4` tag is pushed at `98cdf9723a509a347bd0403f6373dafe81ba03fb`.
- GitHub Actions latest `master` run is green.
- Read-only GitHub CLI validation on 2026-06-06 confirmed `ci`, `cross-platform-smoke`, and `cross-platform-source-smoke` passed after `docs: add sample gallery and demo scenarios`.
- Repository description and topics are set.
- GitHub Release page is completed for `v0.2.0-alpha.4` as a pre-release.
- NuGet publish is completed for `AgentContextKit` version `0.2.0-alpha.4`.
- NuGet global tool install and package smoke are verified for `0.2.0-alpha.4`.
- NuGet global tool smoke test is verified in a clean demo app, including init, scan, generation, task creation, report, Web UI, prompt-pack, context-export, JSON output, and redact-check Critical detection.
- Cross-platform GitHub Actions smoke workflow completed successfully on commit `868dff3` for Windows, Ubuntu, and macOS using the published NuGet global tool.
- `v0.2.0-alpha.4` is published on GitHub and NuGet; `v0.2.0-alpha.3` remains the published predecessor.
- Codex for OSS form submission is completed per maintainer-provided status.
- Documentation-only published-package smoke examples install `AgentContextKit` `0.2.0-alpha.4`.
- Local `.ackit/reports/` and `.ackit/webui/` outputs are ignored local review artifacts and are not public release artifacts.
- GitHub issue templates, pull request template, maintainer guide, contributor onboarding, support matrix, repository hygiene, and issue triage docs are present.
- README badges are present for `ci`, published-package smoke, source-package smoke, NuGet version, NuGet downloads, license, and .NET 10.
- GitHub label guidance and repository settings checklist are documented as maintainer-only manual actions.
- The published NuGet `1.0.0-rc.1` package includes `ackit sarif`; `0.2.0-alpha.4` remains the immutable predecessor.
- The published `1.0.0-rc.1` package includes SARIF output, scanner rule catalog hardening, additive JSON `ruleId`, config-driven non-Critical allowlists, expanded scanner patterns, sample gallery docs, demo scenarios, Web UI preview docs, visual asset guidance, MCP stdio, `ackit watch`, `diff`, and `trim`.
- GitHub Actions CI usage docs and documentation-only workflow examples are present for scan CI, SARIF upload, published-tool smoke, and source-package smoke.
- Sample gallery and demo scenario docs are present for safe onboarding without committing generated artifacts.
- Sample repositories cover .NET console, ASP.NET Core Minimal API, Node/TypeScript/Tailwind, generic empty repository health gaps, and safe security fixture wording.
- Published `0.2.0-alpha.4` includes scanner rule catalog hardening, additive JSON `ruleId` metadata, config-driven non-Critical allowlists, expanded risk patterns, baseline-aware CI, config diagnostics, sanitized suppression audit output, MCP stdio, `ackit watch`, `diff`, and `trim`.
- Public visual asset rules are documented in `docs/VISUAL_ASSETS.md`.
- Web UI public preview guidance is documented in `docs/WEB_UI_PREVIEW.md`.
- README uses a sanitized diagram and a text-based preview; screenshots remain pending until sanitized assets are available.
- `docs/V020_ALPHA2_SCOPE.md` records the completed alpha.2 scanner precision and sanitized suppression-audit scope without command/schema breaks.
