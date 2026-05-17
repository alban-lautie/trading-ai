import "server-only"

import { fetchYahooQuotes } from "@/lib/market-data/yahoo"
import type { Quote } from "@/lib/market-data/types"

export type {
  Quote,
  ChartRange,
  PriceHistory,
  PricePoint,
  NewsItem,
  TechnicalIndicators,
  StockFundamentals,
} from "@/lib/market-data/types"
export { MarketDataError } from "@/lib/market-data/types"

/** Fetches the price history of a symbol for a given range. */
export { fetchYahooChart as getPriceHistory } from "@/lib/market-data/chart"
/** Fetches recent news for a symbol (best-effort, never throws). */
export { fetchYahooNews as getStockNews } from "@/lib/market-data/news"
/** Computes technical indicators from a price history. */
export { computeIndicators } from "@/lib/market-data/indicators"
/** Fetches fundamentals and analyst data for a symbol (best-effort). */
export { fetchYahooFundamentals as getStockFundamentals } from "@/lib/market-data/fundamentals"

/**
 * Public entry point for market data. The rest of the app imports quotes
 * from here and never talks to a provider directly.
 */

/** How long a cached quote stays fresh, in milliseconds. */
const CACHE_TTL_MS = 60_000

interface CacheEntry {
  quote: Quote
  expiresAt: number
}

const cache = new Map<string, CacheEntry>()

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase()
}

/**
 * Returns quotes for the given symbols, served from a short-lived in-memory
 * cache when possible. Symbols whose quote cannot be retrieved are omitted;
 * callers must handle missing entries explicitly rather than assume a price.
 */
export async function getQuotes(symbols: string[]): Promise<Map<string, Quote>> {
  const now = Date.now()
  const wanted = [...new Set(symbols.map(normalizeSymbol))].filter(Boolean)
  const result = new Map<string, Quote>()
  const stale: string[] = []

  for (const symbol of wanted) {
    const entry = cache.get(symbol)
    if (entry && entry.expiresAt > now) {
      result.set(symbol, entry.quote)
    } else {
      stale.push(symbol)
    }
  }

  if (stale.length > 0) {
    const fresh = await fetchYahooQuotes(stale)
    for (const quote of fresh) {
      const symbol = normalizeSymbol(quote.symbol)
      cache.set(symbol, { quote, expiresAt: now + CACHE_TTL_MS })
      result.set(symbol, quote)
    }
  }

  return result
}

/** Convenience helper for a single symbol. Returns `null` when unavailable. */
export async function getQuote(symbol: string): Promise<Quote | null> {
  const quotes = await getQuotes([symbol])
  return quotes.get(normalizeSymbol(symbol)) ?? null
}
