import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as ackit from "../../../src/index.js";

/** Documented public allowlist (REQ-API-001, REQ-V020-J-001). Any diff = contract change. */
const ALLOWLIST = [
  "AckitError",
  "ProfileSchema",
  "READINESS_ENGINE_VERSION",
  "buildContextPack",
  "buildInstructionGraph",
  "detectProfiles",
  "evaluateRulePacks",
  "loadAckitConfig",
  "loadBuiltInProfiles",
  "loadRulePacks",
  "resolveEffectiveStack",
  "resolveProfile",
  "scanRepository",
  "scoreRepository",
  "validateSkills",
].sort();

// v0.2.0 reserved extension points (not yet exported):
// - scoreRepository (TASK-0008)
// - evaluateRulePack (TASK-0012)
// New SDK surface since v0.1.1: AckitError (typed error model, REQ-V020-J-002)

describe("public API surface (REQ-API-001)", () => {
  it("exports exactly the documented allowlist — no deep/internal leaks", () => {
    const exported = Object.keys(ackit).sort();
    expect(exported).toEqual(ALLOWLIST);
  });

  it("exposes functions/classes, not mutable state", () => {
    const nonFunctions = new Set(["ProfileSchema", "READINESS_ENGINE_VERSION"]);
    for (const name of ALLOWLIST) {
      const value = (ackit as Record<string, unknown>)[name];
      if (nonFunctions.has(name)) {
        expect(value).toBeDefined();
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
