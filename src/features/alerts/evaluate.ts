import "server-only"

import { ALERT_TYPE_LABELS, isPercentAlertType } from "@/lib/alert-labels"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendTelegramMessage } from "@/lib/telegram/client"
import type { AlertType } from "@/lib/types"

export interface EvaluateResult {
  /** Number of active alerts examined. */
  evaluated: number
  /** Number of alerts that triggered and notified the user. */
  triggered: number
}

interface QuoteSnapshot {
  price: number
  changePercent: number
  currency: string
}

/** Pure check: is the alert condition met by the current quote? */
function isTriggered(
  type: AlertType,
  threshold: number,
  quote: QuoteSnapshot,
  averagePrice: number | null
): boolean {
  switch (type) {
    case "price_above":
      return quote.price > threshold
    case "price_below":
      return quote.price < threshold
    case "change_percent_above":
      return quote.changePercent > threshold
    case "change_percent_below":
      return quote.changePercent < threshold
    case "unrealized_gain_above":
      if (averagePrice === null || averagePrice <= 0) return false
      return ((quote.price - averagePrice) / averagePrice) * 100 >= threshold
    case "unrealized_loss_above":
      if (averagePrice === null || averagePrice <= 0) return false
      return ((averagePrice - quote.price) / averagePrice) * 100 >= threshold
  }
}

/** Builds the Telegram message for a triggered alert. */
function formatAlertMessage(
  symbol: string,
  type: AlertType,
  threshold: number,
  quote: QuoteSnapshot,
  proposalKind: string | null
): string {
  const unit = isPercentAlertType(type) ? " %" : ""
  const condition = `Condition : ${ALERT_TYPE_LABELS[type]} ${threshold}${unit}`
  const price = `Cours actuel : ${quote.price} ${quote.currency}`

  if (proposalKind === "take_profit") {
    return [
      "🎯 *Trading AI* — Objectif de vente atteint",
      "",
      `*${symbol}*`,
      "Le cours a atteint l'objectif de vente fixé par l'IA. C'est le moment de réaliser tout ou partie de la position.",
      condition,
      price,
    ].join("\n")
  }
  if (proposalKind === "stop_loss") {
    return [
      "🛑 *Trading AI* — Stop de protection atteint",
      "",
      `*${symbol}*`,
      "Le cours est passé sous le seuil de protection. Envisage de couper la position pour limiter la perte.",
      condition,
      price,
    ].join("\n")
  }
  return [
    "🔔 *Trading AI* — Alerte déclenchée",
    "",
    `*${symbol}*`,
    condition,
    price,
  ].join("\n")
}

/**
 * Evaluates every active alert against the latest stored quotes and notifies
 * each owner on Telegram when a condition is met. A triggered alert is marked
 * and deactivated so it does not fire again until re-enabled.
 *
 * Runs with the service role (it spans all users); invoked by the cron
 * endpoint.
 */
export async function evaluateAlerts(): Promise<EvaluateResult> {
  const supabase = createAdminClient()

  const { data: alerts, error } = await supabase
    .from("alerts")
    .select(
      "id, user_id, symbol, type, threshold, proposal_kind, position:positions(average_price)"
    )
    .eq("is_active", true)
    .is("triggered_at", null)

  if (error) {
    throw new Error(`Failed to load alerts: ${error.message}`)
  }
  if (!alerts || alerts.length === 0) {
    return { evaluated: 0, triggered: 0 }
  }

  // Latest quotes for every symbol under watch.
  const symbols = [...new Set(alerts.map((a) => a.symbol.toUpperCase()))]
  const { data: quoteRows, error: quotesError } = await supabase
    .from("quotes")
    .select("symbol, price, change_percent, currency")
    .in("symbol", symbols)

  if (quotesError) {
    throw new Error(`Failed to load quotes: ${quotesError.message}`)
  }

  const quotes = new Map<string, QuoteSnapshot>(
    (quoteRows ?? []).map((row) => [
      row.symbol.toUpperCase(),
      {
        price: Number(row.price),
        changePercent: Number(row.change_percent),
        currency: row.currency,
      },
    ])
  )

  // Telegram chat for every owner.
  const userIds = [...new Set(alerts.map((a) => a.user_id))]
  const { data: settings } = await supabase
    .from("notification_settings")
    .select("user_id, telegram_chat_id")
    .in("user_id", userIds)

  const chatByUser = new Map<string, string>(
    (settings ?? [])
      .filter((s) => s.telegram_chat_id)
      .map((s) => [s.user_id, s.telegram_chat_id as string])
  )

  let triggered = 0

  for (const alert of alerts) {
    const quote = quotes.get(alert.symbol.toUpperCase())
    if (!quote) continue

    const averagePrice = alert.position
      ? Number(alert.position.average_price)
      : null
    const threshold = Number(alert.threshold)

    if (!isTriggered(alert.type, threshold, quote, averagePrice)) continue

    // Without a linked Telegram chat the alert cannot be delivered; leave it
    // active so it fires once the user connects Telegram.
    const chatId = chatByUser.get(alert.user_id)
    if (!chatId) continue

    try {
      await sendTelegramMessage(
        chatId,
        formatAlertMessage(
          alert.symbol,
          alert.type,
          threshold,
          quote,
          alert.proposal_kind
        )
      )
    } catch {
      // Delivery failed; keep the alert active and retry next cycle.
      continue
    }

    await supabase
      .from("alerts")
      .update({ triggered_at: new Date().toISOString(), is_active: false })
      .eq("id", alert.id)

    triggered += 1
  }

  return { evaluated: alerts.length, triggered }
}
