import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
} from "node:fs";
import path from "node:path";
import { runConsumerCommand } from "./consumer-command.mjs";

/** Build and lifecycle-pack current source without rewriting a shared checkout. */
export function packIsolatedProject(repoRoot, work) {
  const root = realpathSync(repoRoot);
  const fixture = realpathSync(work);
  const relative = path.relative(root, fixture);
  if (!relative || (!path.isAbsolute(relative) && !relative.startsWith(`..${path.sep}`)))
    throw new Error("Package fixture must be outside the source checkout");
  const source = path.join(fixture, "package-source");
  mkdirSync(source);
  const pnpmCli = process.env.npm_execpath;
  const manifest = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
  const expectedAgent = manifest.packageManager.replace("@", "/");
  if (
    !pnpmCli ||
    !existsSync(pnpmCli) ||
    !process.env.npm_config_user_agent?.startsWith(`${expectedAgent} `)
  )
    throw new Error("Run package validation through the repository's pinned pnpm");
  const run = (command, args, options = {}) =>
    runConsumerCommand(command, args, { cwd: root, ...options }, [
      [fixture, "<fixture>"],
      [root, "<source>"],
    ]);
  const inputs = [
    "src",
    "templates",
    "schemas",
    "package.json",
    "pnpm-lock.yaml",
    "pnpm-workspace.yaml",
    "tsconfig.json",
    "tsconfig.build.json",
    "extensions/vscode/package.json",
    "scripts/generate-schemas.mjs",
    "README.md",
    "CHANGELOG.md",
    "LICENSE",
  ];
  const files = run("git", [
    "ls-files",
    "--cached",
    "--others",
    "--exclude-standard",
    "-z",
    "--",
    ...inputs,
  ])
    .split("\0")
    .filter(Boolean);
  for (const file of files) {
    const origin = realpathSync(path.resolve(root, file));
    const destination = path.resolve(source, file);
    if (!origin.startsWith(`${root}${path.sep}`) || !destination.startsWith(`${source}${path.sep}`))
      throw new Error("Package input escapes its export boundary");
    mkdirSync(path.dirname(destination), { recursive: true });
    copyFileSync(origin, destination);
  }
  if (existsSync(path.join(source, "dist")) || existsSync(path.join(source, "node_modules")))
    throw new Error("Package export must start without ignored runtime files");
  run(
    process.execPath,
    [pnpmCli, "install", "--frozen-lockfile", "--ignore-scripts", "--filter", manifest.name],
    { cwd: source },
  );
  // Do not skip prepack: its real build/schema hooks run in the private export.
  run(process.execPath, [pnpmCli, "pack", "--pack-destination", fixture], { cwd: source });
  const tarball = readdirSync(fixture).find((file) => file.endsWith(".tgz"));
  if (!tarball) throw new Error("Isolated pack produced no tarball");
  return path.join(fixture, tarball);
}
