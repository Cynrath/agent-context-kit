import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { runTests } from "@vscode/test-electron";

async function main() {
  const workspacePath = mkdtempSync(path.join(tmpdir(), "ackit-vscode-test-"));
  if (
    path.dirname(workspacePath) !== path.resolve(tmpdir()) ||
    !path.basename(workspacePath).startsWith("ackit-vscode-test-")
  )
    throw new Error("Unsafe test workspace");
  try {
    const extensionDevelopmentPath = path.resolve(__dirname, "../../");
    const extensionTestsPath = path.resolve(__dirname, "./suite/index");
    writeFileSync(path.join(workspacePath, "AGENTS.md"), "# AGENTS\nUse ackit task\n", "utf8");
    writeFileSync(path.join(workspacePath, "README.md"), "# Fixture\n", "utf8");
    writeFileSync(path.join(workspacePath, "sample.txt"), "TODO: review fixture\n", "utf8");
    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: [
        workspacePath,
        "--disable-extensions",
        "--disable-workspace-trust",
        "--skip-welcome",
        "--skip-release-notes",
      ],
    });
  } catch (err) {
    console.error("Failed to run tests", err);
    process.exitCode = 1;
  } finally {
    rmSync(workspacePath, { recursive: true, force: true });
  }
}

void main();
