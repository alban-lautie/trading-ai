import "server-only"

import { MarketDataError, type Quote } from "@/lib/market-data/types"

/**
 * Yahoo Finance quote provider.
 *
 * Yahoo Finance has no official public API: this module is the single place
 * that knows about its endpoints. Keeping it isolated lets us swap providers
 * without touching the rest of the app.
 *
 * The `v7/finance/quote` endpoint now requires a crumb/cookie handshake and
 * returns HTTP 401 without it. We use the `v8/finance/chart` endpoint instead,
 * which exposes the same figures (in `meta`) and needs no authentication.
 */

const CHART_ENDPOINT = "https://query1.finance.yahoo.com/v8/finance/chart"

const REQUEST_HEADERS = {
  // Yahoo rejects requests without a browser-like User-Agent.
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
  Accept: "application/json",
}

interface YahooChartMeta {
  symbol?: string
  currency?: string
  longName?: string
  shortName?: string
  regularMarketPrice?: number
  previousClose?: number
  chartPreviousClose?: number
  regularMarketTime?: number
}

interface YahooChartResponse {
  chart?: {
    result?: { meta?: YahooChartMeta }[]
    error?: unknown
  }
}

function toQuote(meta: YahooChartMeta): Quote {
  const price = meta.regularMarketPrice ?? 0
  const previousClose =
    meta.chartPreviousClose ?? meta.previousClose ?? price
  const change = price - previousClose
  const changePercent = previousClose ? (change / previousClose) * 100 : 0

  return {
    symbol: meta.symbol ?? "",
    name: meta.longName ?? meta.shortName ?? null,
    price,
    change,
    changePercent,
    currency: meta.currency ?? "USD",
    timestamp: (meta.regularMarketTime ?? Date.now() / 1000) * 1000,
  }
}

/** Fetches a single quote. Returns `null` when the symbol cannot be resolved. */
async function fetchOne(symbol: string): Promise<Quote | null> {
  const url = `${CHART_ENDPOINT}/${encodeURIComponent(symbol)}?interval=1d&range=1d`

  const response = await fetch(url, {
    headers: REQUEST_HEADERS,
    cache: "no-store",
  })

  if (!response.ok) {
    return null
  }

  const payload = (await response.json()) as YahooChartResponse
  const meta = payload.chart?.result?.[0]?.meta

  if (!meta || typeof meta.regularMarketPrice !== "number") {
    return null
  }

  return toQuote({ ...meta, symbol: meta.symbol ?? symbol })
}

/**
 * Fetches live quotes for the given symbols from Yahoo Finance.
 * Symbols that cannot be resolved are omitted. If no quote at all could be
 * retrieved while symbols were requested, a {@link MarketDataError} is thrown
 * so the UI can surface the outage.
 */
export async function fetchYahooQuotes(symbols: string[]): Promise<Quote[]> {
  if (symbols.length === 0) return []

  const settled = await Promise.allSettled(symbols.map(fetchOne))

  const quotes: Quote[] = []
  let failures = 0

  for (const result of settled) {
    if (result.status === "fulfilled" && result.value) {
      quotes.push(result.value)
    } else {
      failures += 1
    }
  }

  if (quotes.length === 0 && failures > 0) {
    throw new MarketDataError(
      "Unable to retrieve quotes from the market-data provider."
    )
  }

  return quotes
}
