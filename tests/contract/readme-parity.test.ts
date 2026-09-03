import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { promises as fsp } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd());
function sha256(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}
function normalizeEol(s: string): string {
  return s.replace(/\r\n/g, "\n");
}

describe("npm README parity", () => {
  it("package.json files includes README.md", async () => {
    const pkg = JSON.parse(await fsp.readFile(path.join(repoRoot, "package.json"), "utf8"));
    expect(pkg.files).toContain("README.md");
  });

  it("root README contains current-version badges and examples (not stale older lines)", async () => {
    const readme = await fsp.readFile(path.join(repoRoot, "README.md"), "utf8");
    const pkg = JSON.parse(await fsp.readFile(path.join(repoRoot, "package.json"), "utf8")) as {
      version: string;
    };
    const ver = pkg.version; // single source of truth, dynamic across releases
    expect(ver).toMatch(/^\d+\.\d+\.\d+$/);
    expect(readme).toContain(`v${ver}`);
    expect(readme).toContain(`npm%20v${ver}`);
    expect(readme).toContain(`release-v${ver}`);
    expect(readme).toContain(`npx --yes @cynrath/agent-context-kit@${ver}`);
    expect(readme).toContain(`Cynrath/agent-context-kit@v${ver}`);
    // Ensure old version not present in badge areas (allow docs/v0.2.0 folder reference)
    // The only allowed old line there is in docs/v0.2.0 paths and legacy notes
    const withoutDocs = readme.replaceAll("docs/v0.2.0", "");
    // Check that npm badge not stale
    expect(withoutDocs).not.toContain("npm%20v0.2.0");
    expect(withoutDocs).not.toContain("release-v0.2.0");
    // Ensure the previous minor's stale badges are gone (dynamic across releases)
    const [badgeMajor = 0, badgeMinor = 0] = ver.split(".").map(Number);
    if (badgeMinor > 0) {
      const prevMinor = `${badgeMajor}.${badgeMinor - 1}`;
      expect(withoutDocs).not.toContain(`npm%20v${prevMinor}`);
      expect(withoutDocs).not.toContain(`release-v${prevMinor}`);
    }
  });

  it("npm pack tarball README equals repo-root README (normalized EOL)", async () => {
    const tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), "ackit-parity-test-"));
    const extractDir = await fsp.mkdtemp(path.join(os.tmpdir(), "ackit-parity-extract-"));
    try {
      // Pack WITHOUT running lifecycle scripts (--ignore-scripts): the
      // prepack hook (pnpm build && pnpm gen:schemas) rewrites dist/ and
      // schemas/ — racing sibling tests that read those files in the same
      // parallel vitest run (root cause of parallel-mode flakiness). dist/
      // must already exist (pnpm build precedes the test suite), so the
      // tarball content is identical either way; the parity assertion is
      // unchanged.
      execSync(`npm pack --ignore-scripts --pack-destination "${tmpDir}"`, {
        cwd: repoRoot,
        stdio: "pipe",
        encoding: "utf8",
      });
      const files = await fsp.readdir(tmpDir);
      const tgz = files.find((f) => f.endsWith(".tgz"));
      expect(tgz).toBeDefined();
      const tarball = path.join(tmpDir, tgz as string);
      const list = execSync(`tar -tzf "${tarball}"`, { encoding: "utf8" }) as string;
      expect(list).toContain("package/README.md");

      // Extract and compare
      execSync(`tar -xzf "${tarball}" -C "${extractDir}" package/README.md`, { encoding: "utf8" });
      const packed = await fsp.readFile(path.join(extractDir, "package", "README.md"), "utf8");
      const root = await fsp.readFile(path.join(repoRoot, "README.md"), "utf8");
      const equal = root === packed || normalizeEol(root) === normalizeEol(packed);
      if (!equal) {
        console.error("root hash", sha256(Buffer.from(root)));
        console.error("packed hash", sha256(Buffer.from(packed)));
      }
      expect(equal).toBe(true);

      // Record SHA for evidence
      const rootHash = sha256(Buffer.from(normalizeEol(root)));
      const packedHash = sha256(Buffer.from(normalizeEol(packed)));
      expect(rootHash).toEqual(packedHash);
      console.log(`[readme-parity-test] root SHA-256: ${rootHash}`);
    } finally {
      await fsp.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
      await fsp.rm(extractDir, { recursive: true, force: true }).catch(() => {});
    }
    // 120000: npm pack + tar extraction measured ~35s alone on slow CI
    // Windows runners; the previous 30000 cap produced load-dependent
    // timeouts there.
  }, 120000);

  it("tarball audit: no secrets, no absolute local paths", async () => {
    const tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), "ackit-audit-test-"));
    try {
      // --ignore-scripts: same rationale as the parity pack above (avoid
      // prepack's dist//schemas/ rewrite racing parallel sibling tests).
      execSync(`npm pack --ignore-scripts --pack-destination "${tmpDir}"`, {
        cwd: repoRoot,
        stdio: "pipe",
      });
      const files = await fsp.readdir(tmpDir);
      const tgz = files.find((f) => f.endsWith(".tgz"));
      const tarball = path.join(tmpDir, tgz as string);
      const extractDir = await fsp.mkdtemp(path.join(os.tmpdir(), "ackit-audit-extract-"));
      execSync(`tar -xzf "${tarball}" -C "${extractDir}"`, { encoding: "utf8" });
      const _allFiles = await fsp.readdir(path.join(extractDir, "package"), {
        recursive: true,
      } as unknown as { recursive: boolean });
      // Check file list whitelist
      const list = execSync(`tar -tzf "${tarball}"`, { encoding: "utf8" });
      const lines = list.split("\n").filter(Boolean);
      // Must contain dist, templates, schemas, README.md, CHANGELOG.md, LICENSE
      expect(lines.some((l) => l.includes("dist/"))).toBe(true);
      expect(lines.some((l) => l.includes("README.md"))).toBe(true);
      // No secrets in packed files (simple check)
      const packedReadme = await fsp.readFile(
        path.join(extractDir, "package", "README.md"),
        "utf8",
      );
      expect(packedReadme).not.toMatch(/AKIA[0-9A-Z]{16}/);
      expect(packedReadme).not.toMatch(/ghp_[0-9A-Za-z]{36}/);
      // No absolute local paths like O:\ or /home/
      expect(packedReadme).not.toMatch(/O:\\/);
      expect(packedReadme).not.toMatch(/\/home\//);
      // No benchmark clones
      expect(list).not.toMatch(/benchmarks\/clone/);
      await fsp.rm(extractDir, { recursive: true, force: true }).catch(() => {});
    } finally {
      await fsp.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
    // 120000: same rationale as the parity test above (pack on slow CI).
  }, 120000);
});
