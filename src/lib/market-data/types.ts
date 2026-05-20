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
  /** Intraday high, when the provider returns one. */
  high?: number | null
  /** Intraday low, when the provider returns one. */
  low?: number | null
}

/** Technical indicators derived from a symbol's price history. */
export interface TechnicalIndicators {
  /** 50-day simple moving average of the close. */
  sma50: number | null
  /** 200-day simple moving average of the close. */
  sma200: number | null
  /** 14-day Relative Strength Index (0–100). */
  rsi14: number | null
  /** 14-day Average True Range, an absolute volatility measure. */
  atr14: number | null
  /** Lowest close over the last 20 sessions — a recent support. */
  recentLow: number | null
  /** Highest close over the last 20 sessions — a recent resistance. */
  recentHigh: number | null
}

/** Fundamentals and analyst data for a symbol, from Yahoo `quoteSummary`. */
export interface StockFundamentals {
  /** Mean analyst price target. */
  targetMeanPrice: number | null
  /** Highest analyst price target. */
  targetHighPrice: number | null
  /** Lowest analyst price target. */
  targetLowPrice: number | null
  /** Consensus key, e.g. `buy`, `hold`, `sell`. */
  recommendationKey: string | null
  /** Number of analysts behind the consensus. */
  numberOfAnalysts: number | null
  /** Trailing price-to-earnings ratio. */
  trailingPE: number | null
  /** Forward price-to-earnings ratio. */
  forwardPE: number | null
  /** Trailing earnings per share. */
  trailingEps: number | null
  /** Market capitalization. */
  marketCap: number | null
  /** Dividend yield, as a fraction (0.012 = 1.2%). */
  dividendYield: number | null
  /** Beta — sensitivity to the broad market. */
  beta: number | null
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

/** Intraday interval supported by the provider. */
export type IntradayInterval = "1m" | "5m" | "15m" | "30m" | "60m"

/** Intraday range supported by the provider (capped by the interval). */
export type IntradayRange = "1d" | "5d" | "7d" | "1mo"

/** A single intraday point: candle with a precise timestamp. */
export interface IntradayPoint {
  /** ISO timestamp at the start of the candle. */
  timestamp: string
  /** Last traded price at the close of the candle. */
  close: number
  open: number | null
  high: number | null
  low: number | null
  volume: number | null
}

/** Intraday price history of a symbol. */
export interface IntradayHistory {
  interval: IntradayInterval
  range: IntradayRange
  points: IntradayPoint[]
  currency: string
  /** Regular trading session bounds reported by the provider (Unix epoch ms). */
  sessionStart: number | null
  sessionEnd: number | null
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
