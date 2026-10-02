# Spec Kit bridge

[GitHub Spec Kit](https://github.com/github/spec-kit) owns intent,
specification, planning, and task decomposition. ACKit owns deterministic
execution context, task state, evidence, verification, and completion trust.
The community bridge connects the two without forking either side:

- **Bridge:** [`@cynrath/ackit-spec-kit-bridge`](https://github.com/Cynrath/ackit-spec-kit-bridge)
  (CLI `ackit-speckit`) — community integration, MIT licensed.
- **Positioning:** ACKit Spec Kit Bridge connects GitHub Spec Kit's
  intent-driven development artifacts to ACKit's deterministic repository
  context, task lifecycle, evidence, verification, and completion gates.
- **Runtime:** offline-first, no cloud APIs, no LLM API, no telemetry.

## Lifecycle

```text
spec / plan / tasks (Spec Kit)
  → ACKit task + refs            (ackit-speckit sync)
  → implementation
  → verification bundle          (ackit-speckit verify)
  → completion gate              (ackit-speckit gate)
  → checkpoint / handoff         (ackit-speckit checkpoint|handoff)
  → safe completion              (ackit-speckit complete)
```

## Quickstart (PowerShell)

```powershell
npm install -g @cynrath/ackit-spec-kit-bridge
ackit-speckit init
ackit-speckit sync
ackit-speckit status --json
ackit-speckit verify --profile standard
ackit-speckit gate
```

A verdict binds the exact verified state: editing the spec, plan, tasks, the
mapped ACKit task, configs, or the Git diff makes it `STALE` and fails the
gate until you re-verify. The bridge also ships a native Spec Kit extension
(`speckit.ackit.*` commands + hooks) and an `ackit-verified-sdd` workflow;
see the [bridge README](https://github.com/Cynrath/ackit-spec-kit-bridge#readme)
and its `docs/` for the full contract.

## Which ACKit surfaces the bridge uses

`config check`, `scan --ci`, `readiness`, `instructions`, `optimize`,
`pack`, `skills validate`, `task`, `policy check`, `diagnostics` — composed
as subprocess checks with redacted evidence, never reimplemented.
