import "server-only"

import type { ChatToolRunner } from "@/lib/ai/claude"
import {
  computeIndicators,
  getIntradayHistory,
  getPriceHistory,
  getQuote,
  getStockFundamentals,
  getStockNews,
  type ChartRange,
  type IntradayHistory,
  type IntradayInterval,
  type IntradayRange,
  type PriceHistory,
} from "@/lib/market-data"
import type { Position } from "@/lib/types"

/**
 * Builds the tool executor that Claude calls during a chat turn. The runner
 * keeps a reference to the position bound to the conversation so the
 * `get_position_state` tool can answer without re-querying the DB.
 */

const VALID_INTRADAY_INTERVALS: IntradayInterval[] = [
  "1m",
  "5m",
  "15m",
  "30m",
  "60m",
]
const VALID_INTRADAY_RANGES: IntradayRange[] = ["1d", "5d", "7d", "1mo"]
const VALID_DAILY_RANGES: ChartRange[] = ["1mo", "6mo", "1y"]

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null
}

function num(value: number | null | undefined, digits = 2): string {
  return value === null || value === undefined ? "n/a" : value.toFixed(digits)
}

function pct(value: number | null | undefined, digits = 2): string {
  return value === null || value === undefined ? "n/a" : `${value.toFixed(digits)} %`
}

function formatIntradayCsv(history: IntradayHistory): string {
  const header = "timestamp,open,high,low,close,volume"
  const rows = history.points
    .map((point) => {
      const o = point.open === null ? "" : point.open.toFixed(4)
      const h = point.high === null ? "" : point.high.toFixed(4)
      const l = point.low === null ? "" : point.low.toFixed(4)
      const v = point.volume === null ? "" : point.volume.toFixed(0)
      return `${point.timestamp},${o},${h},${l},${point.close.toFixed(4)},${v}`
    })
    .join("\n")
  return `interval=${history.interval} range=${history.range} currency=${history.currency} points=${history.points.length}\n${header}\n${rows}`
}

function formatDailyCsv(history: PriceHistory): string {
  const header = "date,close,high,low"
  const rows = history.points
    .map((point) => {
      const h = point.high === null || point.high === undefined ? "" : point.high.toFixed(4)
      const l = point.low === null || point.low === undefined ? "" : point.low.toFixed(4)
      return `${point.date},${point.close.toFixed(4)},${h},${l}`
    })
    .join("\n")
  return `range=${history.range} currency=${history.currency} points=${history.points.length} fiftyTwoWeekHigh=${num(history.fiftyTwoWeekHigh)} fiftyTwoWeekLow=${num(history.fiftyTwoWeekLow)}\n${header}\n${rows}`
}

interface ToolContext {
  /** Position bound to the conversation; used as the default symbol. */
  position: Position
}

