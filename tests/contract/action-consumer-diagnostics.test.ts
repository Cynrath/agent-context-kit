import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { expect, it } from "vitest";

const execute = promisify(execFile);
it("a failed consumer install exposes stdout/status and remains a hard failure", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "ackit-consumer-diagnostic-"));
  try {
    const childSource =
      'console.log("synthetic-install-cause " + process.cwd()); process.exitCode = 7;';
    const harness = `
      import { pathToFileURL } from "node:url";
      const { runConsumerCommand } = await import(pathToFileURL(process.argv[1]).href);
      try {
        runConsumerCommand(process.execPath, ["-e", ${JSON.stringify(childSource)}],
          { cwd: process.argv[2] }, [[process.argv[2], "<fixture>"]]);
      } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
      }
    `;
    const result = await execute(
      process.execPath,
      ["--input-type=module", "-e", harness, path.resolve("scripts/consumer-command.mjs"), dir],
      {
        timeout: 20_000,
        windowsHide: true,
      },
    ).then(
      () => ({ code: 0, stderr: "" }),
      (error: { code: number; stderr: string }) => error,
    );
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("consumer command failed (exit 7)");
    expect(result.stderr).toContain("synthetic-install-cause <fixture>");
    expect(result.stderr).not.toContain(dir);
  } finally {
    expect(path.dirname(dir)).toBe(path.resolve(tmpdir()));
    await rm(dir, { recursive: true, force: true });
  }
});
