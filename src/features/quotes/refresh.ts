import "server-only"

import { getQuotes } from "@/lib/market-data"
import { createAdminClient } from "@/lib/supabase/admin"

export interface RefreshResult {
  /** Number of symbols whose quote was successfully stored. */
  refreshed: number
  /** Distinct symbols held across all portfolios. */
  requested: number
}

/**
 * Refreshes the stored quotes for every symbol held in any user's portfolio.
 *
 * Runs with the service role (it spans all users) and is invoked by the
 * scheduled cron endpoint. Symbols whose quote cannot be retrieved keep their
 * previously stored value.
 */
export async function refreshQuotes(): Promise<RefreshResult> {
  const supabase = createAdminClient()

  const { data, error } = await supabase.from("positions").select("symbol")
  if (error) {
    throw new Error(`Failed to list position symbols: ${error.message}`)
  }

  const symbols = [
    ...new Set((data ?? []).map((row) => row.symbol.toUpperCase())),
  ]
  if (symbols.length === 0) {
    return { refreshed: 0, requested: 0 }
  }

  const quotes = await getQuotes(symbols)
  const rows = [...quotes.values()].map((quote) => ({
    symbol: quote.symbol.toUpperCase(),
    name: quote.name,
    price: quote.price,
    change: quote.change,
    change_percent: quote.changePercent,
    currency: quote.currency,
    updated_at: new Date().toISOString(),
  }))

  if (rows.length > 0) {
    const { error: upsertError } = await supabase
      .from("quotes")
      .upsert(rows, { onConflict: "symbol" })
    if (upsertError) {
      throw new Error(`Failed to store quotes: ${upsertError.message}`)
    }
  }

  return { refreshed: rows.length, requested: symbols.length }
}
