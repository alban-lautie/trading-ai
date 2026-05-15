import { z } from "zod"

/** Validation schema for the create / edit position form. */
export const positionSchema = z.object({
  symbol: z
    .string()
    .trim()
    .min(1, "Symbol is required")
    .max(20, "Symbol is too long")
    .transform((value) => value.toUpperCase()),
  name: z.string().trim().max(120).optional().or(z.literal("")),
  quantity: z.coerce
    .number({ message: "Quantity must be a number" })
    .positive("Quantity must be greater than zero"),
  averagePrice: z.coerce
    .number({ message: "Price must be a number" })
    .nonnegative("Price cannot be negative"),
  currency: z
    .string()
    .trim()
    .length(3, "Use a 3-letter currency code")
    .transform((value) => value.toUpperCase())
    .default("USD"),
  openedAt: z.string().optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
})

export type PositionFormValues = z.input<typeof positionSchema>
