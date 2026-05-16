import "server-only"

import { getQuotes } from "@/lib/market-data"
import { isCurrencyMarketOpen } from "@/lib/market-hours"
import { createAdminClient } from "@/lib/supabase/admin"

export interface RefreshResult {
  /** Number of symbols whose quote was successfully stored. */
  refreshed: number
  /** Symbols whose market is open and were refreshed. */
  requested: number
  /** Symbols skipped because their market is closed. */
  skipped: number
}

/**
 * Refreshes the stored quotes for every symbol whose market is currently open.
 *
 * Runs with the service role (it spans all users) and is invoked every five
 * minutes by the scheduled cron. Symbols whose market is closed are skipped so
 * the table is not churned with stale prices; symbols whose quote cannot be
 * retrieved keep their previously stored value.
 */
export async function refreshQuotes(): Promise<RefreshResult> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from("positions")
    .select("symbol, currency")
  if (error) {
    throw new Error(`Failed to list position symbols: ${error.message}`)
  }

  // Keep the first currency seen per symbol — it decides the trading hours.
  const currencyBySymbol = new Map<string, string>()
  for (const row of data ?? []) {
    const symbol = row.symbol.toUpperCase()
    if (!currencyBySymbol.has(symbol)) {
      currencyBySymbol.set(symbol, row.currency)
    }
  }

  const allSymbols = [...currencyBySymbol.keys()]
  const openSymbols = allSymbols.filter((symbol) =>
    isCurrencyMarketOpen(currencyBySymbol.get(symbol) as string)
  )

  if (openSymbols.length === 0) {
    return { refreshed: 0, requested: 0, skipped: allSymbols.length }
  }

  const quotes = await getQuotes(openSymbols)
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

  return {
    refreshed: rows.length,
    requested: openSymbols.length,
    skipped: allSymbols.length - openSymbols.length,
  }
}
