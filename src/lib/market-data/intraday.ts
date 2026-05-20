import "server-only"

import {
  MarketDataError,
  type IntradayHistory,
  type IntradayInterval,
  type IntradayPoint,
  type IntradayRange,
} from "@/lib/market-data/types"

/**
 * Yahoo Finance intraday history. Uses the same v8 chart endpoint as the
 * daily history but with a sub-day interval. The provider caps the depth of
 * the series by interval (1m goes back at most ~7 days, 5m up to ~60 days),
 * so the caller picks the (interval, range) couple that matches the question.
 */

const CHART_ENDPOINT = "https://query1.finance.yahoo.com/v8/finance/chart"

const REQUEST_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
  Accept: "application/json",
}

interface YahooIntradayResult {
  meta?: {
    currency?: string
    currentTradingPeriod?: {
      regular?: { start?: number; end?: number }
    }
  }
  timestamp?: number[]
  indicators?: {
    quote?: {
      open?: (number | null)[]
      close?: (number | null)[]
      high?: (number | null)[]
      low?: (number | null)[]
      volume?: (number | null)[]
    }[]
  }
}

/**
 * Fetches the intraday price history of a symbol. The (interval, range)
 * couple must respect the provider limits (1m → 7d max, 5m/15m → 60d max).
 */
export async function fetchYahooIntraday(
  symbol: string,
  range: IntradayRange,
  interval: IntradayInterval
): Promise<IntradayHistory> {
  const url = `${CHART_ENDPOINT}/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}&includePrePost=false`

  let response: Response
  try {
    response = await fetch(url, {
      headers: REQUEST_HEADERS,
      cache: "no-store",
    })
  } catch (cause) {
    throw new MarketDataError(
      `Unable to reach the market-data provider: ${String(cause)}`,
      symbol
    )
  }

  if (!response.ok) {
    throw new MarketDataError(
      `Market-data provider returned HTTP ${response.status}`,
      symbol
    )
  }

  const payload = (await response.json()) as {
    chart?: { result?: YahooIntradayResult[] }
  }
  const result = payload.chart?.result?.[0]
  if (!result) {
    throw new MarketDataError("No intraday history available", symbol)
  }

  const timestamps = result.timestamp ?? []
  const quote = result.indicators?.quote?.[0]
  const opens = quote?.open ?? []
  const closes = quote?.close ?? []
  const highs = quote?.high ?? []
  const lows = quote?.low ?? []
  const volumes = quote?.volume ?? []

  const points: IntradayPoint[] = []
  for (let i = 0; i < timestamps.length; i += 1) {
    const close = closes[i]
    if (typeof close !== "number") continue
    points.push({
      timestamp: new Date(timestamps[i] * 1000).toISOString(),
      close,
      open: typeof opens[i] === "number" ? opens[i] : null,
      high: typeof highs[i] === "number" ? highs[i] : null,
      low: typeof lows[i] === "number" ? lows[i] : null,
      volume: typeof volumes[i] === "number" ? volumes[i] : null,
    })
  }

  const meta = result.meta ?? {}
  const regular = meta.currentTradingPeriod?.regular
  return {
    interval,
    range,
    points,
    currency: meta.currency ?? "USD",
    sessionStart: regular?.start ? regular.start * 1000 : null,
    sessionEnd: regular?.end ? regular.end * 1000 : null,
  }
}
