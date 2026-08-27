import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { promises as fsp } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd());
function sha256(buf) {
  return createHash("sha256").update(buf).digest("hex");
}
function normalizeEol(s) {
  return s.replace(/\r\n/g, "\n");
}

describe("npm README parity", () => {
  it("package.json files includes README.md", async () => {
    const pkg = JSON.parse(await fsp.readFile(path.join(repoRoot, "package.json"), "utf8"));
    expect(pkg.files).toContain("README.md");
  });

  it("root README contains v0.2.1 badges and examples (not stale 0.2.0)", async () => {
    const readme = await fsp.readFile(path.join(repoRoot, "README.md"), "utf8");
    expect(readme).toContain("v0.2.1");
    expect(readme).toContain("npm%20v0.2.1");
    expect(readme).toContain("release-v0.2.1");
    expect(readme).toContain("npx --yes @cynrath/agent-context-kit@0.2.1");
    expect(readme).toContain("Cynrath/agent-context-kit@v0.2.1");
    // Ensure old version not present in badge areas (allow docs/v0.2.0 folder reference)
    // The only allowed 0.2.0 is in docs/v0.2.0 path and legacy notes
    const withoutDocs = readme.replaceAll("docs/v0.2.0", "");
    // Remove the versioning line's legacy part? The line now is 0.2.1, so no 0.2.0 should remain in code examples
    // Check that npm badge not 0.2.0
    expect(withoutDocs).not.toContain("npm%20v0.2.0");
    expect(withoutDocs).not.toContain("release-v0.2.0");
  });

  it("npm pack tarball README equals repo-root README (normalized EOL)", async () => {
    const tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), "ackit-parity-test-"));
    const extractDir = await fsp.mkdtemp(path.join(os.tmpdir(), "ackit-parity-extract-"));
    try {
      // Pack
      execSync(`pnpm pack --pack-destination "${tmpDir}"`, {
        cwd: repoRoot,
        stdio: "pipe",
        encoding: "utf8",
      });
      const files = await fsp.readdir(tmpDir);
      const tgz = files.find((f) => f.endsWith(".tgz"));
      expect(tgz).toBeDefined();
      const tarball = path.join(tmpDir, tgz);
      const list = execSync(`tar -tzf "${tarball}"`, { encoding: "utf8" });
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
  });

  it("tarball audit: no secrets, no absolute local paths", async () => {
    const tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), "ackit-audit-test-"));
    try {
      execSync(`pnpm pack --pack-destination "${tmpDir}"`, {
        cwd: repoRoot,
        stdio: "pipe",
      });
      const files = await fsp.readdir(tmpDir);
      const tgz = files.find((f) => f.endsWith(".tgz"));
      const tarball = path.join(tmpDir, tgz);
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
  });
});
