import { readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// pnpm/action-setup resolves package_json_file with path.join(workspace, input).
// Always target this Action's manifest, including when the consumer is elsewhere.
const actionRoot = process.env.ACKIT_ACTION_PATH ?? fileURLToPath(new URL("../", import.meta.url));
const workspace = realpathSync(process.env.GITHUB_WORKSPACE ?? process.cwd());
const manifest = realpathSync(path.join(actionRoot, "package.json"));
const pkg = JSON.parse(readFileSync(manifest, "utf8"));
if (
  typeof pkg.packageManager !== "string" ||
  !/^pnpm@\d+\.\d+\.\d+(?:-[\w.-]+)?(?:\+\S+)?$/.test(pkg.packageManager)
)
  throw new Error("Action packageManager must pin an exact pnpm version");
const relative = path.relative(workspace, manifest);
if (!relative || path.isAbsolute(relative))
  throw new Error("Action manifest must be workspace-relative for pnpm setup");
console.log(`path=${relative}`);
