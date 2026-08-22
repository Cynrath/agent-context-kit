import { describe, expect, it } from "vitest";
import * as ackit from "../../../src/index.js";

/** Documented public allowlist (REQ-API-001). Any diff = contract change. */
const ALLOWLIST = [
  "scanRepository",
  "buildInstructionGraph",
  "resolveEffectiveStack",
  "buildContextPack",
  "loadAckitConfig",
  "validateSkills",
].sort();

describe("public API surface (REQ-API-001)", () => {
  it("exports exactly the documented allowlist — no deep/internal leaks", () => {
    const exported = Object.keys(ackit).sort();
    expect(exported).toEqual(ALLOWLIST);
  });

  it("exposes functions, not classes or mutable state", () => {
    for (const name of ALLOWLIST) {
      const value = (ackit as Record<string, unknown>)[name];
      expect(typeof value).toBe("function");
    }
  });
});
