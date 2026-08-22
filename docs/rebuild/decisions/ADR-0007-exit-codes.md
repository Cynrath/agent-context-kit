# ADR-0007: CLI exit-code taxonomy

Status: Accepted (exit codes 0-5 frozen) · Date: 2026-08-22

## Decision
Stable taxonomy for all commands:

- `0` success / threshold passed
- `1` findings exceeded configured CI threshold
- `2` invalid CLI usage or invalid config
- `3` environment/repository error (missing git where required, unreadable repo)
- `4` security boundary violation blocked (root escape, overwrite refusal, ownership conflict)
- `5` internal unexpected failure

Machine-readable JSON on stdout stays pure; diagnostics → stderr. Raw stack traces only behind `--debug`.

## Rationale
CI determinism and script-friendliness demand stable codes; security-block as its own class lets policy authors distinguish misconfiguration from attacks.

## Consequences
Every command's tests assert exit codes; changing a mapping is a breaking contract change requiring schemaVersion/major bump.
