import "server-only"

import { requireUser } from "@/features/auth"
import { getStoredQuotes } from "@/features/quotes/queries"
import type { Quote } from "@/lib/market-data"
import type { Alert } from "@/lib/types"

/** Returns every alert owned by the current user, newest first. */
export async function getAlerts(): Promise<Alert[]> {
  const { user, supabase } = await requireUser()

  const { data, error } = await supabase
    .from("alerts")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(`Failed to load alerts: ${error.message}`)
  }

  return data ?? []
}

/** An active alert with how close it is to triggering. */
export interface AlertProximity {
  alert: Alert
  /** Current price or percentage the alert watches. */
  currentValue: number
  /** Distance to the trigger; <= 0 means the threshold is reached. */
  gap: number
  imminent: boolean
}

export interface AlertsOverview {
  /** Alerts that have already fired. */
  triggered: Alert[]
  /** Active alerts close to triggering, nearest first. */
  upcoming: AlertProximity[]
}

/** Active alerts within this distance of their threshold are "upcoming". */
const UPCOMING_GAP_BAND = 5

function computeGap(
  alert: Alert,
  quote: Quote,
  averagePrice: number | null
): { currentValue: number; gap: number } | null {
  const threshold = Number(alert.threshold)
  const price = quote.price

  switch (alert.type) {
    case "price_above":
      return { currentValue: price, gap: ((threshold - price) / threshold) * 100 }
    case "price_below":
      return { currentValue: price, gap: ((price - threshold) / threshold) * 100 }
    case "change_percent_above":
      return { currentValue: quote.changePercent, gap: threshold - quote.changePercent }
    case "change_percent_below":
      return { currentValue: quote.changePercent, gap: quote.changePercent - threshold }
    case "unrealized_gain_above": {
      if (averagePrice === null || averagePrice <= 0) return null
      const gain = ((price - averagePrice) / averagePrice) * 100
      return { currentValue: gain, gap: threshold - gain }
    }
    case "unrealized_loss_above": {
      if (averagePrice === null || averagePrice <= 0) return null
      const loss = ((averagePrice - price) / averagePrice) * 100
      return { currentValue: loss, gap: threshold - loss }
    }
    default:
      return null
  }
}

/**
 * Returns the user's triggered alerts and the active alerts that are close
 * to triggering, for the dashboard overview card.
 */
export async function getAlertsOverview(): Promise<AlertsOverview> {
  const { user, supabase } = await requireUser()

  const { data, error } = await supabase
    .from("alerts")
    .select("*, position:positions(average_price)")
    .eq("user_id", user.id)

  if (error) {
    throw new Error(`Failed to load alerts: ${error.message}`)
  }

  const alerts = data ?? []

  const triggered = alerts
    .filter((alert) => alert.triggered_at !== null)
    .sort((a, b) =>
      (b.triggered_at ?? "").localeCompare(a.triggered_at ?? "")
    )

  const active = alerts.filter(
    (alert) => alert.triggered_at === null && alert.is_active
  )
  const quotes = await getStoredQuotes(active.map((alert) => alert.symbol))

  const upcoming: AlertProximity[] = []
  for (const alert of active) {
    const quote = quotes.get(alert.symbol.toUpperCase())
    if (!quote) continue

    const averagePrice = alert.position
      ? Number(alert.position.average_price)
      : null
    const result = computeGap(alert, quote, averagePrice)
    if (!result) continue

    if (result.gap <= UPCOMING_GAP_BAND) {
      upcoming.push({
        alert,
        currentValue: result.currentValue,
        gap: result.gap,
        imminent: result.gap <= 0,
      })
    }
  }
  upcoming.sort((a, b) => a.gap - b.gap)

  return { triggered, upcoming }
}
