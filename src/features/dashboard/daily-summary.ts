import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { buildDailySummaryPositions } from "@/features/dashboard/summary-input"
import { composeDailySummary } from "@/lib/ai/claude"
import type { Database } from "@/lib/database.types"
import { summarizePortfolio, type PositionWithMetrics } from "@/lib/portfolio"
import type { PositionRecommendation } from "@/lib/types"

type Client = SupabaseClient<Database>

/**
 * Builds the daily AI summary for one user from their portfolio rows and
 * stores it in `daily_summaries` (one row per user per day). The take-profit
 * and stop levels in the summary come from the supplied recommendations.
 * Returns `true` when the summary was generated and stored.
 */
export async function generateDailySummary(
  supabase: Client,
  userId: string,
  rows: PositionWithMetrics[],
  recommendations: Map<string, PositionRecommendation>
): Promise<boolean> {
  const summary = summarizePortfolio(rows)

  let content: string
  try {
    content = await composeDailySummary({
      totalValue: summary.marketValue,
      totalPnlPercent: summary.unrealizedPnlPercent,
      positions: buildDailySummaryPositions(
        rows,
        summary.marketValue,
        recommendations
      ),
    })
  } catch {
    // AI unavailable for this user; the caller keeps going with the others.
    return false
  }

  const today = new Date().toISOString().slice(0, 10)
  const { error } = await supabase
    .from("daily_summaries")
    .upsert(
      { user_id: userId, summary_date: today, content },
      { onConflict: "user_id,summary_date" }
    )

  return !error
}
