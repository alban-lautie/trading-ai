import type { WatchlistItemWithQuote } from "@/features/watchlist/queries"

/** Identifies a sortable column of the watchlist table. */
export type WatchlistSortKey =
  | "symbol"
  | "price"
  | "entryAction"
  | "conviction"
  | "entryPrice"
  | "entryGap"
  | "recommendation"

export type SortDirection = "asc" | "desc"

type SortValue = string | number | null

/** Ranks convictions so sorting follows their meaning, not the alphabet. */
const convictionRank: Record<string, number> = { low: 0, medium: 1, high: 2 }

/** Ranks entry actions so "buy now" sorts above "wait". */
const entryActionRank: Record<string, number> = { wait: 0, buy_now: 1 }

/** Extracts the comparable value of each column from a watchlist row. */
const valueGetters: Record<
  WatchlistSortKey,
  (row: WatchlistItemWithQuote) => SortValue
> = {
  symbol: (row) => row.item.symbol,
  price: (row) => row.quote?.price ?? null,
  entryAction: (row) =>
    row.item.entry_action ? entryActionRank[row.item.entry_action] : null,
  conviction: (row) =>
    row.item.conviction ? convictionRank[row.item.conviction] : null,
  entryPrice: (row) =>
    row.item.recommended_entry_price === null
      ? null
      : Number(row.item.recommended_entry_price),
  entryGap: (row) => row.entryGapPercent,
  recommendation: (row) =>
    row.item.recommendation_generated_at
      ? new Date(row.item.recommendation_generated_at).getTime()
      : null,
}

/**
 * Returns a new array of rows sorted by the given column and direction.
 * Rows with a missing value always sort last, whatever the direction.
 */
export function sortWatchlist(
  rows: WatchlistItemWithQuote[],
  key: WatchlistSortKey,
  direction: SortDirection
): WatchlistItemWithQuote[] {
  const getValue = valueGetters[key]
  const factor = direction === "asc" ? 1 : -1

  return [...rows].sort((a, b) => {
    const valueA = getValue(a)
    const valueB = getValue(b)

    if (valueA === null && valueB === null) return 0
    if (valueA === null) return 1
    if (valueB === null) return -1

    if (typeof valueA === "string" && typeof valueB === "string") {
      return valueA.localeCompare(valueB) * factor
    }
    return ((valueA as number) - (valueB as number)) * factor
  })
}
