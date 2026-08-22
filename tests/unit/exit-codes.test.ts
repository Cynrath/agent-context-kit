import { describe, expect, it } from "vitest";
import { EXIT_CODES } from "../../src/shared/exit-codes.js";

describe("EXIT_CODES", () => {
  it("matches the ADR-0007 taxonomy exactly", () => {
    expect(EXIT_CODES).toEqual({
      ok: 0,
      thresholdExceeded: 1,
      usage: 2,
      environment: 3,
      securityBoundary: 4,
      internal: 5,
    });
  });

  it("is deeply frozen", () => {
    expect(Object.isFrozen(EXIT_CODES)).toBe(true);
  });
});
