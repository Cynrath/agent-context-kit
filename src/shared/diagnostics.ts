import type { Writable } from "node:stream";

/**
 * Output behavior flags shared by every command (REQ-DX-003).
 */
export interface OutputOptions {
  quiet: boolean;
  debug: boolean;
}

// biome-ignore lint/suspicious/noControlCharactersInRegex: matches the ESC control character by design to strip ANSI sequences (terminal-injection defense, REQ-SEC-003)
const ANSI_ESCAPE_PATTERN = /\u001B\[[0-9;]*[A-Za-z]/g;
// biome-ignore lint/suspicious/noControlCharactersInRegex: this regex exists precisely to strip control characters (terminal-injection defense, REQ-SEC-003)
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/**
 * Strips ANSI escape sequences and control characters from text destined for
 * a terminal, blocking terminal/ANSI injection and reducing log forging
 * (REQ-SEC-003).
 */
export function sanitizeTerminalText(value: string): string {
  return value.replace(ANSI_ESCAPE_PATTERN, "").replace(CONTROL_CHARACTER_PATTERN, "");
}

export interface Diagnostic {
  code: string;
  message: string;
}

/**
 * Emits one diagnostic line to stderr honoring --quiet (REQ-GOV-007: errors
 * surface as diagnostics; never silently swallowed). Text is sanitized before
 * it reaches the stream.
 */
export function emitDiagnostic(
  diagnostic: Diagnostic,
  options: OutputOptions = { quiet: false, debug: false },
  stream: Writable = process.stderr,
): void {
  if (options.quiet) {
    return;
  }
  stream.write(
    `ackit:${sanitizeTerminalText(diagnostic.code)}: ${sanitizeTerminalText(diagnostic.message)}\n`,
  );
}
