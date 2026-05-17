import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import {
  POSITION_HORIZON_LABELS,
  POSITION_OBJECTIVE_LABELS,
  RISK_TOLERANCE_LABELS,
} from "@/features/positions/intentions"
import { generatePositionRecommendation } from "@/lib/ai/claude"
import type { Database } from "@/lib/database.types"
import {
  computeIndicators,
  getPriceHistory,
  getStockFundamentals,
  getStockNews,
} from "@/lib/market-data"
import type { PriceHistory } from "@/lib/market-data"
import type { PositionWithMetrics } from "@/lib/portfolio"
import type { AlertType, Position, PositionRecommendation } from "@/lib/types"

/** Number of recent news articles passed to the recommendation prompt. */
const NEWS_LIMIT = 8
/** Trading days used to annualize daily volatility. */
const TRADING_DAYS = 252
/** Milliseconds in a day, used to age news articles. */
const DAY_MS = 86_400_000

type Client = SupabaseClient<Database>

/** Portfolio-wide figures the recommendation weighs each position against. */
export interface RecommendationContext {
  portfolioTotalValue: number
  portfolioPnlPercent: number
  positionCount: number
}

/**
 * Annualized volatility (in percent) derived from the close prices of the
 * price history. Returns `null` when there is not enough data.
 */
function computeVolatility(history: PriceHistory | null): number | null {
  const closes = history?.points.map((point) => point.close) ?? []
  if (closes.length < 10) {
    return null
  }

  const returns: number[] = []
  for (let i = 1; i < closes.length; i += 1) {
    const previous = closes[i - 1]
    if (previous > 0) {
      returns.push(Math.log(closes[i] / previous))
    }
  }
  if (returns.length < 2) {
    return null
  }

  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length
  const variance =
    returns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / (returns.length - 1)

  return Math.sqrt(variance) * Math.sqrt(TRADING_DAYS) * 100
}

/**
 * Generates a fresh AI recommendation for one position and stores it,
 * overwriting any previous recommendation for that position. Returns the
 * stored row, or `null` when generation failed (the caller can keep going).
 */
export async function runPositionRecommendation(
  supabase: Client,
  metrics: PositionWithMetrics,
  context: RecommendationContext
): Promise<PositionRecommendation | null> {
  const { position } = metrics

  const [history, news, fundamentals] = await Promise.all([
    getPriceHistory(position.symbol, "1y").catch(() => null),
    getStockNews(position.symbol),
    getStockFundamentals(position.symbol),
  ])

  const currentPrice =
    metrics.quote?.price ?? history?.points.at(-1)?.close ?? null
  const weightPercent =
    context.portfolioTotalValue > 0 && metrics.marketValue !== null
      ? (metrics.marketValue / context.portfolioTotalValue) * 100
      : null

  let result
  try {
    result = await generatePositionRecommendation({
      symbol: position.symbol,
      name: position.name,
      quantity: Number(position.quantity),
      averagePrice: Number(position.average_price),
      currency: position.currency,
      openedAt: position.opened_at,
      objective: POSITION_OBJECTIVE_LABELS[position.objective],
      horizon: POSITION_HORIZON_LABELS[position.horizon],
      riskTolerance: RISK_TOLERANCE_LABELS[position.risk_tolerance],
      targetGainPercent:
        position.target_gain_percent === null
          ? null
          : Number(position.target_gain_percent),
      currentPrice,
      dayChangePercent: metrics.quote?.changePercent ?? null,
      fiftyTwoWeekHigh: history?.fiftyTwoWeekHigh ?? null,
      fiftyTwoWeekLow: history?.fiftyTwoWeekLow ?? null,
      volatilityPercent: computeVolatility(history),
      indicators: history ? computeIndicators(history.points) : null,
      fundamentals,
      news: news.slice(0, NEWS_LIMIT).map((item) => ({
        title: item.title,
        publisher: item.publisher,
        ageDays: Math.max(
          0,
          Math.floor((Date.now() - item.publishedAt) / DAY_MS)
        ),
      })),
      portfolioTotalValue: context.portfolioTotalValue,
      portfolioPnlPercent: context.portfolioPnlPercent,
      positionCount: context.positionCount,
      weightPercent,
    })
  } catch {
    return null
  }

  const { data, error } = await supabase
    .from("position_recommendations")
    .upsert(
      {
        position_id: position.id,
        user_id: position.user_id,
        action: result.action,
        sell_target_price: result.sellTargetPrice,
        stop_loss_price: result.stopLossPrice,
        conviction: result.conviction,
        generated_at: new Date().toISOString(),
      },
      { onConflict: "position_id" }
    )
    .select()
    .single()

  if (error) {
    return null
  }

  await armProposalAlerts(supabase, position, result)
  return data
}

/**
 * Replaces the alerts armed from this position's proposals so they always
 * match the latest recommendation: every previous take-profit / stop-loss
 * proposal alert is removed and a fresh active alert is created from the new
 * price levels. Alerts created manually (without a proposal kind) are left
 * untouched.
 */
async function armProposalAlerts(
  supabase: Client,
  position: Position,
  result: { sellTargetPrice: number | null; stopLossPrice: number | null }
): Promise<void> {
  const specs: Array<{ kind: string; type: AlertType; price: number | null }> =
    [
      {
        kind: "take_profit",
        type: "price_above",
        price: result.sellTargetPrice,
      },
      { kind: "stop_loss", type: "price_below", price: result.stopLossPrice },
    ]

  for (const { kind, type, price } of specs) {
    // Drop the alert previously armed from this proposal, whatever its state.
    await supabase
      .from("alerts")
      .delete()
      .eq("position_id", position.id)
      .eq("proposal_kind", kind)

    if (price !== null) {
      await supabase.from("alerts").insert({
        user_id: position.user_id,
        position_id: position.id,
        symbol: position.symbol,
        type,
        threshold: Math.round(price * 100) / 100,
        proposal_kind: kind,
        is_active: true,
      })
    }
  }
}

/** Fetches the stored recommendation for a single position, if any. */
export async function getRecommendation(
  supabase: Client,
  positionId: string
): Promise<PositionRecommendation | null> {
  const { data } = await supabase
    .from("position_recommendations")
    .select("*")
    .eq("position_id", positionId)
    .maybeSingle()
  return data ?? null
}

/** Fetches the stored recommendations for several positions, keyed by id. */
export async function getRecommendations(
  supabase: Client,
  positionIds: string[]
): Promise<Map<string, PositionRecommendation>> {
  if (positionIds.length === 0) {
    return new Map()
  }
  const { data } = await supabase
    .from("position_recommendations")
    .select("*")
    .in("position_id", positionIds)
  return new Map((data ?? []).map((row) => [row.position_id, row]))
}
