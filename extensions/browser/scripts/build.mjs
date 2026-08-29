#!/usr/bin/env node
import { promises as fsp } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const srcRoot = path.join(root, "src");
const distRoot = path.join(root, "dist");

async function ensureDir(dir) {
  await fsp.mkdir(dir, { recursive: true });
}

async function build() {
  await ensureDir(path.join(distRoot, "background"));
  await ensureDir(path.join(distRoot, "sidepanel"));
  await ensureDir(path.join(distRoot, "content"));

  // Copy static assets (html, css)
  await fsp.copyFile(path.join(srcRoot, "sidepanel", "sidepanel.html"), path.join(distRoot, "sidepanel", "sidepanel.html"));
  await fsp.copyFile(path.join(srcRoot, "sidepanel", "sidepanel.css"), path.join(distRoot, "sidepanel", "sidepanel.css"));

  const esbuildBin = path.join(root, "..", "vscode", "node_modules", "esbuild", "bin", "esbuild");
  const { spawnSync } = await import("node:child_process");
  const opts = { stdio: "inherit", cwd: root };

  function runEsbuild(entry, outfile, format) {
    const args = [esbuildBin, entry, "--bundle", "--platform=browser", "--target=chrome114", `--format=${format}`, `--outfile=${outfile}`, "--sourcemap"];
    const result = spawnSync(process.execPath, args, opts);
    if (result.status !== 0) throw new Error(`esbuild failed for ${entry}`);
  }

  try {
    runEsbuild(path.join(srcRoot, "background", "service-worker.ts"), path.join(distRoot, "background", "service-worker.js"), "esm");
    runEsbuild(path.join(srcRoot, "sidepanel", "sidepanel.ts"), path.join(distRoot, "sidepanel", "sidepanel.js"), "esm");
    runEsbuild(path.join(srcRoot, "content", "content.ts"), path.join(distRoot, "content", "content.js"), "iife");
    console.log("[browser] esbuild bundle complete");
    return;
  } catch (error) {
    console.warn("[browser] esbuild via vscode bin failed, trying npx fallback:", error);
    const npxBin = process.platform === "win32" ? "npx.cmd" : "npx";
    function runNpx(entry, outfile, format) {
      const args = ["-y", "esbuild", entry, "--bundle", "--platform=browser", "--target=chrome114", `--format=${format}`, `--outfile=${outfile}`, "--sourcemap"];
      const result = spawnSync(npxBin, args, opts);
      if (result.status !== 0) throw new Error(`npx esbuild failed for ${entry}`);
    }
    runNpx(path.join(srcRoot, "background", "service-worker.ts"), path.join(distRoot, "background", "service-worker.js"), "esm");
    runNpx(path.join(srcRoot, "sidepanel", "sidepanel.ts"), path.join(distRoot, "sidepanel", "sidepanel.js"), "esm");
    runNpx(path.join(srcRoot, "content", "content.ts"), path.join(distRoot, "content", "content.js"), "iife");
    console.log("[browser] npx esbuild bundle complete");
  }
}

build().catch((e) => {
  console.error("[browser] build failed", e);
  process.exit(1);
});
