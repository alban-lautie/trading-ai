/**
 * A real-time quote for a single symbol, normalized so the rest of the app
 * never depends on the shape returned by a specific market-data provider.
 */
export interface Quote {
  symbol: string
  /** Display name of the instrument, when the provider returns one. */
  name: string | null
  /** Last traded price. */
  price: number
  /** Absolute change since the previous close. */
  change: number
  /** Percentage change since the previous close. */
  changePercent: number
  /** ISO 4217 currency code the price is expressed in. */
  currency: string
  /** Unix epoch (ms) the quote was produced by the provider. */
  timestamp: number
}

/** Thrown when a quote cannot be retrieved for a symbol. */
export class MarketDataError extends Error {
  constructor(
    message: string,
    public readonly symbol?: string
  ) {
    super(message)
    this.name = "MarketDataError"
  }
}

/** Supported ranges for the price history chart. */
export type ChartRange = "1mo" | "6mo" | "1y"

/** A single point on the price history curve. */
export interface PricePoint {
  /** ISO date, `yyyy-mm-dd`. */
  date: string
  close: number
}

/** Price history of a symbol plus the high/low reference levels. */
export interface PriceHistory {
  range: ChartRange
  points: PricePoint[]
  currency: string
  fiftyTwoWeekHigh: number | null
  fiftyTwoWeekLow: number | null
  dayHigh: number | null
  dayLow: number | null
}

/** A news article about a symbol. */
export interface NewsItem {
  id: string
  title: string
  url: string
  publisher: string
  /** Publication time, Unix epoch in milliseconds. */
  publishedAt: number
}
