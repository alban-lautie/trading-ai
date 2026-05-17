import "server-only"

import type { StockFundamentals } from "@/lib/market-data/types"
import { getYahooSession, YAHOO_USER_AGENT } from "@/lib/market-data/yahoo-crumb"

/**
 * Yahoo Finance fundamentals and analyst data.
 *
 * Best-effort: any failure (handshake, HTTP error, schema change) yields an
 * all-`null` result instead of throwing, so the recommendation still runs on
 * the data that did resolve.
 */

const QUOTE_SUMMARY =
  "https://query1.finance.yahoo.com/v10/finance/quoteSummary"
const MODULES = "financialData,summaryDetail,defaultKeyStatistics"

const EMPTY: StockFundamentals = {
  targetMeanPrice: null,
  targetHighPrice: null,
  targetLowPrice: null,
  recommendationKey: null,
  numberOfAnalysts: null,
  trailingPE: null,
  forwardPE: null,
  trailingEps: null,
  marketCap: null,
  dividendYield: null,
  beta: null,
}

type Module = Record<string, unknown>

/** Extracts a finite number from a Yahoo `{ raw, fmt }` field or a bare number. */
function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (value && typeof value === "object" && "raw" in value) {
    const raw = (value as { raw: unknown }).raw
    return typeof raw === "number" && Number.isFinite(raw) ? raw : null
  }
  return null
}

async function requestSummary(
  symbol: string,
  retried: boolean
): Promise<StockFundamentals> {
  const session = await getYahooSession(retried)
  if (!session) return EMPTY

  const url = `${QUOTE_SUMMARY}/${encodeURIComponent(symbol)}?modules=${MODULES}&crumb=${encodeURIComponent(session.crumb)}`
  const response = await fetch(url, {
    headers: {
      "User-Agent": YAHOO_USER_AGENT,
      Cookie: session.cookie,
      Accept: "application/json",
    },
    cache: "no-store",
  })

  // A stale crumb returns 401/403 — refresh the session once and retry.
  if ((response.status === 401 || response.status === 403) && !retried) {
    return requestSummary(symbol, true)
  }
  if (!response.ok) return EMPTY

  const payload = (await response.json()) as {
    quoteSummary?: { result?: Record<string, Module | undefined>[] }
  }
  const result = payload.quoteSummary?.result?.[0]
  if (!result) return EMPTY

  const financial = result.financialData ?? {}
  const summary = result.summaryDetail ?? {}
  const stats = result.defaultKeyStatistics ?? {}
  const recommendationKey = financial.recommendationKey

  return {
    targetMeanPrice: num(financial.targetMeanPrice),
    targetHighPrice: num(financial.targetHighPrice),
    targetLowPrice: num(financial.targetLowPrice),
    recommendationKey:
      typeof recommendationKey === "string" && recommendationKey !== "none"
        ? recommendationKey
        : null,
    numberOfAnalysts: num(financial.numberOfAnalystOpinions),
    trailingPE: num(summary.trailingPE),
    forwardPE: num(summary.forwardPE) ?? num(stats.forwardPE),
    trailingEps: num(stats.trailingEps),
    marketCap: num(summary.marketCap),
    dividendYield: num(summary.dividendYield),
    beta: num(summary.beta) ?? num(stats.beta),
  }
}

/** Fetches fundamentals and analyst data for a symbol. Never throws. */
export async function fetchYahooFundamentals(
  symbol: string
): Promise<StockFundamentals> {
  try {
    return await requestSummary(symbol, false)
  } catch {
    return EMPTY
  }
}
