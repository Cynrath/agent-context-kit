# Support Lifecycle

## Runtime Baseline
- Source build/test SDK: .NET 10.
- Global tool runtime/tool host: .NET 10.
- Tested operating systems: Windows, Ubuntu, and macOS through GitHub Actions.
- PowerShell is required for repository release scripts; the installed CLI itself is cross-platform.

## Pre-1.0 Policy
- Only the latest published pre-release receives planned fixes.
- The previous published pre-release is retained as an upgrade/rollback reference.
- Pre-1.0 command/schema changes may occur, but breaking changes require changelog and migration notes.
- Deprecation should be announced for at least one published pre-release when practical.

TASK-0232 records this policy as the V100 support baseline. TASK-0240 exact-candidate evidence passed on Windows, Ubuntu, and macOS; TASK-0241 accepts the unchanged support scope. Status: `FINAL_RC_CROSS_PLATFORM_CONFIRMATION_PASS / CLOSED_BY_TASK_0241`.

Exact candidate `1.0.0-rc.1` at `548b6affd0da25cb379ec1b153b1064fd5ff6f0b` passed the required Windows/Ubuntu/macOS confirmation in run `29118452246`. Published RC1 installed-package smoke later passed on all three operating systems in run `29350091782`; `0.2.0-alpha.4` remains the immutable upgrade/rollback predecessor.

## 1.0 Target Policy
Before 1.0 GA, freeze:
- minimum .NET SDK/runtime and supported OS versions;
- support duration and end-of-life handling;
- deprecation window for commands/options/config fields;
- security-fix support window;
- cross-platform release-candidate validation requirements.

## Hosted Evidence
Current published/source smoke workflows cover Windows, Ubuntu, and macOS. Any runner, SDK, packaging, or baseline-policy change after the last hosted run requires a new maintainer push and successful hosted validation before an RC decision.

## Unsupported
- .NET 9 and older.
- Hosted Web UI or cloud baseline service.
- Automatic repository upload or telemetry.
- Release/publish operations performed by `ackit`.
