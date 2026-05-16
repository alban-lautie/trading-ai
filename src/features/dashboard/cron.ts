import "server-only"

import { buildDailySummaryPositions } from "@/features/dashboard/summary-input"
import { composeDailySummary } from "@/lib/ai/claude"
import type { Quote } from "@/lib/market-data"
import { computePositionMetrics, summarizePortfolio } from "@/lib/portfolio"
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
  const { data: quoteRows } = await supabase
    .from("quotes")
    .select("*")
    .in("symbol", symbols)

  const quotes = new Map<string, Quote>(
    (quoteRows ?? []).map((row) => [
      row.symbol.toUpperCase(),
      {
        symbol: row.symbol,
        name: row.name,
        price: Number(row.price),
        change: Number(row.change),
        changePercent: Number(row.change_percent),
        currency: row.currency,
        timestamp: new Date(row.updated_at).getTime(),
      },
    ])
  )

  const byUser = new Map<string, Position[]>()
  for (const position of positions) {
    const list = byUser.get(position.user_id) ?? []
    list.push(position)
    byUser.set(position.user_id, list)
  }

  const today = new Date().toISOString().slice(0, 10)
  let generated = 0

  for (const [userId, userPositions] of byUser) {
    const rows = userPositions.map((position) =>
      computePositionMetrics(
        position,
        quotes.get(position.symbol.toUpperCase()) ?? null
      )
    )
    const summary = summarizePortfolio(rows)

    let content: string
    try {
      content = await composeDailySummary({
        totalValue: summary.marketValue,
        totalPnlPercent: summary.unrealizedPnlPercent,
        positions: buildDailySummaryPositions(rows, summary.marketValue),
      })
    } catch {
      // Skip this user (e.g. AI unavailable); others still run.
      continue
    }

    const { error: upsertError } = await supabase
      .from("daily_summaries")
      .upsert(
        { user_id: userId, summary_date: today, content },
        { onConflict: "user_id,summary_date" }
      )
    if (!upsertError) {
      generated += 1
    }
  }

  return { users: byUser.size, generated }
}