/** Returns the tool executor passed to `chatAboutPosition`. */
export function buildChatToolRunner(context: ToolContext): ChatToolRunner {
  const defaultSymbol = context.position.symbol

  function resolveSymbol(input: Record<string, unknown>): string {
    return (asString(input.symbol) ?? defaultSymbol).toUpperCase()
  }

  return async function runTool(name, input) {
    switch (name) {
      case "get_position_state": {
        const position = context.position
        const quote = await getQuote(position.symbol)
        const averagePrice = Number(position.average_price)
        const currentPrice = quote?.price ?? null
        const pnlPercent =
          currentPrice !== null && averagePrice > 0
            ? ((currentPrice - averagePrice) / averagePrice) * 100
            : null
        const marketValue =
          currentPrice !== null
            ? currentPrice * Number(position.quantity)
            : null
        return [
          `symbol=${position.symbol}`,
          `name=${position.name ?? "n/a"}`,
          `quantity=${num(Number(position.quantity), 6)}`,
          `average_price=${num(averagePrice)} ${position.currency}`,
          `current_price=${num(currentPrice)} ${position.currency}`,
          `unrealized_pnl_percent=${pct(pnlPercent)}`,
          `market_value=${num(marketValue)} ${position.currency}`,
          `day_change_percent=${pct(quote?.changePercent ?? null)}`,
          `opened_at=${position.opened_at}`,
          `monitoring_enabled=${position.monitoring_enabled}`,
        ].join("\n")
      }

      case "get_intraday_chart": {
        const symbol = resolveSymbol(input)
        const interval = asString(input.interval) as IntradayInterval | null
        const range = asString(input.range) as IntradayRange | null
        if (!interval || !VALID_INTRADAY_INTERVALS.includes(interval)) {
          throw new Error(
            `Invalid interval. Use one of: ${VALID_INTRADAY_INTERVALS.join(", ")}`
          )
        }
        if (!range || !VALID_INTRADAY_RANGES.includes(range)) {
          throw new Error(
            `Invalid range. Use one of: ${VALID_INTRADAY_RANGES.join(", ")}`
          )
        }
        if (interval === "1m" && range === "1mo") {
          throw new Error(
            "interval=1m is only available for range 1d/5d/7d. Use a coarser interval for 1mo."
          )
        }
        const history = await getIntradayHistory(symbol, range, interval)
        return formatIntradayCsv(history)
      }

      case "get_daily_chart": {
        const symbol = resolveSymbol(input)
        const range = asString(input.range) as ChartRange | null
        if (!range || !VALID_DAILY_RANGES.includes(range)) {
          throw new Error(
            `Invalid range. Use one of: ${VALID_DAILY_RANGES.join(", ")}`
          )
        }
        const history = await getPriceHistory(symbol, range)
        return formatDailyCsv(history)
      }

      case "get_indicators": {
        const symbol = resolveSymbol(input)
        const history = await getPriceHistory(symbol, "1y")
        const indicators = computeIndicators(history.points)
        return [
          `symbol=${symbol}`,
          `sma50=${num(indicators.sma50)}`,
          `sma200=${num(indicators.sma200)}`,
          `rsi14=${indicators.rsi14 === null ? "n/a" : indicators.rsi14.toFixed(0)}`,
          `atr14=${num(indicators.atr14)}`,
          `recent_low_20d=${num(indicators.recentLow)}`,
          `recent_high_20d=${num(indicators.recentHigh)}`,
        ].join("\n")
      }

      case "get_news": {
        const symbol = resolveSymbol(input)
        const news = await getStockNews(symbol)
        if (news.length === 0) {
          return `symbol=${symbol}\n(no recent news)`
        }
        const now = Date.now()
        return [
          `symbol=${symbol}`,
          ...news.map((item) => {
            const ageDays = Math.floor((now - item.publishedAt) / 86_400_000)
            const ageLabel = ageDays <= 0 ? "today" : `${ageDays}d ago`
            return `- [${ageLabel}, ${item.publisher}] ${item.title}`
          }),
        ].join("\n")
      }

      case "get_fundamentals": {
        const symbol = resolveSymbol(input)
        const f = await getStockFundamentals(symbol)
        return [
          `symbol=${symbol}`,
          `trailing_pe=${num(f.trailingPE)}`,
          `forward_pe=${num(f.forwardPE)}`,
          `trailing_eps=${num(f.trailingEps)}`,
          `market_cap=${num(f.marketCap, 0)}`,
          `dividend_yield=${
            f.dividendYield === null ? "n/a" : `${(f.dividendYield * 100).toFixed(2)} %`
          }`,
          `beta=${num(f.beta)}`,
          `analyst_target_mean=${num(f.targetMeanPrice)}`,
          `analyst_target_low=${num(f.targetLowPrice)}`,
          `analyst_target_high=${num(f.targetHighPrice)}`,
          `analyst_consensus=${f.recommendationKey ?? "n/a"}`,
          `analyst_count=${f.numberOfAnalysts ?? "n/a"}`,
        ].join("\n")
      }

      default:
        throw new Error(`Unknown tool: ${name}`)
    }
  }
}
