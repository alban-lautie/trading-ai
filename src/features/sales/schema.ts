import { z } from "zod"

const numericString = z
  .string()
  .trim()
  .min(1, "Champ requis.")
  .refine((value) => {
    const parsed = Number(value)
    return Number.isFinite(parsed)
  }, "Doit être un nombre.")

export const recordSaleSchema = z
  .object({
    positionId: z.string().uuid("Position invalide."),
    quantity: numericString.refine(
      (value) => Number(value) > 0,
      "La quantité doit être supérieure à 0."
    ),
    sellPrice: numericString.refine(
      (value) => Number(value) >= 0,
      "Le prix de vente doit être positif."
    ),
    soldAt: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide (format AAAA-MM-JJ)."),
    notes: z
      .string()
      .trim()
      .max(500, "Les notes dépassent 500 caractères.")
      .optional(),
  })
  .transform((values) => ({
    positionId: values.positionId,
    quantity: Number(values.quantity),
    sellPrice: Number(values.sellPrice),
    soldAt: values.soldAt,
    notes: values.notes && values.notes.length > 0 ? values.notes : null,
  }))

export type RecordSaleInput = z.infer<typeof recordSaleSchema>
