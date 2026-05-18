import type { Quote } from "@/lib/market-data/types"
import { isCurrencyMarketOpen } from "@/lib/market-hours"
import type { Position } from "@/lib/types"

/**
 * A position enriched with its live quote and the derived P/L figures shown
 * in the UI. `quote` is `null` when the market price could not be retrieved,
 * in which case the computed values are also `null`.
 */
export interface PositionWithMetrics {
  position: Position
  quote: Quote | null
  /** quantity x average_price */
  costBasis: number
  /** quantity x current price */
  marketValue: number | null
  /** marketValue - costBasis (unrealized P/L) */
  unrealizedPnl: number | null
  /** unrealizedPnl / costBasis */
  unrealizedPnlPercent: number | null
  /** Whether the market the position trades on is currently open. */
  marketOpen: boolean
  /** ISO timestamp of the last AI recommendation, when one exists. */
  recommendationGeneratedAt?: string | null
}

/** Aggregate figures for the whole portfolio. */
export interface PortfolioSummary {
  costBasis: number
  marketValue: number
  unrealizedPnl: number
  unrealizedPnlPercent: number
  /** Number of positions whose quote could not be retrieved. */
  missingQuotes: number
}

/** Computes the P/L metrics for a single position against its quote. */
export function computePositionMetrics(
  position: Position,
  quote: Quote | null
): PositionWithMetrics {
  const quantity = Number(position.quantity)
  const averagePrice = Number(position.average_price)
  const costBasis = quantity * averagePrice
  const marketOpen = isCurrencyMarketOpen(position.currency)

  if (!quote) {
    return {
      position,
      quote: null,
      costBasis,
      marketValue: null,
      unrealizedPnl: null,
      unrealizedPnlPercent: null,
      marketOpen,
    }
  }

  const marketValue = quantity * quote.price
  const unrealizedPnl = marketValue - costBasis
  const unrealizedPnlPercent = costBasis > 0 ? unrealizedPnl / costBasis : 0

  return {
    position,
    quote,
    costBasis,
    marketValue,
    unrealizedPnl,
    unrealizedPnlPercent,
    marketOpen,
  }
}

/** Aggregates per-position metrics into a portfolio-wide summary. */
export function summarizePortfolio(
  rows: PositionWithMetrics[]
): PortfolioSummary {
  let costBasis = 0
  let marketValue = 0
  let missingQuotes = 0

  for (const row of rows) {
    costBasis += row.costBasis
    if (row.marketValue === null) {
      missingQuotes += 1
      // Fall back to cost basis so the total is not misleadingly low.
      marketValue += row.costBasis
    } else {
      marketValue += row.marketValue
    }
  }

  const unrealizedPnl = marketValue - costBasis

  return {
    costBasis,
    marketValue,
    unrealizedPnl,
    unrealizedPnlPercent: costBasis > 0 ? unrealizedPnl / costBasis : 0,
    missingQuotes,
  }
}
