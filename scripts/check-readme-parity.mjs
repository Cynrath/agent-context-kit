#!/usr/bin/env node

/**
 * README parity check — ensures npm tarball README equals repo-root README.
 * Preserves polished design, only factual version updates allowed.
 * Fails if they differ (byte-for-byte or normalized EOL).
 * Records SHA-256 for both.
 */

import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { promises as fsp } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function normalizeEol(text) {
  return text.replace(/\r\n/g, "\n");
}

async function main() {
  const rootReadmePath = path.join(repoRoot, "README.md");
  const rootContent = await fsp.readFile(rootReadmePath, "utf8");
  const rootHash = sha256(Buffer.from(rootContent, "utf8"));
  const rootHashNormalized = sha256(Buffer.from(normalizeEol(rootContent), "utf8"));
  console.log(`[readme-parity] root README SHA-256: ${rootHash}`);
  console.log(`[readme-parity] root README SHA-256 (normalized): ${rootHashNormalized}`);
  console.log(`[readme-parity] root README bytes: ${Buffer.byteLength(rootContent)}`);

  // Pack tarball to temp
  const tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), "ackit-parity-"));
  console.log(`[readme-parity] packing to ${tmpDir}`);
  try {
    // Use pnpm pack if available, fallback to npm pack
    let tarballPath = "";
    try {
      execSync(`pnpm pack --pack-destination "${tmpDir}"`, {
        cwd: repoRoot,
        stdio: "pipe",
        encoding: "utf8",
      });
      const files = await fsp.readdir(tmpDir);
      const tgz = files.find((f) => f.endsWith(".tgz"));
      if (!tgz) throw new Error("no tgz found after pnpm pack");
      tarballPath = path.join(tmpDir, tgz);
    } catch (e) {
      console.error(`[readme-parity] pnpm pack failed, trying npm pack: ${e.message}`);
      execSync(`npm pack --pack-destination "${tmpDir}" --json`, {
        cwd: repoRoot,
        stdio: "pipe",
      });
      const files = await fsp.readdir(tmpDir);
      const tgz = files.find((f) => f.endsWith(".tgz"));
      if (!tgz) throw new Error("no tgz after npm pack");
      tarballPath = path.join(tmpDir, tgz);
    }

    console.log(`[readme-parity] tarball: ${tarballPath}`);
    const stat = await fsp.stat(tarballPath);
    console.log(`[readme-parity] tarball bytes: ${stat.size}`);

    // List tarball contents
    const list = execSync(`tar -tzf "${tarballPath}"`, { encoding: "utf8" });
    console.log(
      `[readme-parity] tarball list (first 30):\n${list.split("\n").slice(0, 30).join("\n")}`,
    );
    if (!list.includes("package/README.md")) {
      console.error(
        "[readme-parity] FAIL — package/README.md not in tarball (files field missing?)",
      );
      process.exit(1);
    }

    // Extract README from tarball to temp
    const extractDir = await fsp.mkdtemp(path.join(os.tmpdir(), "ackit-parity-extract-"));
    execSync(`tar -xzf "${tarballPath}" -C "${extractDir}" package/README.md`, {
      encoding: "utf8",
    });
    const packedReadmePath = path.join(extractDir, "package", "README.md");
    const packedContent = await fsp.readFile(packedReadmePath, "utf8");
    const packedHash = sha256(Buffer.from(packedContent, "utf8"));
    const packedHashNormalized = sha256(Buffer.from(normalizeEol(packedContent), "utf8"));
    console.log(`[readme-parity] packed README SHA-256: ${packedHash}`);
    console.log(`[readme-parity] packed README SHA-256 (normalized): ${packedHashNormalized}`);
    console.log(`[readme-parity] packed README bytes: ${Buffer.byteLength(packedContent)}`);

    // Compare
    const equal = rootContent === packedContent;
    const equalNormalized = normalizeEol(rootContent) === normalizeEol(packedContent);
    console.log(`[readme-parity] byte-for-byte equal: ${equal}`);
    console.log(`[readme-parity] normalized-EOL equal: ${equalNormalized}`);

    if (equal || equalNormalized) {
      console.log("[readme-parity] PASS — README parity verified");
      // Also record for evidence
      console.log(`[readme-parity] root SHA-256: ${rootHash}`);
      console.log(`[readme-parity] packed SHA-256: ${packedHash}`);
      // Cleanup
      await fsp.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
      await fsp.rm(extractDir, { recursive: true, force: true }).catch(() => {});
      process.exit(0);
    } else {
      console.error("[readme-parity] FAIL — README mismatch (see diff below)");
      // Show diff snippet
      const rootLines = rootContent.split("\n");
      const packedLines = packedContent.split("\n");
      let diffCount = 0;
      for (let i = 0; i < Math.min(rootLines.length, packedLines.length); i++) {
        if (rootLines[i] !== packedLines[i]) {
          console.error(
            `  diff line ${i + 1}:\n    root:   ${JSON.stringify(rootLines[i])}\n    packed: ${JSON.stringify(packedLines[i])}`,
          );
          diffCount++;
          if (diffCount >= 5) break;
        }
      }
      if (rootLines.length !== packedLines.length) {
        console.error(`  line count root=${rootLines.length} packed=${packedLines.length}`);
      }
      await fsp.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
      await fsp.rm(extractDir, { recursive: true, force: true }).catch(() => {});
      process.exit(1);
    }
  } catch (e) {
    console.error(`[readme-parity] error: ${e.message}`);
    console.error(e.stack);
    await fsp.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    process.exit(2);
  }
}

main();
