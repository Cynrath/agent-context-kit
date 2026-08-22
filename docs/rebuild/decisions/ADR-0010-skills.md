# ADR-0010: Agent Skills integration & ownership model

Status: Proposed · Date: 2026-08-22

## Decision
Skills follow the open Agent Skills standard at `.agents/skills/<name>/SKILL.md` (frontmatter `name`+`description`, name==dirname, optional scripts/references/assets, progressive disclosure). ACKit ships four built-ins from `templates/skills/` and installs them idempotently. Ownership tracked in `.ackit/skills.lock.json` (version+checksum, repo-relative only). Sync updates exclusively lock-owned entries; name conflicts with non-owned skills hard-fail (exit 4). Skill scripts are detected, never executed.

## Rationale
Makes agent skills a first-class product feature while guaranteeing user content sovereignty — the strongest differentiator without inventing a proprietary format.

## Consequences
Cross-agent interoperability preserved; validation strict/warning tiers per REQ-SKILL-005.
