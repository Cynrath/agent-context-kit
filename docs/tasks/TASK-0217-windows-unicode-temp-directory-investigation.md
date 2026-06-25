# TASK-0217: Windows Unicode temp directory investigation

## Purpose
Investigate and fix the Windows-only test-created top-level Unicode temp directory issue observed during recent validation. The guard repeatedly cleaned one empty top-level directory with non-ASCII / replacement / BOM-like characters after `dotnet test`. This must not be committed and must not be confused with source changes.

## Background
- TASK-0216 push validation reported: "Cleaned 1 temp dir; no source impact" under Windows Unicode temp dir guard.
- The symptom: After `dotnet test AgentContextKit.sln -c Release --no-build`, an empty top-level directory with non-ASCII / replacement / BOM-like characters sometimes appears in the repo root.
- The TASK-0216 guard script (`Get-ChildItem -Force -Directory | Where-Object { $_.Name -match '[^\x20-\x7E]' }`) cleaned one such directory.
- This is a known Windows + .NET test SDK issue where temp output directories can have encoding artifacts.

## Scope
- **Investigation**: Reproduce the issue, identify the root cause (test path or test infrastructure).
- **Fix**: If root cause is identified and fix is small, update test helper/test code to use safe temp paths and cleanup.
- **Documentation**: If root cause is not reliably identified, record reproduction status and recommend focused follow-up.
- The fix direction: Tests must not create top-level temp directories in repo root. They should use `Path.GetTempPath()` or the project's existing `TempRepository` helper.

## Out of scope (absolute prohibitions)
- No release changes.
- No package metadata changes.
- No NuGet/tag/GitHub Release mutation.
- No workflow dispatch.
- No version bump.
- No broad refactor.
- No .gitignore blanket ignore for weird Unicode names unless a separate policy task explicitly justifies it.
- No changes to `README.nuget.md`, `.csproj` package metadata, or release workflows.

## Affected files (if fix is made)
- Potentially `tests/AgentContextKit.Tests/AgentContextKitBehaviorTests.cs` (TempRepository or test setup)
- Potentially `tests/AgentContextKit.Tests/ReleaseDeploymentFailureGuardTests.cs`
- Potentially `tests/AgentContextKit.Tests/HostedChecksSummaryScriptTests.cs`
- Potentially other test files

## Investigation approach

### Step 1: Check for pre-existing weird dirs and running full test suite
```powershell
$before = Get-ChildItem -Force -Directory | Where-Object {
  $_.Name -match '[^\x20-\x7E]' -or $_.Name -match '[\uFEFF\uFFFD]'
}
if ($before) {
  Write-Host "Pre-existing weird dirs before investigation:"
  $before | Select-Object Name, FullName, LastWriteTime | Format-Table -AutoSize
  $before | ForEach-Object { Remove-Item -LiteralPath $_.FullName -Recurse -Force }
}
```

### Step 2: Run full test suite and check for weird dirs
```powershell
dotnet test AgentContextKit.sln -c Release --no-build

$after = Get-ChildItem -Force -Directory | Where-Object {
  $_.Name -match '[^\x20-\x7E]' -or $_.Name -match '[\uFEFF\uFFFD]'
}
if ($after) {
  Write-Host "Weird dirs after full test:"
  $after | Select-Object Name, FullName, LastWriteTime | Format-Table -AutoSize
}
```

### Step 3: If reproduced, narrow by test class
Run focused test groups to identify the specific test path responsible.

### Step 4: Search likely root causes
Look for:
- Tests that use `Directory.CreateDirectory` / `Path.Combine` in repo root
- Tests that spawn processes with `WorkingDirectory` set to repo root
- PowerShell scripts that create temp directories
- xUnit or .NET test SDK output directory behavior

### Step 5: Implement fix
If root cause is identified:
- Use `Path.GetTempPath()` + `Path.Combine(Path.GetTempPath(), "ackit-tests", Guid.NewGuid().ToString("N"))`
- Or use the existing `TempRepository.Create()` helper
- Ensure cleanup in `finally` blocks or `Dispose` patterns

### Step 6: Validation
```powershell
dotnet restore AgentContextKit.sln
dotnet build AgentContextKit.sln -c Release --no-restore
dotnet test AgentContextKit.sln -c Release --no-build

$weird = Get-ChildItem -Force -Directory | Where-Object {
  $_.Name -match '[^\x20-\x7E]' -or $_.Name -match '[\uFEFF\uFFFD]'
}
if ($weird) {
  Write-Host "Unexpected weird dirs after validation:"
  $weird | Format-Table Name, FullName -AutoSize
  $weird | ForEach-Object { Remove-Item -LiteralPath $_.FullName -Recurse -Force }
  throw "Windows Unicode temp directory issue still reproduced."
}

ackit doctor
ackit scan --ci
git diff --check
```

## Acceptance criteria
- Root cause is identified or reproduction is reliably documented.
- If a fix is made, tests use safe temp paths and cleanup properly.
- No Unicode/temp directories appear in the repo root after validation.
- Test suite remains 428/428 passing.
- No release/tag/NuGet/workflow/version state changes.

## Risk assessment
- Low risk if only test helper paths are changed.
- Medium risk if test infrastructure is changed incorrectly (could break CI or flake tests).
- Code changes are contained to test files only.
- Release state is not affected.

## Rollback
- If the fix introduces test failures, revert the commit and record the failed approach in this task doc.
- The no-fix scenario (root cause recorded only) has no rollback risk.

## Completion notes
(To be filled during investigation)

## Evidence
(To be filled during investigation)
