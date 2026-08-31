# ADR-0028: Policy v2 Autonomy Tiers, Review Policy, Declarative Gates, Roles, and Skills Interoperability

Status: Accepted · Date: 2026-08-31 · Governs: TASK-0054..0059

## Context

The expansion adds governance surfaces: risk-tiered autonomy, review policy, lifecycle
hooks, role contracts, and skills interoperability. Each risks either a second policy
engine, an executable-hook security hole, or a subagent runtime — all prohibited. This ADR
fixes the safe shapes.

## Decision

1. **Risk-tiered autonomy, one contract, no second engine** — `autonomy: {tier0..tier4 ×
   allow|ask|deny}` optional section on the existing `PolicyDocumentSchema` AND the
   `ackit.yml` config (document overrides config; safe defaults `allow, allow, ask, ask,
   deny`). Tiers: 0 read/inspect/analyze; 1 local edits/local tests; 2 git mutations and
   controlled local state changes; 3 external writes (PR/issue/browser form); 4 publish/
   deploy/production/destructive.

   **Explicit limitation**: ACKit cannot intercept provider-internal tool calls. Core
   enforces tiers ONLY at boundaries ACKit actually controls, today: `task complete --force`
   (tier2), checkpoint/handoff export (tier2), verdict registration (tier2), and
   publish-class actions are refused outright regardless of policy (tier4 default `deny`).
   Provider integrations may adapt the same contract later; the contract is advisory
   metadata for them, enforcement for us. No shell/command fields exist anywhere in the
   schema — shell injection through policy config is structurally impossible.

2. **Review policy** — `review: {required: [correctness|regression|security|tests|
   architecture|plan-compliance|documentation], blockingSeverity: [critical|high|medium]}`
   on the same surfaces. `checkVerdictAgainstReview` maps verdict finding codes to required
   dimensions via a documented code-prefix registry and flags missing coverage or blocking
   severities; the completion gate surfaces it through the existing `VERDICT_BLOCKING`
   path. Same engine, additive section — not a separate review framework.

3. **Declarative lifecycle gates — no executable hooks, ever** — the frozen eight-point
   list `sessionStart, taskStart, preTaskComplete, verification, preCommit, release,
   error, sessionEnd` with a strict declarative schema: required artifacts, evidence
   verified, verdict present, clean drift, and a message. The schema CANNOT represent a
   command (contract test proves `command`/`script`/`run` keys fail validation). Hard
   enforcement happens at ACKit-owned boundaries (completion gate, bundle header, the
   user-installed managed pre-commit block which invokes only the repository-built ACKit
   CLI); release/error/sessionEnd are advisory surfaces. `preToolUse`-style interception
   is out of scope by design.

4. **Portable role contracts, no subagent runtime** — `ackit.role.v1` YAML data files
   (built-ins shipped in `templates/roles/`: researcher, architect, implementer, verifier,
   security-reviewer, documentation-reviewer, release-reviewer; repository roles under
   `docs/roles/`, same schema, cannot shadow built-ins). Roles declare required inputs,
   allowed/forbidden actions, required outputs (verifier must emit `ackit.verdict.v1`),
   and are embedded in verification bundles. Spawning/routing belongs to
   Codex/Claude/OpenCode/Copilot/etc. — ACKit supplies contracts only; no runtime,
   no router, no orchestrator exists in core.

5. **Skills interoperability by projection** — ACKit's canonical open-standard `SKILL.md`
   parser/validator stays the single source of truth. Provider projections
   (`projectSkillClaude`, `projectSkillCopilot`, `projectSkillGeneric`) are pure
   deterministic functions to documented layouts (Claude Code skills, Copilot
   `.github/instructions` with `applyTo`, provider-agnostic sheet). No vendor format is
   adopted as canonical; undocumented formats are never guessed; projections emit data
   only — no scripts, no executable metadata; export refuses overwrites without
   `--force`; no network fetch, ever.

6. **Public-surface parity is intentional, not mechanical** — CLI families for the new
   capabilities; a focused SDK allowlist addition (contract-tested); MCP gains READ-ONLY
   tools only. The MCP read-only boundary is preserved by explicit decision: turning the
   MCP surface into a mutation service would require a future architecture/security
   decision that this ADR explicitly does not grant. VS Code workflow UI is deferred (the
   extension keeps consuming stable SDK surfaces only).

## Consequences

- One policy engine, one gate composer, zero executable hooks, zero runtime processes.
- All new schemas are strict with bounded lengths and safe defaults; unknown keys and
  executable fields cannot parse.
- The limitation "advisory for providers, enforced at ACKit boundaries" is documented in
  `docs/reference/policy.md` — never marketed as provider interception.

## References

- ADR-0011/0018 (policy boundary), ADR-0025/0026/0027 (sibling contracts)
- THREAT_MODEL T16+ rows (forged artifacts, hook execution, policy bypass)
