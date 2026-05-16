"use server"

import { requireUser } from "@/features/auth"
import { generatePositionInsight } from "@/lib/ai/claude"
import { getPriceHistory } from "@/lib/market-data"

export interface InsightResult {
  error?: string
  analysis?: string
}

/**
 * Generates an on-demand AI insight for one of the user's positions.
 * Fetches a year of history to give Claude the trend and the 52-week range.
 */
export async function analyzePosition(
  positionId: string
): Promise<InsightResult> {
  const { user, supabase } = await requireUser()

  const { data: position, error } = await supabase
    .from("positions")
    .select("*")
    .eq("id", positionId)
    .eq("user_id", user.id)
    .maybeSingle()

  if (error) {
    return { error: error.message }
  }
  if (!position) {
    return { error: "Position introuvable." }
  }

  let history = null
  try {
    history = await getPriceHistory(position.symbol, "1y")
  } catch {
    // Insight still works without history; the trend context is just missing.
  }

  const currentPrice = history?.points.at(-1)?.close ?? null
  const averagePrice = Number(position.average_price)
  const unrealizedPnlPercent =
    currentPrice !== null && averagePrice > 0
      ? (currentPrice - averagePrice) / averagePrice
      : null

  try {
    const analysis = await generatePositionInsight({
      symbol: position.symbol,
      name: position.name,
      quantity: Number(position.quantity),
      averagePrice,
      currentPrice,
      currency: position.currency,
      unrealizedPnlPercent,
      fiftyTwoWeekHigh: history?.fiftyTwoWeekHigh ?? null,
      fiftyTwoWeekLow: history?.fiftyTwoWeekLow ?? null,
    })
    return { analysis }
  } catch (cause) {
    return {
      error:
        cause instanceof Error
          ? `Analyse IA échouée : ${cause.message}`
          : "Analyse IA échouée.",
    }
  }
}
