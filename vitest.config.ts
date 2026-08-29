import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    pool: "threads",
    teardownTimeout: 10000,
    include: [
      "tests/unit/**/*.test.ts",
      "tests/integration/**/*.test.ts",
      "tests/contract/**/*.test.ts",
      "tests/security/**/*.test.ts",
      "tests/e2e/**/*.test.ts",
      "tests/browser/**/*.test.ts",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text"],
      include: ["src/**"],
    },
  },
});
