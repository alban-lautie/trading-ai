import { z } from "zod"

export const alertTypes = [
  "price_above",
  "price_below",
  "unrealized_gain_above",
  "unrealized_loss_above",
  "change_percent_above",
  "change_percent_below",
] as const

/** Validation schema for the create alert form. */
export const alertSchema = z.object({
  positionId: z.string().uuid("Choisissez une action"),
  type: z.enum(alertTypes, { message: "Choisissez une condition" }),
  threshold: z.coerce
    .number({ message: "Le seuil doit être un nombre" })
    .positive("Le seuil doit être positif"),
})

export type AlertFormValues = z.input<typeof alertSchema>
