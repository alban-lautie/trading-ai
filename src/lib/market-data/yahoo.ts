import "server-only"

import { MarketDataError, type Quote } from "@/lib/market-data/types"

/**
 * Yahoo Finance quote provider.
 *
 * Yahoo Finance has no official public API: this module is the single place
 * that knows about its endpoints. Keeping it isolated lets us swap providers
 * without touching the rest of the app.
 */

const QUOTE_ENDPOINT = "https://query1.finance.yahoo.com/v7/finance/quote"

interface YahooQuoteResult {
  symbol: string
  longName?: string
  shortName?: string
  regularMarketPrice?: number
  regularMarketChange?: number
  regularMarketChangePercent?: number
  currency?: string
  regularMarketTime?: number
}

interface YahooQuoteResponse {
  quoteResponse?: {
    result?: YahooQuoteResult[]
    error?: unknown
  }
}

function toQuote(result: YahooQuoteResult): Quote {
  return {
    symbol: result.symbol,
    name: result.longName ?? result.shortName ?? null,
    price: result.regularMarketPrice ?? 0,
    change: result.regularMarketChange ?? 0,
    changePercent: result.regularMarketChangePercent ?? 0,
    currency: result.currency ?? "USD",
    timestamp: (result.regularMarketTime ?? Date.now() / 1000) * 1000,
  }
}

/**
 * Fetches live quotes for the given symbols from Yahoo Finance.
 * Symbols that cannot be resolved are simply omitted from the result.
 */
export async function fetchYahooQuotes(symbols: string[]): Promise<Quote[]> {
  if (symbols.length === 0) return []

  const url = `${QUOTE_ENDPOINT}?symbols=${encodeURIComponent(symbols.join(","))}`

  let response: Response
  try {
    response = await fetch(url, {
      headers: {
        // Yahoo rejects requests without a browser-like User-Agent.
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        Accept: "application/json",
      },
      cache: "no-store",
    })
  } catch (cause) {
    throw new MarketDataError(
      `Unable to reach the market-data provider: ${String(cause)}`
    )
  }

  if (!response.ok) {
    throw new MarketDataError(
      `Market-data provider returned HTTP ${response.status}`
    )
  }

  const payload = (await response.json()) as YahooQuoteResponse
  const results = payload.quoteResponse?.result ?? []

  return results
    .filter((result) => typeof result.regularMarketPrice === "number")
    .map(toQuote)
}
