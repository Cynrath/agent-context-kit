# Decisions

Architecture decisions live in **`docs/decisions/`** (new v0.2.0 additions) and the
historical **`docs/rebuild/decisions/`** (ADR-0001 … ADR-0014, all Accepted).
Both directories are traceability-linked; this file is the stable entry point
from the canonical docs tree.

Index and per-area mapping: `docs/rebuild/decisions/README.md` (includes vNext
baseline + v0.2.0 additions ADR-0015 … 0024).

Highlights (vNext baseline):

- ADR-0001 TS/Node/pnpm/Biome toolchain · Node ≥22 (CI 22+24)
- ADR-0002 single npm package · ADR-0003 offline-first invariant
- ADR-0004 config identity `ackit.yml` · ADR-0005 fs root boundary
- ADR-0006 instruction graph · ADR-0007 exit codes 0–5
- ADR-0008 official MCP SDK (`@modelcontextprotocol/sdk@^1.30.0`)
- ADR-0013 package identity `@cynrath/agent-context-kit`, version line 0.1.0+
- ADR-0014 docs-first task system model

v0.2.0 additions (ADR-0015 … ADR-0024, Accepted 2026-08-27):

- ADR-0015 v0.2.0 consolidated release architecture
- ADR-0016 readiness scoring model + provider profile model
- ADR-0017 instruction graph v2
- ADR-0018 rule-pack format & security boundary
- ADR-0019 local dashboard architecture
- ADR-0020 GitHub Action architecture
- ADR-0021 public SDK boundary + VS Code extension integration
- ADR-0022 benchmark / regression policy
- ADR-0023 multi-artifact version/release strategy
- ADR-0024 cross-cutting security hardening

Workflow expansion additions (ADR-0025 … ADR-0028, Accepted 2026-08-31, governing
TASK-0044 … TASK-0062):

- ADR-0025 workflow profiles + stage contract + intent artifact + additive task refs
- ADR-0026 evidence contract v2 + independent verification protocol + verdicts
- ADR-0027 checkpoints, resumability, local workflow store, task-aware packs
- ADR-0028 policy v2 autonomy tiers + review policy + declarative gates + roles + skills projections

v0.5 line additions (Accepted 2026-09-05, governing TASK-0078 … TASK-0086):

- ADR-0029 maintenance-aware release-state model (amends ADR-0023: source/dev vs published-stable vs maintenance vs historical)
- ADR-0030 deterministic verification state binding (verdict ↔ bundle/state digests, staleness + replay at the binding layer)
- ADR-0031 structural verifier independence + replay hardening (reviewed-bundle proof, independence gate, review-artifact lifecycle)
