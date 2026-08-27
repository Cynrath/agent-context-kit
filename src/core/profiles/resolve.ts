import { detectProfileDetailed } from "./detect.js";
import type { Profile, ResolvedProfile, ResolveInput } from "./types.js";

function getGeneric(available: Map<string, Profile>): Profile {
  const g = available.get("generic");
  if (g) return g;
  // fallback to first generic-like if not present (should not happen)
  const first = [...available.values()][0];
  if (first) return first;
  throw new Error("no available profiles");
}

export function resolveProfile(input: ResolveInput): ResolvedProfile {
  const available = input.available;
  const generic = getGeneric(available);

  const lookup = (name: string): Profile | undefined => available.get(name);

  // 1. CLI precedence
  if (input.cliProfile !== undefined && input.cliProfile.trim().length > 0) {
    const raw = input.cliProfile.trim();
    const found = lookup(raw);
    if (found) {
      return { requested: raw, resolved: found, source: "cli" };
    }
    return {
      requested: raw,
      resolved: generic,
      source: "cli",
      diagnostic: {
        code: "PROFILE-UNKNOWN",
        message: `unknown profile '${raw}'`,
        remediation: `available: ${[...available.keys()].sort().join(", ")} — did you mean one of these?`,
      },
    };
  }

  // 2. Config precedence
  if (input.configProfile !== undefined && input.configProfile.trim().length > 0) {
    const raw = input.configProfile.trim();
    const found = lookup(raw);
    if (found) {
      return { requested: raw, resolved: found, source: "config" };
    }
    return {
      requested: raw,
      resolved: generic,
      source: "config",
      diagnostic: {
        code: "PROFILE-UNKNOWN",
        message: `unknown profile '${raw}'`,
        remediation: `available: ${[...available.keys()].sort().join(", ")}`,
      },
    };
  }

  // 3. Auto-detect
  const detail = detectProfileDetailed(input.detectedFiles);
  if (detail.detected !== null) {
    const found = lookup(detail.detected);
    if (found) {
      return { requested: null, resolved: found, source: "auto-detect" };
    }
    // detected provider but no profile available -> fallback generic
    return { requested: null, resolved: generic, source: "auto-detect" };
  }
  if (detail.ambiguous) {
    return {
      requested: null,
      resolved: generic,
      source: "auto-detect",
      diagnostic: {
        code: "PROFILE-AMBIGUOUS",
        message: `ambiguous providers detected: ${detail.providers.join(", ")} — falling back to generic`,
        remediation: "specify --profile or ackit.yml profile to disambiguate",
      },
    };
  }

  // 4. Fallback
  return { requested: null, resolved: generic, source: "fallback" };
}
