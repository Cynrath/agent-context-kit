import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { expect, it } from "vitest";

const execute = promisify(execFile);
it("pnpm setup resolves the Action's pinned manifest from an unrelated consumer", async () => {
  const base = await mkdtemp(path.join(tmpdir(), "ackit-action-manifest-"));
  try {
    const actionRoot = path.join(base, "action checkout");
    const workspace = path.join(base, "consumer workspace");
    await mkdir(actionRoot);
    await mkdir(workspace);
    const pinned = JSON.parse(await readFile("package.json", "utf8")).packageManager as string;
    await writeFile(
      path.join(actionRoot, "package.json"),
      JSON.stringify({ packageManager: pinned }),
    );
    await writeFile(
      path.join(workspace, "package.json"),
      JSON.stringify({ packageManager: "pnpm@1.0.0" }),
    );
    for (const consumer of [workspace, actionRoot]) {
      const result = await execute(
        process.execPath,
        [path.resolve("scripts/action-package-path.mjs")],
        {
          cwd: consumer,
          env: { ...process.env, ACKIT_ACTION_PATH: actionRoot, GITHUB_WORKSPACE: consumer },
          timeout: 20_000,
          windowsHide: true,
        },
      );
      const relative = result.stdout.trim().slice("path=".length);
      expect(path.isAbsolute(relative)).toBe(false);
      const target = path.join(consumer, relative); // exact pinned setup resolution contract
      expect(await realpath(target)).toBe(await realpath(path.join(actionRoot, "package.json")));
      expect(JSON.parse(await readFile(target, "utf8")).packageManager).toBe(pinned);
    }
  } finally {
    expect(path.dirname(base)).toBe(path.resolve(tmpdir()));
    await rm(base, { recursive: true, force: true });
  }
});
