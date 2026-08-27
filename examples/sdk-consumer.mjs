#!/usr/bin/env node
// Minimal SDK consumer smoke (ESM) — documented in docs/reference/sdk.md
// Run: node examples/sdk-consumer.mjs  (or after `pnpm pack` install via `node -e "import(...)"`)
import { scanRepository } from "@cynrath/agent-context-kit";

const root = process.cwd();
const result = await scanRepository(root, {});
console.log(`sdk-consumer: findings=${result.findings.length} filesScanned=${result.filesScanned}`);
if (result.findings.length === 0) console.log("no findings (repo may be clean or suppressed)");
// No process.exit from SDK — CLI layer owns exit codes
