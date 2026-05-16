import "server-only"

import { generateDailySummary } from "@/features/dashboard/daily-summary"
import { getRecommendations } from "@/features/positions/recommendations"
import { getStoredQuotesWith } from "@/features/quotes/queries"
import { computePositionMetrics } from "@/lib/portfolio"
import { createAdminClient } from "@/lib/supabase/admin"
import type { Position } from "@/lib/types"

export interface DailySummaryRunResult {
  /** Users that hold at least one position. */
  users: number
  /** Summaries successfully generated and stored. */
  generated: number
}

/**
 * Generates and caches the daily AI summary for every user that holds a
 * position. Runs with the service role; invoked by the scheduled cron.
 */
export async function runDailySummaries(): Promise<DailySummaryRunResult> {
  const supabase = createAdminClient()

  const { data, error } = await supabase.from("positions").select("*")
  if (error) {
    throw new Error(`Failed to load positions: ${error.message}`)
  }

  const positions: Position[] = data ?? []
  if (positions.length === 0) {
    return { users: 0, generated: 0 }
  }

  const symbols = [...new Set(positions.map((p) => p.symbol.toUpperCase()))]
  const quotes = await getStoredQuotesWith(supabase, symbols)

  const byUser = new Map<string, Position[]>()
  for (const position of positions) {
    const list = byUser.get(position.user_id) ?? []
    list.push(position)
    byUser.set(position.user_id, list)
  }

  let generated = 0

  for (const [userId, userPositions] of byUser) {
    const rows = userPositions.map((position) =>
      computePositionMetrics(
        position,
        quotes.get(position.symbol.toUpperCase()) ?? null
      )
    )
    const recommendations = await getRecommendations(
      supabase,
      userPositions.map((position) => position.id)
    )

    if (await generateDailySummary(supabase, userId, rows, recommendations)) {
      generated += 1
    }
  }

  return { users: byUser.size, generated }
}
