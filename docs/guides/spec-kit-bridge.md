# Spec Kit bridge

Community integration for ACKit and GitHub Spec Kit — not an official
GitHub integration.

- **Bridge repo:** [Cynrath/ackit-spec-kit-bridge](https://github.com/Cynrath/ackit-spec-kit-bridge)
  (CLI `ackit-speckit`, MIT licensed)
- **npm:** [`@cynrath/ackit-spec-kit-bridge`](https://www.npmjs.com/package/@cynrath/ackit-spec-kit-bridge)
- **Hosted docs:** [cynrath.github.io/ackit-spec-kit-bridge](https://cynrath.github.io/ackit-spec-kit-bridge/)
- **Positioning:** ACKit Spec Kit Bridge connects GitHub Spec Kit's
  intent-driven development artifacts to ACKit's deterministic repository
  context, task lifecycle, evidence, verification, and completion gates.
- **Runtime:** offline-first, no cloud APIs, no LLM API, no telemetry.

## What each side owns

- **Spec Kit owns:** intent, `specify` / `plan` / `tasks` / `implement`,
  converge — artifacts under `specs/NNN-name/`.
- **ACKit owns:** deterministic execution context, task state, evidence,
  verification, completion trust, status, checkpoints, handoffs.
- **The bridge does:** discover the active Spec Kit feature, synchronize it
  into an ACKit task with explicit refs (`sync`, idempotent), run
  state-bound verification (`verify`), refuse completion on stale state
  (`gate`), and export deterministic resume context (`checkpoint`,
  `handoff`). It replaces neither side and introduces no ACKit-core
  dependency on the bridge.

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

## Freshness model

A verdict binds `subjectDigest + evidenceDigest + profile + result`. The
subject digest covers Spec Kit artifacts, the mapped ACKit task/config/
policy, bridge config/profile/version, tool versions, and Git HEAD/diffs.
Editing any of them makes the verdict `STALE` and fails the gate
(`stalePolicy: fail`, exit 1) until you re-verify. Profiles rank
`quick < standard < high-risk`; higher satisfies lower.

## Which ACKit surfaces the bridge uses

`config check`, `scan --ci`, `readiness`, `instructions`, `optimize`,
`pack`, `skills validate`, `task`, `policy check`, `diagnostics` — composed
as subprocess checks with redacted evidence, never reimplemented.

The bridge also ships a native Spec Kit extension (`speckit.ackit.*`
commands + hooks) and an `ackit-verified-sdd` workflow; see the
[bridge README](https://github.com/Cynrath/ackit-spec-kit-bridge#readme),
the [hosted bridge docs](https://cynrath.github.io/ackit-spec-kit-bridge/),
and the bridge `docs/` for the full contract.
