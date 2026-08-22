import { z } from "zod";
import { AckitConfigSchema } from "./schema.js";

/**
 * JSON Schema derived from the same zod source of truth used at runtime
 * (REQ-CFG-004, single-source identity per REQ-ARCH-009). Regenerate via
 * `pnpm gen:schemas`; a contract test asserts the committed file matches.
 */
export function ackitConfigJsonSchema(): Record<string, unknown> {
  return z.toJSONSchema(AckitConfigSchema, { io: "input", unrepresentable: "any" }) as Record<
    string,
    unknown
  >;
}
