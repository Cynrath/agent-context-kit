# ADR-0034: Source-built GitHub Action distribution

Status: Accepted · Date: 2026-11-17 · Task: TASK-0098

## Context

ADR-0020 specified a self-contained Node action but its implementation tracks a
handwritten `dist/action/index.js` with no owning source. Tags omit the referenced
CLI and dependencies; the dogfood build hides the missing runtime. Current
repository governance prohibits tracking generated `dist`. Committing an entire
CLI/dependency bundle would contradict that rule and duplicate the npm runtime.

## Decision

Supersede only ADR-0020's distribution/entrypoint choice with a composite Action
that builds the exact tagged source in its own checkout. Preserve inputs,
outputs, least privilege, injection-safe argv, optional SARIF and offline product
execution. The original ADR is retained verbatim as historical context.

1. Pin setup-node and pnpm/action-setup to reviewed full SHAs. Select Node 24 and
   the action checkout's exact `packageManager` version.
2. Frozen-install the action workspace and build its canonical CLI/Action source.
   Setup may download locked dependencies; no consumer package script is run.
3. Run the built TypeScript Action entry with input values passed through
   environment variables. Resolve CLI files relative to the Action installation;
   the working directory remains the consumer repository.
4. No network is used by the CLI/SDK/MCP/Action execution code. No `dist`, bundled
   dependencies, package archives or generated runtime is committed.
5. A clean exported checkout consumed from an unrelated fixture, plus hosted
   dogfood without a preparatory install/build, validates the whole bootstrap.

## Consequences and alternatives

Consumers require registry access during setup and incur an install/build cost.
Runtime remains the same canonical source/version, without an npm publication
race at tag creation. A generated committed bundle and runtime `npx latest` were
rejected for governance and reproducibility reasons respectively. Revisit only
through a separate task if measured setup cost warrants a distribution change.

## Security and rollback

Trusted Action source, frozen lockfile, pinned setup actions and environment/argv
boundaries apply. No permission expansion or automatic upload. A forward PR can
correct the bootstrap; never move existing tags or change published artifacts.
