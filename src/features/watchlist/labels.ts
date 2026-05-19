import type { ConvictionLevel, EntryAction } from "@/lib/types"

/** French labels for the AI entry-point recommendation fields. */
export const ENTRY_ACTION_LABELS: Record<EntryAction, string> = {
  buy_now: "Acheter maintenant",
  wait: "Attendre un repli",
}

export const CONVICTION_LABELS: Record<ConvictionLevel, string> = {
  low: "Faible",
  medium: "Modérée",
  high: "Élevée",
}
