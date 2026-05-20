import { z } from "zod"

export const aiFrequencies = ["daily", "weekly", "monthly"] as const
export const aiDeliveries = ["telegram", "in_app", "both"] as const

/** Focus areas the user can ask the AI monitoring to emphasize. */
export const aiFocusAreas = [
  "risk",
  "diversification",
  "opportunities",
  "performance",
] as const

/** Validation schema for the AI monitoring configuration form. */
export const aiConfigSchema = z.object({
  isEnabled: z.boolean(),
  frequency: z.enum(aiFrequencies),
  tone: z.string().trim().min(1, "Tone is required").max(40),
  focusAreas: z
    .array(z.enum(aiFocusAreas))
    .min(1, "Pick at least one focus area"),
  delivery: z.enum(aiDeliveries),
})

export type AiConfigFormValues = z.infer<typeof aiConfigSchema>
