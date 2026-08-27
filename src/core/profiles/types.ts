import type { z } from "zod";
import type { ProfileSchema } from "./schema.js";

export type Profile = z.infer<typeof ProfileSchema> & { name: string; provider: ProfileProvider };
export type ProfileProvider = "codex" | "claude" | "copilot" | "gemini" | "generic";
export type ProfileId = string;

export interface ResolvedProfile {
  requested: string | null;
  resolved: Profile;
  source: "cli" | "config" | "auto-detect" | "fallback";
  diagnostic?: ProfileDiagnostic | undefined;
}

export interface ProfileDiagnostic {
  code:
    | "PROFILE-UNKNOWN"
    | "PROFILE-INVALID"
    | "PROFILE-AMBIGUOUS"
    | "PROFILE-PATH-ESCAPE"
    | "PROFILE-NETWORK-REFUSED"
    | "PROFILE-LIMIT";
  message: string;
  remediation?: string | undefined;
  file?: string | undefined;
  line?: number | undefined;
}

export interface ResolveInput {
  cliProfile?: string | undefined;
  configProfile?: string | undefined;
  detectedFiles: string[];
  available: Map<string, Profile>;
}
