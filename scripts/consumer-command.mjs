import { spawnSync } from "node:child_process";

/** Bounded consumer-tool process boundary; never expose caller paths in errors. */
export function runConsumerCommand(command, args, options = {}, redactions = []) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    timeout: 180_000,
    windowsHide: true,
    ...options,
  });
  if (result.status !== 0) {
    let detail = [result.error?.message, result.stderr, result.stdout].filter(Boolean).join("\n");
    for (const [value, label] of redactions) detail = detail.replaceAll(value, label);
    detail = detail.replace(/[A-Za-z]:[\\/][^\s"'<>]+/g, "<local-path>");
    throw new Error(
      `consumer command failed (exit ${result.status}): ${detail || "no command output"}`,
    );
  }
  return result.stdout;
}
