import path from "node:path";
import process from "node:process";
import type { Command } from "commander";
import { emitDiagnostic } from "../shared/diagnostics.js";
import { EXIT_CODES, type ExitCodeValue } from "../shared/exit-codes.js";
import { getPackageIdentity } from "../shared/version.js";

export interface GlobalOptions {
  root?: string | undefined;
  config?: string | undefined;
  json: boolean;
  quiet: boolean;
  color: boolean;
  verbose: boolean;
  debug: boolean;
  strict: boolean;
}

export interface CliInvocation {
  exitCode?: ExitCodeValue | undefined;
}

export interface InstructionsCommandOptions {
  root?: string | undefined;
  config?: string | undefined;
  json: boolean;
  quiet: boolean;
  debug: boolean;
}

export interface ScanCommandOptions {
  root?: string | undefined;
  config?: string | undefined;
  json: boolean;
  quiet: boolean;
  debug: boolean;
  ci: boolean;
  format?: string | undefined;
  output?: string | undefined;
  watch?: boolean | undefined;
  changed?: boolean | undefined;
  staged?: boolean | undefined;
  since?: string | undefined;
  range?: string | undefined;
  baseline?: string | undefined;
  writeBaseline?: string | undefined;
}

export const SUMMARY_SCHEMA_VERSION = "ackit.summary.v0";
export const SKILLS_REPORT_SCHEMA_VERSION = "ackit.skills.v0";
export const INSTRUCTIONS_REPORT_SCHEMA_VERSION = "ackit.instructions.v0";
export const TASK_REPORT_SCHEMA_VERSION = "ackit.tasks.v0";
export const CONFIG_CHECK_SCHEMA_VERSION = "ackit.config-check.v0";

export { emitDiagnostic, EXIT_CODES, getPackageIdentity };
export { type ExitCodeValue };
