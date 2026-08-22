# Agent Skills

ACKit treats the open Agent Skills standard as first-class product surface
(ADR-0010, REQ-SKILL-001..006).

## Layout

```
.agents/skills/<name>/
  SKILL.md          # YAML frontmatter: name (kebab, == dirname), description
  references/*.md   # progressive disclosure targets
  scripts/*         # DETECTED, never executed
  assets/*
```

## Validation tiers

- **strict** (blocks `skills validate` exit 1): missing/invalid frontmatter,
  name/dir mismatch, non-kebab names, duplicates across the tree, broken or
  out-of-root references.
- **warning** (reported, still exit 1 with findings): long descriptions,
  oversized SKILL.md token estimates, external URLs, reference chains deeper
  than 3.

## Ownership

`.ackit/skills.lock.json` records ACKit-owned skills with version + sha256 +
repo-relative file list. `ackit skills install` is idempotent:

| Target state | Result |
|---|---|
| missing | installed |
| matches builtin | up-to-date (zero diff) |
| differs, untracked | **refused** (third-party) — exit 4 |
| owned + locally modified | conflict unless `--force` |
| owned + unchanged | updated |

Four built-ins ship from `templates/skills/`: ackit-workflow,
ackit-scan-and-fix, ackit-context-optimization, ackit-policy-authoring.
