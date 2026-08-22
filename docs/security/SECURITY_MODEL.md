# Security Model

## Trust boundaries

1. **Repository content is untrusted.** Instructions, skills, configs, and
   source files are treated as adversarial input everywhere.
2. **The filesystem engine is the only door.** Every read/write goes through
   `src/core/filesystem`: requested → normalized → realpath → containment vs
   the canonical root. Outside targets are denied (exit-class 4).
3. **The network is not a boundary — it does not exist** in product code
   (ADR-0003). Policy `npm:` extends resolve through pre-installed packages
   exclusively; a missing package is an explicit offline error.
4. **Generated artifacts are outputs, never inputs.** Reports/packs/baselines
   are written through the same boundary and audited for leakage.

## Default behaviors

- No telemetry, analytics, update checks, or uploads (REQ-GOV-001/002).
- User files are never overwritten without an explicit intent flag; init and
  skills install append managed blocks or refuse (REQ-GOV-008).
- Secrets are redacted at finding construction; baselines never store values;
  context packs exclude secret-shaped candidates outright (REQ-GOV-005).
- Exit code 4 marks security-boundary refusals so automation can react
  distinctly from usage mistakes (ADR-0007).

## Hardening surface

- Rule catalog with confidence tiers keeps false positives low while critical
  shapes stay blocking (`docs/reference/rules.md`).
- Inline suppressions are possible but every bypass emits a visible,
  non-suppressible ACKIT099 advisory.
- Supply chain: exact lockfile, frozen CI install, SHA-pinned Actions
  (TASK-0286), minimal dependency set per ADR-0006/0008.

See `THREAT_MODEL.md` for the enumerated threat table and regression map.
