import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as ackit from "../../../src/index.js";

/** Documented public allowlist (REQ-API-001, REQ-V020-J-001). Any diff = contract change. */
const ALLOWLIST = [
  "AckitError",
  "BUILTIN_PROFILES",
  "CheckpointStore",
  "EvidenceStore",
  "HANDOFF_SCHEMA_ID_V2",
  "HandoffError",
  "IntentStore",
  "ProfileSchema",
  "READINESS_ENGINE_VERSION",
  "STATUS_SCHEMA_ID",
  "StateBindingError",
  "TaskStore",
  "VerdictStore",
  "WorkflowStore",
  "analyzeOptimize",
  "assessVerdictIndependence",
  "buildContextPack",
  "buildHandoff",
  "buildInstructionGraph",
  "buildStatusReport",
  "buildVerificationBundle",
  "compareStoredBinding",
  "computeStateBinding",
  "detectProfiles",
  "detectWorkflowDrift",
  "evaluateRulePacks",
  "intentFingerprint",
  "isBoundVerdict",
  "listRoles",
  "listWorkflowProfiles",
  "loadAckitConfig",
  "loadBuiltInProfiles",
  "loadRole",
  "loadRulePacks",
  "normalizeIntent",
  "parseHandoffFile",
  "projectVerdictAuthoring",
  "renderHandoffPack",
  "renderResumeContext",
  "renderStatusReport",
  "requiredArtifacts",
  "resolveAutonomy",
  "resolveEffectiveStack",
  "resolveProfile",
  "resolveReview",
  "scanRepository",
  "scoreRepository",
  "validateEvidence",
  "validateHandoff",
  "validateSkills",
  "verdictContentDigest",
].sort();

// All extension points shipped in v0.2.0+ (scoreRepository, evaluateRulePack,
// etc.) are exported above; additions require ADR + allowlist update.
// New SDK surface since v0.1.1: AckitError (typed error model, REQ-V020-J-002)
// Workflow expansion (TASK-0059, ADR-0025..0028): typed workflow/intent/
// checkpoint/evidence/verdict/drift/policy/role additions — classes count as
// non-function values and are checked for existence below.

describe("public API surface (REQ-API-001)", () => {
  it("exports exactly the documented allowlist — no deep/internal leaks", () => {
    const exported = Object.keys(ackit).sort();
    expect(exported).toEqual(ALLOWLIST);
  });

  it("exposes functions/classes, not mutable state", () => {
    const nonFunctions = new Set([
      "ProfileSchema",
      "READINESS_ENGINE_VERSION",
      // v0.5 read-model contract ids (TASK-0083 parity): frozen strings.
      "HANDOFF_SCHEMA_ID_V2",
      "STATUS_SCHEMA_ID",
    ]);
    // BUILTIN_PROFILES is a frozen catalog constant (documented, read-only).
    const frozenConstants = new Set(["BUILTIN_PROFILES"]);
    for (const name of ALLOWLIST) {
      const value = (ackit as Record<string, unknown>)[name];
      if (nonFunctions.has(name)) {
        expect(value).toBeDefined();
        continue;
      }
      if (frozenConstants.has(name)) {
        expect(Object.isFrozen(value)).toBe(true);
        continue;
      }
      expect(typeof value).toBe("function");
    }
  });

  it("package.json exports allow only '.' and './mcp'", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
      exports: Record<string, unknown>;
      type: string;
      sideEffects: boolean;
      engines: { node: string };
    };
    expect(pkg.type).toBe("module");
    expect(pkg.sideEffects).toBe(false);
    expect(pkg.engines.node).toContain(">=22");
    const exportKeys = Object.keys(pkg.exports).sort();
    expect(exportKeys).toEqual([".", "./mcp"]);
    // No wildcard core exports
    expect(JSON.stringify(pkg.exports)).not.toContain("./core");
  });

  it("AckitError carries code and remediation", () => {
    const { AckitError } = ackit as unknown as {
      AckitError: new (
        code: string,
        msg: string,
        opts?: unknown,
      ) => { code: string; remediation?: string; name: string; message: string };
    };
    const err = new AckitError("CONFIG-UNKNOWN-KEY", "unknown key", {
      remediation: "did you mean 'scan'?",
    });
    expect(err.code).toBe("CONFIG-UNKNOWN-KEY");
    expect(err.remediation).toBe("did you mean 'scan'?");
    expect(err.name).toBe("AckitError");
    expect(err.message).toBe("unknown key");
  });
});
