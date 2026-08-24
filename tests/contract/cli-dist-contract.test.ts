import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const DIST_CLI = `${REPO_ROOT}dist/cli/index.js`;

function requireBuiltCli(): void {
  if (!existsSync(DIST_CLI)) {
    throw new Error(`dist/cli/index.js not found — run 'pnpm build' before the contract suite`);
  }
}

function runDistCli(args: string[]): { stdout: string; status: number } {
  try {
    const stdout = execFileSync(process.execPath, [DIST_CLI, ...args], {
      encoding: "utf8",
      env: { ...process.env, ACKIT_DEBUG: undefined },
    });
    return { stdout, status: 0 };
  } catch (error) {
    const err = error as { status?: number; stdout?: string };
    return { stdout: err.stdout ?? "", status: err.status ?? -1 };
  }
}

describe("built dist CLI contract", () => {
  // Each assertion spawns the real built executable; cold process starts can
  // exceed the default 5 s budget under parallel load, so give them room.
  it("prints the package.json version via --version from the single source of truth", () => {
    requireBuiltCli();
    const pkg = JSON.parse(readFileSync(`${REPO_ROOT}package.json`, "utf8")) as {
      version: string;
    };
    const result = runDistCli(["--version"]);
    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe(pkg.version);
  }, 60_000);

  it("keeps stdout pure JSON in --json mode and exits 0", () => {
    requireBuiltCli();
    const result = runDistCli(["--json"]);
    expect(result.status).toBe(0);
    const parsed = JSON.parse(result.stdout) as { schemaVersion?: unknown; status?: unknown };
    expect(parsed.schemaVersion).toBe("ackit.summary.v0");
    expect(parsed.status).toBe("ok");
  }, 60_000);

  it("exits with code 2 on invalid usage from the real executable", () => {
    requireBuiltCli();
    const result = runDistCli(["--definitely-not-an-option"]);
    expect(result.status).toBe(2);
  }, 60_000);
});
