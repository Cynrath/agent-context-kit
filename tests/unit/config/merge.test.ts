import { describe, expect, it } from "vitest";
import { applyLayers } from "../../../src/core/config/load.js";
import { type AckitConfigLayer, DEFAULT_CONFIG } from "../../../src/core/config/schema.js";

/**
 * Deterministic merge precedence table (REQ-CFG-003):
 * defaults < config < policy extends < CLI flags.
 */
describe("config layer merge precedence", () => {
  const policyLayer: AckitConfigLayer = {
    scan: { severityThreshold: "medium" },
    limits: { maxFiles: 1000 },
  };

  const cliLayer: AckitConfigLayer = {
    context: { maxTokens: 10_000 },
  };

  it("defaults survive when no layers are provided", () => {
    const result = applyLayers(DEFAULT_CONFIG, undefined, undefined, undefined);
    expect(result).toEqual(DEFAULT_CONFIG);
  });

  it("policy layer overrides defaults for the same key", () => {
    const result = applyLayers(DEFAULT_CONFIG, undefined, policyLayer, undefined);
    expect(result.scan.severityThreshold).toBe("medium");
  });

  it("cli layer wins over both defaults and policy", () => {
    const result = applyLayers(DEFAULT_CONFIG, undefined, policyLayer, cliLayer);
    expect(result.context.maxTokens).toBe(10_000);
    expect(result.scan.severityThreshold).toBe("medium");
  });

  it("untouched keys survive deep merges", () => {
    const result = applyLayers(DEFAULT_CONFIG, undefined, policyLayer, cliLayer);
    expect(result.limits.maxFiles).toBe(1000);
    expect(result.output.format).toBe("terminal");
  });

  it("arrays replace wholesale instead of concatenating", () => {
    const result = applyLayers(
      DEFAULT_CONFIG,
      undefined,
      { scan: { include: ["a", "b"] } },
      { scan: { include: ["c"] } },
    );
    expect(result.scan.include).toEqual(["c"]);
  });

  it("does not mutate its inputs", () => {
    const policy = { scan: { severityThreshold: "critical" } } satisfies AckitConfigLayer;
    applyLayers(DEFAULT_CONFIG, undefined, policy, undefined);
    expect(policy.scan?.severityThreshold).toBe("critical");
    expect(DEFAULT_CONFIG.scan.severityThreshold).toBe("low");
  });
});
