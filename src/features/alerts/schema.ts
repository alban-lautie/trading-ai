import { z } from "zod"

export const alertTypes = [
  "price_above",
  "price_below",
  "change_percent_above",
  "change_percent_below",
] as const

/** Validation schema for the create alert form. */
export const alertSchema = z.object({
  symbol: z
    .string()
    .trim()
    .min(1, "Symbol is required")
    .max(20, "Symbol is too long")
    .transform((value) => value.toUpperCase()),
  positionId: z.string().uuid().optional().or(z.literal("")),
  type: z.enum(alertTypes, { message: "Choose an alert type" }),
  threshold: z.coerce
    .number({ message: "Threshold must be a number" })
    .finite("Threshold must be a number"),
})

export type AlertFormValues = z.input<typeof alertSchema>
