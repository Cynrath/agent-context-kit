import * as path from "node:path";
import { runTests } from "@vscode/test-electron";

async function main() {
  try {
    const extensionDevelopmentPath = path.resolve(__dirname, "../../");
    const extensionTestsPath = path.resolve(__dirname, "./suite/index");
    const workspacePath = path.resolve(__dirname, "../../test-fixture");
    // Create a disposable workspace with a simple fixture
    const { mkdirSync, writeFileSync, existsSync } = await import("node:fs");
    if (!existsSync(workspacePath)) {
      mkdirSync(workspacePath, { recursive: true });
      writeFileSync(path.join(workspacePath, "AGENTS.md"), "# AGENTS\nUse ackit task\n", "utf8");
      writeFileSync(path.join(workspacePath, "README.md"), "# Fixture\n", "utf8");
    }
    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: [workspacePath, "--disable-extensions"],
    });
  } catch (err) {
    console.error("Failed to run tests", err);
    process.exit(1);
  }
}

void main();
