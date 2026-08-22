import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { renderMarkdownReport } from "../../../src/core/reporting/index.js";
import { getPackageIdentity } from "../../../src/shared/version.js";

const REPO_ROOT = process.cwd();

/** Packaging allowlist (REQ-PKG-001): everything in the tarball must fit these prefixes. */
const ALLOWED_PREFIXES = [
  "dist/",
  "templates/",
  "schemas/",
  "package.json",
  "README.md",
  "CHANGELOG.md",
  "LICENSE",
];

function listTarball(tarball: string): string[] {
  const out = execFileSync("tar", ["-tzf", tarball], { encoding: "utf8" });
  return out
    .split(/\r?\n/)
    .filter((line) => line.length > 0)
    .map((line) => line.replace(/^package\//, ""));
}

describe("tarball contents inspection (REQ-PKG-001)", () => {
  it("packed tarball fits the files allowlist with no tests/cache/artifacts", () => {
    const work = mkdtempSync(path.join(tmpdir(), "ackit-inspect-"));
    try {
      execFileSync("pnpm.cmd", ["pack", "--pack-destination", work], {
        cwd: REPO_ROOT,
        encoding: "utf8",
        shell: process.platform === "win32",
      });
      const tarballName = readdirSync(work).find((entry) => entry.endsWith(".tgz"));
      expect(tarballName).toBeDefined();
      const files = listTarball(path.join(work, tarballName as string));

      const violations = files.filter((file) => {
        if (file.endsWith("/")) return false;
        return !ALLOWED_PREFIXES.some((prefix) => file === prefix || file.startsWith(prefix));
      });
      expect(violations).toEqual([]);
      expect(files.some((file) => file.startsWith("tests/"))).toBe(false);
      expect(files.some((file) => file.includes(".ackit/"))).toBe(false);
      expect(files.some((file) => file.startsWith("artifacts/"))).toBe(false);
    } finally {
      rmSync(work, { recursive: true, force: true });
    }
  }, 180000);
});

describe("version identity triple-check (REQ-ARCH-009)", () => {
  it("CLI --version == single-source identity == report header == package.json", async () => {
    const pkgVersion = getPackageIdentity().version;
    void pkgVersion;

    const cliVersion = execFileSync(
      process.execPath,
      [path.join(REPO_ROOT, "dist", "cli", "index.js"), "--version"],
      { encoding: "utf8" },
    ).trim();
    expect(cliVersion).toBe(getPackageIdentity().version);

    const fsp = await import("node:fs/promises");
    const pkg = JSON.parse(await fsp.readFile(path.join(REPO_ROOT, "package.json"), "utf8")) as {
      version: string;
    };
    expect(pkg.version).toBe(pkgVersion);

    const markdown = renderMarkdownReport([], { filesScanned: 0 });
    expect(markdown).toContain(`ackit ${pkgVersion}`);
  });

  it("real tarball installs into a temp consumer and the installed CLI passes smoke", () => {
    const work = mkdtempSync(path.join(tmpdir(), "ackit-tar-e2e-"));
    try {
      execFileSync("pnpm.cmd", ["run", "smoke:package"], {
        cwd: REPO_ROOT,
        encoding: "utf8",
        shell: process.platform === "win32",
        timeout: 300000,
      });
    } finally {
      rmSync(work, { recursive: true, force: true });
    }
  }, 360000);
});
