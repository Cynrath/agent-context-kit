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

TASK-0232 records this current shipped policy as the V100 support baseline. Status: `MAINTAINER_DECISION_RECORDED` and `OPEN_PENDING_FINAL_RC_CROSS_PLATFORM_CONFIRMATION`.

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
