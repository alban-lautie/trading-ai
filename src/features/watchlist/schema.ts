import { z } from "zod"

/** Validation schema for the create / edit watchlist form. */
export const watchlistSchema = z.object({
  symbol: z
    .string()
    .trim()
    .min(1, "Le symbole est requis")
    .max(20, "Le symbole est trop long")
    .transform((value) => value.toUpperCase()),
  name: z.string().trim().max(120).optional().or(z.literal("")),
  currency: z
    .string()
    .trim()
    .length(3, "Utilisez un code devise à 3 lettres")
    .transform((value) => value.toUpperCase())
    .default("USD"),
  tradingStyle: z.enum(["day_trading", "swing"]).default("swing"),
  targetGainPercent: z.preprocess(
    (value) =>
      value === "" || value === undefined || value === null
        ? undefined
        : value,
    z.coerce
      .number({ message: "Le gain cible doit être un nombre" })
      .positive("Le gain cible doit être supérieur à zéro")
      .optional()
  ),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
})

export type WatchlistFormValues = z.input<typeof watchlistSchema>
