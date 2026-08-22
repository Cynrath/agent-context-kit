import { Writable } from "node:stream";
import { describe, expect, it } from "vitest";
import { emitDiagnostic, sanitizeTerminalText } from "../../src/shared/diagnostics.js";

function captureStream(): { stream: Writable; output(): string } {
  const chunks: string[] = [];
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      chunks.push(String(chunk));
      callback();
    },
  });
  return { stream, output: () => chunks.join("") };
}

describe("sanitizeTerminalText", () => {
  it("strips ANSI escape sequences", () => {
    expect(sanitizeTerminalText("\u001B[31mred\u001B[0m plain")).toBe("red plain");
  });

  it("strips control characters used for log forging", () => {
    expect(sanitizeTerminalText("line1\n\u0000mid\u0007dle\r\n")).toBe("line1\nmiddle\r\n");
  });

  it("keeps ordinary text untouched", () => {
    expect(sanitizeTerminalText("plain message: value")).toBe("plain message: value");
  });
});

describe("emitDiagnostic", () => {
  it("writes a stable prefixed line to stderr", () => {
    const captured = captureStream();
    emitDiagnostic(
      { code: "usage-error", message: "unknown option '--x'" },
      undefined,
      captured.stream,
    );
    expect(captured.output()).toBe("ackit:usage-error: unknown option '--x'\n");
  });

  it("suppresses output under --quiet without swallowing the condition itself", () => {
    const captured = captureStream();
    emitDiagnostic(
      { code: "usage-error", message: "hidden" },
      { quiet: true, debug: false },
      captured.stream,
    );
    expect(captured.output()).toBe("");
  });

  it("sanitizes injected control characters before writing", () => {
    const captured = captureStream();
    emitDiagnostic(
      { code: "evil", message: "fake\u001B[2Jclear tail" },
      { quiet: false, debug: false },
      captured.stream,
    );
    expect(captured.output()).not.toContain("\u001B[");
  });
});
