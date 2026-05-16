import "server-only"

import { getQuotes, MarketDataError, type Quote } from "@/lib/market-data"
import { createClient } from "@/lib/supabase/server"

/**
 * Reads the stored quotes for the given symbols from the `quotes` table.
 * These are kept fresh by the scheduled refresh cron.
 */
export async function getStoredQuotes(
  symbols: string[]
): Promise<Map<string, Quote>> {
  const result = new Map<string, Quote>()
  if (symbols.length === 0) return result

  const wanted = [...new Set(symbols.map((symbol) => symbol.toUpperCase()))]
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("quotes")
    .select("*")
    .in("symbol", wanted)

  if (error) {
    throw new Error(`Failed to load stored quotes: ${error.message}`)
  }

  for (const row of data ?? []) {
    result.set(row.symbol.toUpperCase(), {
      symbol: row.symbol,
      name: row.name,
      price: Number(row.price),
      change: Number(row.change),
      changePercent: Number(row.change_percent),
      currency: row.currency,
      timestamp: new Date(row.updated_at).getTime(),
    })
  }

  return result
}

/**
 * Resolves quotes for the given symbols, preferring the cron-refreshed store
 * and falling back to a live fetch for symbols not yet stored. `error` is set
 * only when no quote at all could be obtained.
 */
export async function getQuotesWithFallback(symbols: string[]): Promise<{
  quotes: Map<string, Quote>
  error: string | null
}> {
  let quotes = new Map<string, Quote>()
  try {
    quotes = await getStoredQuotes(symbols)
  } catch {
    quotes = new Map()
  }

  const missing = symbols.filter(
    (symbol) => !quotes.has(symbol.toUpperCase())
  )
  let error: string | null = null

  if (missing.length > 0) {
    try {
      const live = await getQuotes(missing)
      for (const [symbol, quote] of live) {
        quotes.set(symbol, quote)
      }
    } catch (cause) {
      if (quotes.size === 0) {
        error =
          cause instanceof MarketDataError
            ? cause.message
            : "Live quotes are temporarily unavailable."
      }
    }
  }

  return { quotes, error }
}
