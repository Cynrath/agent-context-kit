import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import { ProfileSchema } from "./schema.js";
import type { Profile } from "./types.js";

let cached: Map<string, Profile> | null = null;

function templatesDir(): string {
  const thisFile = fileURLToPath(import.meta.url);
  // dist/core/profiles -> 3 ups to package root; src/core/profiles -> 4 ups. Try both.
  const candidates = [
    path.resolve(path.dirname(thisFile), "..", "..", ".."),
    path.resolve(path.dirname(thisFile), "..", "..", "..", ".."),
  ];
  for (const candidate of candidates) {
    try {
      const probe = path.join(candidate, "templates", "profiles", "codex.yml");
      if (existsSync(probe)) return path.join(candidate, "templates", "profiles");
    } catch {
      // fall through
    }
  }
  // fallback to 3-ups (packaged dist) – the caller will throw with clear ENOENT if missing
  return path.join(candidates[0]!, "templates", "profiles");
}

export function loadBuiltInProfiles(): Map<string, Profile> {
  if (cached) return cached;
  const dir = templatesDir();
  const names = ["codex", "claude", "copilot", "gemini", "generic"];
  const map = new Map<string, Profile>();
  for (const name of names) {
    const filePath = path.join(dir, `${name}.yml`);
    const raw = readFileSync(filePath, "utf8");
    const parsed = parseYaml(raw);
    const validated = ProfileSchema.parse(parsed) as Profile;
    map.set(validated.name, validated);
  }
  cached = map;
  return map;
}

export function clearBuiltInCache(): void {
  cached = null;
}
