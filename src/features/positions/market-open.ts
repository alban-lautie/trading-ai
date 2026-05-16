import "server-only"

import { generateDailySummary } from "@/features/dashboard/daily-summary"
import {
  getRecommendations,
  runPositionRecommendation,
} from "@/features/positions/recommendations"
import { getStoredQuotesWith } from "@/features/quotes/queries"
import {
  justOpened,
  regionForCurrency,
  type MarketRegion,
} from "@/lib/market-hours"
import { computePositionMetrics, summarizePortfolio } from "@/lib/portfolio"
import { createAdminClient } from "@/lib/supabase/admin"
import type { Position } from "@/lib/types"

/** Markets whose opening triggers a recompute. */
const REGIONS: readonly MarketRegion[] = ["US", "EU"]
/** Window matching the 5-minute cron cadence used to detect the open. */
const OPEN_WINDOW_MINUTES = 5

export interface MarketOpenResult {
  /** Regions detected as having just opened. */
  regions: MarketRegion[]
  /** Recommendations regenerated. */
  recommendations: number
  /** Daily summaries refreshed. */
  summaries: number
}

/**
 * Recomputes AI recommendations for every position whose market has just
 * opened, then refreshes the affected users' daily summary so it reflects the
 * new sell targets. Runs with the service role; invoked by the 5-minute cron,
 * and a no-op outside the opening window of the US and EU markets.
 */
export async function recomputeAtMarketOpen(): Promise<MarketOpenResult> {
  const now = new Date()
  const openedRegions = REGIONS.filter((region) =>
    justOpened(region, OPEN_WINDOW_MINUTES, now)
  )
  if (openedRegions.length === 0) {
    return { regions: [], recommendations: 0, summaries: 0 }
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase.from("positions").select("*")
  if (error) {
    throw new Error(`Failed to load positions: ${error.message}`)
  }

  const positions: Position[] = data ?? []
  if (positions.length === 0) {
    return { regions: [...openedRegions], recommendations: 0, summaries: 0 }
  }

  const symbols = [...new Set(positions.map((p) => p.symbol.toUpperCase()))]
  const quotes = await getStoredQuotesWith(supabase, symbols)

  const byUser = new Map<string, Position[]>()
  for (const position of positions) {
    const list = byUser.get(position.user_id) ?? []
    list.push(position)
    byUser.set(position.user_id, list)
  }

  const openedSet = new Set<MarketRegion>(openedRegions)
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

    // Only positions whose own market just opened are recomputed; the rest
    // keep their last recommendation.
    const toRecompute = rows.filter((row) => {
      const region = regionForCurrency(row.position.currency)
      return region !== null && openedSet.has(region)
    })
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

  return { regions: [...openedRegions], recommendations, summaries }
}
