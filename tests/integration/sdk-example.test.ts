import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { expect, it } from "vitest";

const execute = promisify(execFile);
it("the documented SDK consumer runs against an unrelated repository fixture", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "ackit-sdk-example-"));
  try {
    await writeFile(path.join(root, "sample.txt"), "TODO: fixture\n");
    const result = await execute(process.execPath, [path.resolve("examples/sdk-consumer.mjs")], {
      cwd: root,
      timeout: 20_000,
      windowsHide: true,
    });
    expect(result.stdout).toContain("sdk-consumer: findings=1 filesScanned=1");
    expect(result.stderr).toBe("");
  } finally {
    expect(path.dirname(root)).toBe(path.resolve(tmpdir()));
    await rm(root, { recursive: true, force: true });
  }
});
