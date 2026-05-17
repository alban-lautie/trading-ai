import type { PricePoint, TechnicalIndicators } from "@/lib/market-data/types"

/**
 * Technical indicators derived from a symbol's daily price history. These are
 * pure computations over the close (and, for ATR, the high/low) series — no
 * provider call — and feed the AI recommendation with trend, momentum and
 * volatility context.
 */

const RSI_PERIOD = 14
const ATR_PERIOD = 14
const SUPPORT_WINDOW = 20

/** Simple moving average of the last `period` closes, or `null`. */
function sma(closes: number[], period: number): number | null {
  if (closes.length < period) return null
  const window = closes.slice(-period)
  return window.reduce((sum, value) => sum + value, 0) / period
}

/** Wilder-style RSI over the last `RSI_PERIOD` changes, or `null`. */
function rsi(closes: number[]): number | null {
  if (closes.length < RSI_PERIOD + 1) return null

  const changes = closes
    .slice(-(RSI_PERIOD + 1))
    .map((close, index, series) =>
      index === 0 ? 0 : close - series[index - 1]
    )
    .slice(1)

  let gains = 0
  let losses = 0
  for (const change of changes) {
    if (change >= 0) gains += change
    else losses -= change
  }

  const avgGain = gains / RSI_PERIOD
  const avgLoss = losses / RSI_PERIOD
  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return 100 - 100 / (1 + rs)
}

/** Average True Range over the last `ATR_PERIOD` sessions, or `null`. */
function atr(points: PricePoint[]): number | null {
  if (points.length < ATR_PERIOD + 1) return null

  const window = points.slice(-(ATR_PERIOD + 1))
  const trueRanges: number[] = []
  for (let i = 1; i < window.length; i += 1) {
    const { high, low } = window[i]
    const previousClose = window[i - 1].close
    if (typeof high !== "number" || typeof low !== "number") return null
    trueRanges.push(
      Math.max(
        high - low,
        Math.abs(high - previousClose),
        Math.abs(low - previousClose)
      )
    )
  }

  return trueRanges.reduce((sum, value) => sum + value, 0) / trueRanges.length
}

/** Computes the set of technical indicators for a price history. */
export function computeIndicators(points: PricePoint[]): TechnicalIndicators {
  const closes = points.map((point) => point.close)
  const recent = closes.slice(-SUPPORT_WINDOW)

  return {
    sma50: sma(closes, 50),
    sma200: sma(closes, 200),
    rsi14: rsi(closes),
    atr14: atr(points),
    recentLow: recent.length > 0 ? Math.min(...recent) : null,
    recentHigh: recent.length > 0 ? Math.max(...recent) : null,
  }
}
