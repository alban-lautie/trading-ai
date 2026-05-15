import type { AlertType } from "@/lib/types"

/** Human-readable French labels for each alert type. */
export const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  price_above: "Cours au-dessus de",
  price_below: "Cours en-dessous de",
  change_percent_above: "Variation du jour au-dessus de (%)",
  change_percent_below: "Variation du jour en-dessous de (%)",
}
