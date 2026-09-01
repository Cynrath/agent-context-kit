import { promises as fsp } from "node:fs";
import path from "node:path";
import {
  ROLE_PROBLEM_CODES,
  type RoleContract,
  RoleContractSchema,
  type RoleProblem,
} from "./types.js";

/** Built-in role catalog shipped as package data (ADR-0028 §4). */
export const BUILTIN_ROLES_DIR = "templates/roles";
/** Repository-defined roles (validated with the same schema). */
export const REPO_ROLES_DIR = "docs/roles";

/**
 * Load + validate roles: built-ins (packaged, authoritative) and optional
 * repository roles under docs/roles/*.yaml. Repository roles CANNOT shadow
 * built-in ids (refusal, THREAT_MODEL T25). Deterministic id ordering.
 */
export async function listRoles(
  repositoryRoot: string,
): Promise<{ roles: RoleContract[]; problems: RoleProblem[] }> {
  const problems: RoleProblem[] = [];
  const byId = new Map<string, RoleContract>();
  const { parse } = await import("yaml");

  // Built-ins resolve from the packaged templates directory relative to this
  // module (src|dist/core/roles → ../../../templates/roles) via import.meta.url,
  // so shipped data is authoritative in every installation layout (Windows-safe
  // via fileURLToPath). Works from both src (tests) and dist (package).
  const { fileURLToPath } = await import("node:url");
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const builtinDir = path.resolve(moduleDir, "..", "..", "..", BUILTIN_ROLES_DIR);

  async function loadDir(dir: string, source: "builtin" | "repository"): Promise<void> {
    let entries: string[];
    try {
      entries = await fsp.readdir(dir);
    } catch {
      return;
    }
    for (const entry of entries.sort()) {
      if (!entry.endsWith(".yaml")) continue;
      let raw: string;
      try {
        raw = await fsp.readFile(path.join(dir, entry), "utf8");
      } catch {
        continue;
      }
      let parsed: unknown;
      try {
        parsed = parse(raw);
      } catch {
        problems.push({
          code: ROLE_PROBLEM_CODES.schema,
          message: `${source} role '${entry}' is not valid YAML`,
        });
        continue;
      }
      const result = RoleContractSchema.safeParse(parsed);
      if (!result.success) {
        problems.push({
          code: ROLE_PROBLEM_CODES.schema,
          message: `${source} role '${entry}' failed schema validation (${result.error.issues.length} issue(s))`,
        });
        continue;
      }
      const role = result.data;
      if (byId.has(role.role)) {
        if (source === "repository") {
          problems.push({
            code: ROLE_PROBLEM_CODES.shadow,
            message: `repository role '${role.role}' refuses to shadow the built-in contract`,
          });
          continue;
        }
        problems.push({
          code: ROLE_PROBLEM_CODES.duplicate,
          message: `duplicate built-in role id '${role.role}'`,
        });
        continue;
      }
      byId.set(role.role, role);
    }
  }

  await loadDir(builtinDir, "builtin");
  await loadDir(path.join(repositoryRoot, ...REPO_ROLES_DIR.split("/")), "repository");

  const roles = [...byId.values()].sort((a, b) => (a.role < b.role ? -1 : 1));
  return { roles, problems };
}

export async function loadRole(
  repositoryRoot: string,
  roleId: string,
): Promise<{ role: RoleContract | null; problems: RoleProblem[] }> {
  const { roles, problems } = await listRoles(repositoryRoot);
  const role = roles.find((r) => r.role === roleId) ?? null;
  if (role === null) {
    problems.push({
      code: ROLE_PROBLEM_CODES.notFound,
      message: `role '${roleId}' does not exist`,
    });
  }
  return { role, problems };
}
