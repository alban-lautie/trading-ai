import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { computeVolatility } from "@/features/positions/recommendations"
import { generateEntryRecommendation } from "@/lib/ai/claude"
import type { Database } from "@/lib/database.types"
import {
  computeIndicators,
  getPriceHistory,
  getStockFundamentals,
  getStockNews,
} from "@/lib/market-data"
import type { Quote } from "@/lib/market-data"
import type { Watchlist } from "@/lib/types"

/** Number of recent news articles passed to the recommendation prompt. */
const NEWS_LIMIT = 8
/** Milliseconds in a day, used to age news articles. */
const DAY_MS = 86_400_000

type Client = SupabaseClient<Database>

/** Rounds a value to two decimals. */
function round2(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * Replaces the entry-price alert armed for a watched stock so it always
 * matches the latest recommendation: the previous alert is removed and a
 * fresh active alert is created at the recommended entry price. The alert
 * direction depends on the recommended price vs the current quote — a
 * breakout setup (target above current) arms `price_above`, a pullback
 * setup (target below current) arms `price_below`.
 */
async function armEntryAlert(
  supabase: Client,
  item: Watchlist,
  currentPrice: number | null
): Promise<void> {
  await supabase.from("alerts").delete().eq("watchlist_id", item.id)

  if (item.recommended_entry_price === null) {
    return
  }

  const threshold = round2(Number(item.recommended_entry_price))
  const direction: "price_above" | "price_below" =
    currentPrice !== null && threshold > currentPrice
      ? "price_above"
      : "price_below"

  await supabase.from("alerts").insert({
    user_id: item.user_id,
    watchlist_id: item.id,
    symbol: item.symbol,
    type: direction,
    threshold,
    is_active: true,
  })
}

/**
 * Generates a fresh AI entry-point recommendation for one watched stock and
 * stores it inline on the row, then arms the entry-price alert. Returns the
 * updated row, or `null` when generation failed.
 */
export async function runEntryRecommendation(
  supabase: Client,
  item: Watchlist,
  quote: Quote | null
): Promise<Watchlist | null> {
  const [history, news, fundamentals] = await Promise.all([
    getPriceHistory(item.symbol, "1y").catch(() => null),
    getStockNews(item.symbol),
    getStockFundamentals(item.symbol),
  ])

  const currentPrice = quote?.price ?? history?.points.at(-1)?.close ?? null

  let result
  try {
    result = await generateEntryRecommendation({
      symbol: item.symbol,
      name: item.name,
      currency: item.currency,
      tradingStyle: item.trading_style,
      targetGainPercent:
        item.target_gain_percent === null
          ? null
          : Number(item.target_gain_percent),
      currentPrice,
      dayChangePercent: quote?.changePercent ?? null,
      fiftyTwoWeekHigh: history?.fiftyTwoWeekHigh ?? null,
      fiftyTwoWeekLow: history?.fiftyTwoWeekLow ?? null,
      volatilityPercent: computeVolatility(history),
      indicators: history ? computeIndicators(history.points) : null,
      fundamentals,
      news: news.slice(0, NEWS_LIMIT).map((article) => ({
        title: article.title,
        publisher: article.publisher,
        ageDays: Math.max(
          0,
          Math.floor((Date.now() - article.publishedAt) / DAY_MS)
        ),
      })),
    })
  } catch {
    return null
  }

  const { data, error } = await supabase
    .from("watchlist")
    .update({
      entry_action: result.action,
      recommended_entry_price: result.entryTargetPrice,
      conviction: result.conviction,
      rationale: result.rationale || null,
      recommendation_generated_at: new Date().toISOString(),
    })
    .eq("id", item.id)
    .select()
    .single()

  if (error) {
    return null
  }

  await armEntryAlert(supabase, data, currentPrice)
  return data
}
