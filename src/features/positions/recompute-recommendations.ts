import "server-only"

import { generateDailySummary } from "@/features/dashboard/daily-summary"
import {
  getRecommendations,
  runPositionRecommendation,
} from "@/features/positions/recommendations"
import { getStoredQuotesWith } from "@/features/quotes/queries"
import { regionForCurrency, type MarketRegion } from "@/lib/market-hours"
import { computePositionMetrics, summarizePortfolio } from "@/lib/portfolio"
import { createAdminClient } from "@/lib/supabase/admin"
import type { Position } from "@/lib/types"

export interface RecomputeResult {
  /** Market region whose recommendations were recomputed. */
  region: MarketRegion
  /** Recommendations regenerated. */
  recommendations: number
  /** Daily summaries refreshed. */
  summaries: number
}

/**
 * Recomputes the AI sell recommendations for every position trading in the
 * given region, then refreshes the affected users' daily summary so it
 * reflects the new sell targets. Runs with the service role; invoked once per
 * weekday by the cron scheduled at that market's open.
 */
export async function recomputeRegionRecommendations(
  region: MarketRegion
): Promise<RecomputeResult> {
  const supabase = createAdminClient()
  const { data, error } = await supabase.from("positions").select("*")
  if (error) {
    throw new Error(`Failed to load positions: ${error.message}`)
  }

  const positions: Position[] = data ?? []
  if (positions.length === 0) {
    return { region, recommendations: 0, summaries: 0 }
  }

  const symbols = [...new Set(positions.map((p) => p.symbol.toUpperCase()))]
  const quotes = await getStoredQuotesWith(supabase, symbols)

  const byUser = new Map<string, Position[]>()
  for (const position of positions) {
    const list = byUser.get(position.user_id) ?? []
    list.push(position)
    byUser.set(position.user_id, list)
  }

  let recommendations = 0
  let summaries = 0

  for (const [userId, userPositions] of byUser) {
    const rows = userPositions.map((position) =>
      computePositionMetrics(
        position,
        quotes.get(position.symbol.toUpperCase()) ?? null
      )
    )
    const summary = summarizePortfolio(rows)
    const context = {
      portfolioTotalValue: summary.marketValue,
      portfolioPnlPercent: summary.unrealizedPnlPercent,
      positionCount: rows.length,
    }

    // Only positions trading in the given region are recomputed; the rest
    // keep their last recommendation.
    const toRecompute = rows.filter(
      (row) => regionForCurrency(row.position.currency) === region
    )
    if (toRecompute.length === 0) {
      continue
    }

    for (const row of toRecompute) {
      const result = await runPositionRecommendation(supabase, row, context)
      if (result) {
        recommendations += 1
      }
    }

    const refreshed = await getRecommendations(
      supabase,
      userPositions.map((position) => position.id)
    )
    if (await generateDailySummary(supabase, userId, rows, refreshed)) {
      summaries += 1
    }
  }

  return { region, recommendations, summaries }
}
