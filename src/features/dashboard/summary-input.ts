import { buildPositionProposals } from "@/features/positions/proposals"
import type { DailySummaryPosition } from "@/lib/ai/claude"
import type { PositionWithMetrics } from "@/lib/portfolio"
import type { PositionRecommendation } from "@/lib/types"

/**
 * Maps the portfolio rows into the per-position input the daily summary
 * prompt expects, including the take-profit / stop levels and the weight.
 * The price levels come from each position's AI recommendation when one is
 * available, falling back to heuristic placeholders otherwise.
 */
export function buildDailySummaryPositions(
  rows: PositionWithMetrics[],
  totalMarketValue: number,
  recommendations: Map<string, PositionRecommendation> = new Map()
): DailySummaryPosition[] {
  return rows.map((row) => {
    const recommendation = recommendations.get(row.position.id) ?? null
    const proposals = buildPositionProposals(row, recommendation)
    const takeProfit =
      proposals.find((p) => p.kind === "take_profit")?.targetPrice ?? 0
    const stopLoss =
      proposals.find((p) => p.kind === "stop_loss")?.targetPrice ?? 0
    const weightPercent =
      totalMarketValue > 0 && row.marketValue !== null
        ? (row.marketValue / totalMarketValue) * 100
        : 0

    return {
      symbol: row.position.symbol,
      name: row.position.name,
      weightPercent,
      pnlPercent: row.unrealizedPnlPercent,
      dayChangePercent: row.quote?.changePercent ?? null,
      currentPrice: row.quote?.price ?? null,
      takeProfit,
      stopLoss,
      currency: row.position.currency,
    }
  })
}
