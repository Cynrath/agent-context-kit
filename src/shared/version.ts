import { createRequire } from "node:module";

export interface PackageIdentity {
  name: string;
  version: string;
}

let cachedIdentity: PackageIdentity | undefined;

/**
 * Reads package identity from package.json — the single source of truth for
 * version/identity across CLI help, MCP identity, and reports (REQ-ARCH-009).
 * Resolved relative to this module so it works from src/, dist/, and an
 * installed node_modules layout alike.
 */
export function getPackageIdentity(): PackageIdentity {
  cachedIdentity ??= readIdentity();
  return cachedIdentity;
}

function readIdentity(): PackageIdentity {
  const require = createRequire(import.meta.url);
  const pkg = require("../../package.json") as Partial<PackageIdentity> | undefined;
  if (
    !pkg ||
    typeof pkg.version !== "string" ||
    pkg.version.length === 0 ||
    typeof pkg.name !== "string" ||
    pkg.name.length === 0
  ) {
    throw new Error("ACKIT-INTERNAL-001: package identity missing from package.json");
  }
  return { name: pkg.name, version: pkg.version };
}
