import "server-only"

import type { NewsItem } from "@/lib/market-data/types"

/**
 * Yahoo Finance news for a symbol, via the search endpoint.
 * News is best-effort: any failure yields an empty list rather than an error.
 */

const SEARCH_ENDPOINT = "https://query1.finance.yahoo.com/v1/finance/search"

const REQUEST_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
  Accept: "application/json",
}

interface YahooNewsResult {
  uuid?: string
  title?: string
  link?: string
  publisher?: string
  providerPublishTime?: number
}

/** Fetches recent news articles about a symbol (best-effort). */
export async function fetchYahooNews(symbol: string): Promise<NewsItem[]> {
  const url = `${SEARCH_ENDPOINT}?q=${encodeURIComponent(symbol)}&newsCount=8&quotesCount=0`

  try {
    const response = await fetch(url, {
      headers: REQUEST_HEADERS,
      cache: "no-store",
    })
    if (!response.ok) return []

    const payload = (await response.json()) as { news?: YahooNewsResult[] }
    return (payload.news ?? [])
      .filter((item) => item.title && item.link)
      .map((item) => ({
        id: item.uuid ?? (item.link as string),
        title: item.title as string,
        url: item.link as string,
        publisher: item.publisher ?? "",
        publishedAt: (item.providerPublishTime ?? 0) * 1000,
      }))
      .slice(0, 8)
  } catch {
    return []
  }
}
