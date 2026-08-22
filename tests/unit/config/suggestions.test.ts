import { describe, expect, it } from "vitest";
import { nearestKey } from "../../../src/core/config/errors.js";

describe("did-you-mean suggestions", () => {
  it.each([
    ["scna", "scan"],
    ["limts", "limits"],
    ["cach", "cache"],
    ["workspce", "workspaces"],
    ["sevverityThreshold", "severityThreshold"],
  ])("suggests the nearest allowed key for '%s'", (input, expected) => {
    expect(nearestKey(input, ["scan", "limits", "cache", "workspaces", "severityThreshold"])).toBe(
      expected,
    );
  });

  it("returns undefined when nothing is close", () => {
    expect(nearestKey("completely-unrelated-key-name", ["scan", "limits"])).toBeUndefined();
  });
});
