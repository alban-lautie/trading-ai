import { buildPositionProposals } from "@/features/positions/proposals"
import type { DailySummaryPosition } from "@/lib/ai/claude"
import type { PositionWithMetrics } from "@/lib/portfolio"

/**
 * Maps the portfolio rows into the per-position input the daily summary
 * prompt expects, including the take-profit / stop levels and the weight.
 */
export function buildDailySummaryPositions(
  rows: PositionWithMetrics[],
  totalMarketValue: number
): DailySummaryPosition[] {
  return rows.map((row) => {
    const proposals = buildPositionProposals(row)
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
