import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    pool: "threads",
    teardownTimeout: 10000,
    // I/O-heavy suite (bounded git runner, CLI invocations, fs fixtures):
    // the vitest default 5s per test is too tight under full parallel load
    // on slower/loaded machines and caused spurious "timed out in 5000ms"
    // failures unrelated to assertions. 60s keeps CI honest while removing
    // load-dependent flakiness. Long-running lifecycle tests already carry
    // their own higher explicit timeouts.
    testTimeout: 60000,
    include: [
      "tests/unit/**/*.test.ts",
      "tests/integration/**/*.test.ts",
      "tests/contract/**/*.test.ts",
      "tests/security/**/*.test.ts",
      "tests/e2e/**/*.test.ts",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text"],
      include: ["src/**"],
    },
  },
});
