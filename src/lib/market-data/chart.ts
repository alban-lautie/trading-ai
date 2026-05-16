import "server-only"

import {
  MarketDataError,
  type ChartRange,
  type PriceHistory,
  type PricePoint,
} from "@/lib/market-data/types"

/**
 * Yahoo Finance price history.
 *
 * Uses the crumb-free v8 chart endpoint, which returns both the daily close
 * series and the meta block with the 52-week and intraday reference levels.
 */

const CHART_ENDPOINT = "https://query1.finance.yahoo.com/v8/finance/chart"

const REQUEST_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
  Accept: "application/json",
}

interface YahooChartResult {
  meta?: {
    currency?: string
    fiftyTwoWeekHigh?: number
    fiftyTwoWeekLow?: number
    regularMarketDayHigh?: number
    regularMarketDayLow?: number
  }
  timestamp?: number[]
  indicators?: { quote?: { close?: (number | null)[] }[] }
}

/** Fetches the daily price history of a symbol for the given range. */
export async function fetchYahooChart(
  symbol: string,
  range: ChartRange
): Promise<PriceHistory> {
  const url = `${CHART_ENDPOINT}/${encodeURIComponent(symbol)}?interval=1d&range=${range}`

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
    chart?: { result?: YahooChartResult[] }
  }
  const result = payload.chart?.result?.[0]
  if (!result) {
    throw new MarketDataError("No price history available", symbol)
  }

  const timestamps = result.timestamp ?? []
  const closes = result.indicators?.quote?.[0]?.close ?? []
  const points: PricePoint[] = []
  for (let i = 0; i < timestamps.length; i += 1) {
    const close = closes[i]
    if (typeof close !== "number") continue
    points.push({
      date: new Date(timestamps[i] * 1000).toISOString().slice(0, 10),
      close,
    })
  }

  const meta = result.meta ?? {}
  return {
    range,
    points,
    currency: meta.currency ?? "USD",
    fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ?? null,
    fiftyTwoWeekLow: meta.fiftyTwoWeekLow ?? null,
    dayHigh: meta.regularMarketDayHigh ?? null,
    dayLow: meta.regularMarketDayLow ?? null,
  }
}
