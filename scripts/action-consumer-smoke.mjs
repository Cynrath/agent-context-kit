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
import { runConsumerCommand } from "./consumer-command.mjs";

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
  "scripts/action-package-path.mjs",
];

function run(command, args, options = {}) {
  return runConsumerCommand(command, args, { cwd: root, ...options }, [
    [work, "<fixture>"],
    [root, "<source>"],
  ]);
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
  const manifestOutput = run(
    process.execPath,
    [path.join(source, "scripts/action-package-path.mjs")],
    {
      cwd: consumer,
      env: { ...process.env, GITHUB_WORKSPACE: consumer, ACKIT_ACTION_PATH: source },
    },
  ).trim();
  if (!manifestOutput.startsWith("path=")) throw new Error("Action manifest path output missing");
  const pinnedManifest = JSON.parse(
    readFileSync(path.join(consumer, manifestOutput.slice(5)), "utf8"),
  );
  if (
    pinnedManifest.packageManager !==
    JSON.parse(readFileSync(path.join(source, "package.json"), "utf8")).packageManager
  )
    throw new Error("Action manifest pin resolved to the consumer");
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
  const runAction = (threshold, args = "", expected = 0, command = "scan") => {
    const outputs = mkdtempSync(path.join(work, "outputs-"));
    const result = spawnSync(process.execPath, [path.join(source, "dist/action/index.js")], {
      cwd: consumer,
      encoding: "utf8",
      timeout: 60_000,
      windowsHide: true,
      env: {
        ...process.env,
        INPUT_COMMAND: command,
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
  const optimizeOutput = runAction("critical", "", 0, "optimize");
  const optimize = JSON.parse(
    readFileSync(path.join(optimizeOutput, "ackit-findings.json"), "utf8"),
  );
  if (optimize.suggestions.length === 0)
    throw new Error("Optimize fixture produced no suggestions");
  const optimizeSarif = JSON.parse(readFileSync(path.join(optimizeOutput, "ackit.sarif"), "utf8"));
  if (optimizeSarif.runs[0].results.length !== optimize.suggestions.length)
    throw new Error("Optimize SARIF projection missing suggestions");
  const cliOptimizeSarif = JSON.parse(
    run(
      process.execPath,
      [path.join(source, "dist/cli/index.js"), "optimize", "--format", "sarif"],
      { cwd: consumer },
    ),
  );
  if (JSON.stringify(cliOptimizeSarif) !== JSON.stringify(optimizeSarif))
    throw new Error("CLI/Action optimize SARIF mismatch");
  runAction("low", "", 1, "optimize");
  runAction("critical", "--unknown-option", 2, "optimize");
  runAction("critical", "check-active --ci", 0, "drift");
  writeFileSync(path.join(consumer, ".gitignore"), ".ackit/\n");
  run("git", ["config", "user.name", "fixture"], { cwd: consumer });
  run("git", ["config", "user.email", "fixture@example.invalid"], { cwd: consumer });
  run("git", ["add", "."], { cwd: consumer });
  run("git", ["-c", "commit.gpgsign=false", "commit", "-qm", "test: fixture baseline"], {
    cwd: consumer,
  });
  const task = JSON.parse(
    run(
      process.execPath,
      [
        path.join(source, "dist/cli/index.js"),
        "--json",
        "task",
        "create",
        "consumer drift fixture",
      ],
      { cwd: consumer },
    ),
  );
  const taskFile = path.join(consumer, task.file);
  const header = /^---\r?\n[\s\S]*?\r?\n---/.exec(readFileSync(taskFile, "utf8"))?.[0];
  if (!header) throw new Error("Generated task header missing");
  writeFileSync(
    taskFile,
    `${header}\n\n## Affected files\n\n- src/**\n\n## Acceptance criteria\n\n- [ ] fixture\n\n## Completion notes\n\nFixture remains pending.\n`,
  );
  writeFileSync(path.join(consumer, "UNPLANNED.md"), "# Fixture drift\n");
  const driftOutput = runAction("critical", `check ${task.created}`, 0, "drift");
  const drift = JSON.parse(readFileSync(path.join(driftOutput, "ackit-findings.json"), "utf8"));
  if (drift.findings.length === 0) throw new Error("Drift fixture produced no findings");
  runAction("low", `check ${task.created}`, 1, "drift");
  runAction(
    "critical",
    `check ${task.created} --ci`,
    drift.findings.some((finding) => finding.severity === "blocking") ? 1 : 0,
    "drift",
  );
  if (existsSync(path.join(consumer, "node_modules")) || existsSync(path.join(consumer, "dist")))
    throw new Error("Consumer must not supply runtime");
  console.log(
    `Action external-consumer PASS (${version}; clean source, scan/optimize/drift thresholds, CLI errors, SARIF)`,
  );
} finally {
  rmSync(work, { recursive: true, force: true });
}
