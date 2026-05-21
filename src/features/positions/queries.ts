import "server-only"

import { requireUser } from "@/features/auth"
import {
  getRecommendation,
  getRecommendations,
} from "@/features/positions/recommendations"
import { getQuotesWithFallback } from "@/features/quotes/queries"
import {
  getPriceHistory,
  getStockNews,
  type NewsItem,
  type PriceHistory,
} from "@/lib/market-data"
import {
  computePositionMetrics,
  summarizePortfolio,
  type PortfolioSummary,
  type PositionWithMetrics,
} from "@/lib/portfolio"
import type { Alert, Position, PositionRecommendation } from "@/lib/types"

export interface PortfolioData {
  rows: PositionWithMetrics[]
  summary: PortfolioSummary
  /** Set when live quotes could not be retrieved at all. */
  quotesError: string | null
}

/** Fetches the current user's positions enriched with live quotes. */
export async function getPortfolio(): Promise<PortfolioData> {
  const { user, supabase } = await requireUser()

  const { data, error } = await supabase
    .from("positions")
    .select("*")
    .eq("user_id", user.id)
    .gt("quantity", 0)
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(`Failed to load positions: ${error.message}`)
  }

  const positions: Position[] = data ?? []
  const [{ quotes, error: quotesError }, recommendations] = await Promise.all([
    getQuotesWithFallback(positions.map((position) => position.symbol)),
    getRecommendations(
      supabase,
      positions.map((position) => position.id)
    ),
  ])

  const rows = positions.map((position) => ({
    ...computePositionMetrics(
      position,
      quotes.get(position.symbol.toUpperCase()) ?? null
    ),
    recommendationGeneratedAt:
      recommendations.get(position.id)?.generated_at ?? null,
  }))

  return {
    rows,
    summary: summarizePortfolio(rows),
    quotesError,
  }
}

/** Returns the current user's positions without live quotes, ordered by symbol. */
export async function listPositions(): Promise<Position[]> {
  const { user, supabase } = await requireUser()

  const { data, error } = await supabase
    .from("positions")
    .select("*")
    .eq("user_id", user.id)
    .gt("quantity", 0)
    .order("symbol", { ascending: true })

  if (error) {
    throw new Error(`Failed to load positions: ${error.message}`)
  }

  return data ?? []
}

export interface PositionDetail {
  metrics: PositionWithMetrics
  alerts: Alert[]
  history: PriceHistory | null
  news: NewsItem[]
  /** Share of the total portfolio value held in this position. */
  portfolioWeight: number | null
  /** Latest AI sell recommendation, or `null` when none was generated yet. */
  recommendation: PositionRecommendation | null
}

/**
 * Fetches everything the position detail page needs: the position's live
 * metrics, its weight in the portfolio, price history, recent news and the
 * alerts attached to it. Returns `null` when the position does not exist or
 * does not belong to the user.
 */
export async function getPositionDetail(
  id: string
): Promise<PositionDetail | null> {
  const portfolio = await getPortfolio()
  const metrics = portfolio.rows.find((row) => row.position.id === id)
  if (!metrics) {
    return null
  }

  const { symbol } = metrics.position
  const { supabase } = await requireUser()

  const [history, news, alertsResult, recommendation] = await Promise.all([
    getPriceHistory(symbol, "6mo").catch(() => null),
    getStockNews(symbol),
    supabase
      .from("alerts")
      .select("*")
      .eq("position_id", id)
      .order("created_at", { ascending: false }),
    getRecommendation(supabase, id),
  ])

  if (alertsResult.error) {
    throw new Error(`Failed to load alerts: ${alertsResult.error.message}`)
  }

  const total = portfolio.summary.marketValue
  const portfolioWeight =
    metrics.marketValue !== null && total > 0
      ? metrics.marketValue / total
      : null

  return {
    metrics,
    alerts: alertsResult.data ?? [],
    history,
    news,
    portfolioWeight,
    recommendation,
  }
}
