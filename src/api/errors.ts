/**
 * Typed SDK error (REQ-V020-J-002, REQ-V020-GOV-008).
 * Never a raw string, never `process.exit`; callers receive a stable `code`
 * and an optional `remediation` hint. Extends `Error` for `instanceof` checks.
 */
export type AckitErrorCode =
  | "CONFIG-FILE-MISSING"
  | "CONFIG-YAML-SYNTAX"
  | "CONFIG-SCHEMA-VERSION"
  | "CONFIG-UNKNOWN-KEY"
  | "CONFIG-INVALID-VALUE"
  | "CONFIG-READ-FAILED"
  | "SCAN-CONTRACT-ERROR"
  | "SCAN-READ-FAILED"
  | "SCAN-RULE-FAILED"
  | "FS-ROOT-UNAVAILABLE"
  | "FS-TRAVERSAL-DENIED"
  | "POLICY-RESOLVE-FAILED"
  | "GRAPH-BUILD-FAILED"
  | "PACK-ABORTED"
  | "UNKNOWN";

export class AckitError extends Error {
  readonly code: AckitErrorCode;
  readonly remediation?: string | undefined;
  override readonly cause?: unknown;

  constructor(
    code: AckitErrorCode,
    message: string,
    options: { remediation?: string | undefined; cause?: unknown } = {},
  ) {
    super(message);
    this.name = "AckitError";
    this.code = code;
    this.remediation = options.remediation;
    if (options.cause !== undefined) this.cause = options.cause;
  }
}
