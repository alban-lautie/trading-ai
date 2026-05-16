import type { AlertType } from "@/lib/types"

/** Human-readable French labels for each alert type. */
export const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  price_above: "Cours au-dessus de",
  price_below: "Cours en-dessous de",
  unrealized_gain_above: "Plus-value (vs achat) ≥",
  unrealized_loss_above: "Moins-value (vs achat) ≥",
  change_percent_above: "Variation du jour au-dessus de",
  change_percent_below: "Variation du jour en-dessous de",
}

/** Alert types whose threshold is expressed as a percentage. */
export const PERCENT_ALERT_TYPES: AlertType[] = [
  "unrealized_gain_above",
  "unrealized_loss_above",
  "change_percent_above",
  "change_percent_below",
]

/** Returns whether the given alert type uses a percentage threshold. */
export function isPercentAlertType(type: AlertType): boolean {
  return PERCENT_ALERT_TYPES.includes(type)
}
