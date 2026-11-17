#!/usr/bin/env node
// An independent consumer must work from exported source, without ignored dist.
// Run through pnpm: pnpm run smoke:action [--ref vX.Y.Z]
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const work = mkdtempSync(path.join(tmpdir(), "ackit-action-consumer-"));
// Validate the immutable recursive-cleanup target before any fixture work.
if (
  path.dirname(work) !== path.resolve(tmpdir()) ||
  !path.basename(work).startsWith("ackit-action-consumer-")
) {
  throw new Error("Unsafe cleanup boundary");
}
const source = path.join(work, "action");
const consumer = path.join(work, "consumer");
const pnpmCli = process.env.npm_execpath;
if (!pnpmCli || !existsSync(pnpmCli)) throw new Error("Run this smoke with pnpm run smoke:action");
const paths = [
  "src",
  "templates",
  "schemas",
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "tsconfig.json",
  "tsconfig.build.json",
  "extensions/vscode/package.json",
  "action.yml",
];

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    timeout: 180_000,
    windowsHide: true,
    ...options,
  });
  if (result.status !== 0)
    throw new Error(
      `consumer setup failed: ${result.stderr ?? result.error?.message ?? "unknown"}`,
    );
  return result.stdout;
}

try {
  mkdirSync(source);
  mkdirSync(consumer);
  const refIndex = process.argv.indexOf("--ref");
  if (refIndex !== -1) {
    const ref = process.argv[refIndex + 1];
    if (!ref || !/^v\d+\.\d+\.\d+$/.test(ref)) throw new Error("Expected exact release tag");
    const archive = path.join(work, "action.tar");
    run("git", ["archive", "--format=tar", `--output=${archive}`, ref, ...paths]);
    run("tar", ["-xf", archive, "-C", source]);
  } else {
    const files = run("git", [
      "ls-files",
      "--cached",
      "--others",
      "--exclude-standard",
      "-z",
      "--",
      ...paths,
    ])
      .split("\0")
      .filter(Boolean);
    for (const file of files) {
      const destination = path.resolve(source, file);
      if (!destination.startsWith(`${source}${path.sep}`)) throw new Error("Invalid export path");
      mkdirSync(path.dirname(destination), { recursive: true });
      copyFileSync(path.join(root, file), destination);
    }
  }
  if (existsSync(path.join(source, "dist")) || existsSync(path.join(source, "node_modules")))
    throw new Error("Export must start without runtime");
  run(
    process.execPath,
    [
      pnpmCli,
      "install",
      "--frozen-lockfile",
      "--ignore-scripts",
      "--filter",
      "@cynrath/agent-context-kit",
    ],
    { cwd: source },
  );
  run(process.execPath, [pnpmCli, "build"], { cwd: source });
  run("git", ["init", "-q"], { cwd: consumer });
  writeFileSync(path.join(consumer, "AGENTS.md"), "# Consumer\nReview changes.\n");
  writeFileSync(path.join(consumer, "sample.txt"), "TODO: review fixture\n");
  const runAction = (threshold, args = "", expected = 0) => {
    const outputs = mkdtempSync(path.join(work, "outputs-"));
    const result = spawnSync(process.execPath, [path.join(source, "dist/action/index.js")], {
      cwd: consumer,
      encoding: "utf8",
      timeout: 60_000,
      windowsHide: true,
      env: {
        ...process.env,
        INPUT_COMMAND: "scan",
        INPUT_ARGS: args,
        INPUT_FAIL_THRESHOLD: threshold,
        INPUT_UPLOAD_SARIF: "true",
        RUNNER_TEMP: outputs,
        ACKIT_ROOT: consumer,
      },
    });
    if (result.status !== expected)
      throw new Error(`Action expected ${expected}, got ${result.status}: ${result.stderr}`);
    return outputs;
  };
  const outputs = runAction("high");
  const report = JSON.parse(readFileSync(path.join(outputs, "ackit-findings.json"), "utf8"));
  if (!report.findings.some((finding) => finding.relativePath === "sample.txt"))
    throw new Error("Action did not scan consumer");
  const sarif = JSON.parse(readFileSync(path.join(outputs, "ackit.sarif"), "utf8"));
  const version = JSON.parse(readFileSync(path.join(source, "package.json"), "utf8")).version;
  if (sarif.version !== "2.1.0" || sarif.runs[0].tool.driver.version !== version)
    throw new Error("SARIF identity mismatch");
  runAction("low", "", 1);
  runAction("high", "--unknown-option", 2);
  if (existsSync(path.join(consumer, "node_modules")) || existsSync(path.join(consumer, "dist")))
    throw new Error("Consumer must not supply runtime");
  console.log(
    `Action external-consumer PASS (${version}; clean source, threshold pass/fail, CLI error, SARIF)`,
  );
} finally {
  rmSync(work, { recursive: true, force: true });
}
