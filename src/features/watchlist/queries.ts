import "server-only"

import { requireUser } from "@/features/auth"
import { getQuotesWithFallback } from "@/features/quotes/queries"
import type { Quote } from "@/lib/market-data"
import type { Watchlist } from "@/lib/types"

/** A watched stock enriched with its live quote and entry-gap figure. */
export interface WatchlistItemWithQuote {
  item: Watchlist
  quote: Quote | null
  /**
   * Gap from the current price down to the recommended entry, as a ratio of
   * the entry price (negative when the price is already at or below entry).
   */
  entryGapPercent: number | null
  /** Whether the Telegram entry alert is currently armed. */
  entryAlertActive: boolean
}

export interface WatchlistData {
  rows: WatchlistItemWithQuote[]
  /** Set when live quotes could not be retrieved at all. */
  quotesError: string | null
}

/** Fetches the current user's watchlist enriched with live quotes. */
export async function getWatchlist(): Promise<WatchlistData> {
  const { user, supabase } = await requireUser()

  const { data, error } = await supabase
    .from("watchlist")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(`Failed to load watchlist: ${error.message}`)
  }

  const items: Watchlist[] = data ?? []

  const [{ quotes, error: quotesError }, alertRows] = await Promise.all([
    getQuotesWithFallback(items.map((item) => item.symbol)),
    items.length > 0
      ? supabase
          .from("alerts")
          .select("watchlist_id, is_active")
          .in(
            "watchlist_id",
            items.map((item) => item.id)
          )
      : Promise.resolve({ data: [] }),
  ])

  const armed = new Set(
    (alertRows.data ?? [])
      .filter((row) => row.is_active && row.watchlist_id)
      .map((row) => row.watchlist_id as string)
  )

  const rows = items.map((item) => {
    const quote = quotes.get(item.symbol.toUpperCase()) ?? null
    const target =
      item.recommended_entry_price === null
        ? null
        : Number(item.recommended_entry_price)
    const entryGapPercent =
      quote && target !== null && target > 0
        ? (quote.price - target) / target
        : null
    return {
      item,
      quote,
      entryGapPercent,
      entryAlertActive: armed.has(item.id),
    }
  })

  return { rows, quotesError }
}
