import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { getPackageIdentity } from "../../src/shared/version.js";

const PACKAGE_JSON_URL = new URL("../../package.json", import.meta.url);

function readPackageVersion(): string {
  const pkg = JSON.parse(readFileSync(fileURLToPath(PACKAGE_JSON_URL), "utf8")) as {
    version?: unknown;
    name?: unknown;
  };
  if (typeof pkg.version !== "string" || typeof pkg.name !== "string") {
    throw new Error("package.json is missing name/version");
  }
  return pkg.version;
}

describe("version single source of truth (REQ-ARCH-009)", () => {
  it("reports the exact version recorded in package.json", () => {
    expect(getPackageIdentity().version).toBe(readPackageVersion());
  });

  it("reports the package name recorded in package.json", () => {
    expect(getPackageIdentity().name).toBe("@cynrath/agent-context-kit");
  });

  it("uses a strict semver-shaped version", () => {
    expect(getPackageIdentity().version).toMatch(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/);
  });
});
