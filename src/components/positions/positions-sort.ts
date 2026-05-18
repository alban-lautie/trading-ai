import type { PositionWithMetrics } from "@/lib/portfolio"

/** Identifies a sortable column of the positions table. */
export type SortKey =
  | "symbol"
  | "quantity"
  | "averagePrice"
  | "price"
  | "marketValue"
  | "unrealizedPnl"
  | "unrealizedPnlPercent"
  | "quoteTime"
  | "recommendation"

export type SortDirection = "asc" | "desc"

type SortValue = string | number | null

/** Extracts the comparable value of each column from a position row. */
const valueGetters: Record<SortKey, (row: PositionWithMetrics) => SortValue> = {
  symbol: (row) => row.position.symbol,
  quantity: (row) => Number(row.position.quantity),
  averagePrice: (row) => Number(row.position.average_price),
  price: (row) => row.quote?.price ?? null,
  marketValue: (row) => row.marketValue,
  unrealizedPnl: (row) => row.unrealizedPnl,
  unrealizedPnlPercent: (row) => row.unrealizedPnlPercent,
  quoteTime: (row) => row.quote?.timestamp ?? null,
  recommendation: (row) =>
    row.recommendationGeneratedAt
      ? new Date(row.recommendationGeneratedAt).getTime()
      : null,
}

/**
 * Returns a new array of rows sorted by the given column and direction.
 * Rows with a missing value always sort last, whatever the direction.
 */
export function sortPositions(
  rows: PositionWithMetrics[],
  key: SortKey,
  direction: SortDirection
): PositionWithMetrics[] {
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
