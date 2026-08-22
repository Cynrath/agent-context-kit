import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ackitConfigJsonSchema } from "../../src/core/config/json-schema.js";
import { loadAckitConfig } from "../../src/core/config/load.js";

const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url));

describe("ackit config JSON schema contract", () => {
  it("committed schemas/ackit.schema.json matches the zod source of truth", () => {
    const committed = JSON.parse(
      readFileSync(`${REPO_ROOT}schemas/ackit.schema.json`, "utf8"),
    ) as unknown;
    expect(committed).toEqual(ackitConfigJsonSchema());
  });

  it("the repository's own example config validates", async () => {
    const result = await loadAckitConfig(REPO_ROOT, {
      configPath: "examples/ackit.example.yml",
    });
    expect(result.ok).toBe(true);
  });
});
