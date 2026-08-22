import { describe, expect, it } from "vitest";
import {
  type AckitConfig,
  AckitConfigSchema,
  CONFIG_SCHEMA_VERSION,
  DEFAULT_CONFIG,
} from "../../../src/core/config/schema.js";

describe("AckitConfigSchema", () => {
  it("applies every documented default", () => {
    const parsed = AckitConfigSchema.parse({ schemaVersion: CONFIG_SCHEMA_VERSION });
    expect(parsed).toEqual<AckitConfig>({
      schemaVersion: 1,
      scan: { include: [], exclude: [], severityThreshold: "low" },
      limits: {},
      instructions: { enabled: true, maxTokenEstimatePerFile: 20000 },
      skills: { enabled: true },
      context: { maxTokens: 100000 },
      policy: { extends: [] },
      baseline: undefined,
      output: { format: "terminal" },
      cache: { enabled: true },
      workspaces: { enabled: false },
    });
  });

  it("types each section independently (table-driven)", () => {
    const cases: { name: string; section: Record<string, unknown>; key: keyof AckitConfig }[] = [
      {
        name: "scan threshold enum",
        section: { schemaVersion: 1, scan: { severityThreshold: "critical" } },
        key: "scan",
      },
      {
        name: "limits ints",
        section: { schemaVersion: 1, limits: { maxFiles: 10 } },
        key: "limits",
      },
      {
        name: "context budget",
        section: { schemaVersion: 1, context: { maxTokens: 5_000 } },
        key: "context",
      },
      {
        name: "output format",
        section: { schemaVersion: 1, output: { format: "sarif" } },
        key: "output",
      },
    ];
    for (const testCase of cases) {
      const result = AckitConfigSchema.safeParse(testCase.section);
      expect(result.success, testCase.name).toBe(true);
    }
  });

  it("rejects invalid values with precise issues", () => {
    expect(
      AckitConfigSchema.safeParse({ schemaVersion: 1, scan: { severityThreshold: "extreme" } })
        .success,
    ).toBe(false);
    expect(
      AckitConfigSchema.safeParse({ schemaVersion: 1, limits: { maxFiles: -3 } }).success,
    ).toBe(false);
    expect(AckitConfigSchema.safeParse({ schemaVersion: 2 }).success).toBe(false);
  });

  it("exposes stable defaults object for merge tests", () => {
    expect(DEFAULT_CONFIG.schemaVersion).toBe(CONFIG_SCHEMA_VERSION);
  });
});
