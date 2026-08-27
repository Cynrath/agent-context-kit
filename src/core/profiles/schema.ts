import { z } from "zod";

export const ProfileSchema = z
  .strictObject({
    name: z
      .string()
      .regex(/^[a-z0-9-]+$/)
      .min(1)
      .max(32),
    provider: z.enum(["codex", "claude", "copilot", "gemini", "generic"]),
    displayName: z.string().max(64).optional(),
    version: z.literal(1).optional().default(1),
    instructionApplicability: z
      .strictObject({
        applyToResolvedBy: z.enum(["profile", "graph"]).optional(),
        notes: z.string().max(500).optional(),
      })
      .optional(),
    fileConventions: z.strictObject({
      instructionFiles: z.array(z.string().min(1)).min(1).max(32),
      skillDirs: z.array(z.string()).max(8).optional(),
      extraSurfaces: z.array(z.string()).max(16).optional(),
    }),
    contextBudget: z.strictObject({
      maxTokens: z.number().int().min(1000).max(500000),
      includePriority: z.record(z.string().regex(/^[a-zA-Z0-9_.-]+$/), z.number().min(-10).max(10)),
    }),
    precedenceOverrides: z
      .record(z.string().regex(/^[a-z0-9.-]+$/), z.number().min(-1000).max(1000))
      .optional(),
  })
  .strict();

export type ProfileInput = z.input<typeof ProfileSchema>;
