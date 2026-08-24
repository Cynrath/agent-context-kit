import type { CommanderError } from "commander";
import type { ConfigError } from "../core/config/index.js";

/** Renders a config error as one stable diagnostic line (REQ-CFG-005). */
export function renderConfigError(error: ConfigError): string {
  const location =
    error.location !== undefined ? `:${error.location.line}:${error.location.column}` : "";
  const suggestion = error.suggestion !== undefined ? ` (did you mean '${error.suggestion}'?)` : "";
  return `${error.code} ${error.file ?? "ackit.yml"}${location}: ${error.message}${suggestion}`;
}

/** Help/version exits are success, not usage failures (ADR-0007). */
export function isUsageError(error: CommanderError): boolean {
  return error.code !== "commander.helpDisplayed" && error.code !== "commander.version";
}
