import "server-only"

import { requireUser } from "@/features/auth"
import { getStoredQuotes } from "@/features/quotes/queries"
import { getQuotes, MarketDataError, type Quote } from "@/lib/market-data"
import {
  computePositionMetrics,
  summarizePortfolio,
  type PortfolioSummary,
  type PositionWithMetrics,
} from "@/lib/portfolio"
import type { Position } from "@/lib/types"

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
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(`Failed to load positions: ${error.message}`)
  }

  const positions: Position[] = data ?? []
  const symbols = positions.map((position) => position.symbol)

  let quotesError: string | null = null
  let quotes = new Map<string, Quote>()

  // Prefer the quotes kept fresh by the refresh cron.
  try {
    quotes = await getStoredQuotes(symbols)
  } catch {
    quotes = new Map()
  }

  // Symbols not yet in the store (e.g. a position added since the last cron
  // run) are fetched live so the dashboard is never stale on first view.
  const missing = symbols.filter(
    (symbol) => !quotes.has(symbol.toUpperCase())
  )
  if (missing.length > 0) {
    try {
      const live = await getQuotes(missing)
      for (const [symbol, quote] of live) {
        quotes.set(symbol, quote)
      }
    } catch (cause) {
      if (quotes.size === 0) {
        quotesError =
          cause instanceof MarketDataError
            ? cause.message
            : "Live quotes are temporarily unavailable."
      }
    }
  }

  const rows = positions.map((position) =>
    computePositionMetrics(
      position,
      quotes.get(position.symbol.toUpperCase()) ?? null
    )
  )

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
    .order("symbol", { ascending: true })

  if (error) {
    throw new Error(`Failed to load positions: ${error.message}`)
  }

  return data ?? []
}
