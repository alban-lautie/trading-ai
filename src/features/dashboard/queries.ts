import "server-only"

import { requireUser } from "@/features/auth"
import { getPriceHistory } from "@/lib/market-data"

export interface DailySummary {
  content: string
  createdAt: string
}

/** Returns today's cached AI summary for the current user, or `null`. */
export async function getDailySummary(): Promise<DailySummary | null> {
  const { user, supabase } = await requireUser()
  const today = new Date().toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from("daily_summaries")
    .select("content, created_at")
    .eq("user_id", user.id)
    .eq("summary_date", today)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to load daily summary: ${error.message}`)
  }

  return data ? { content: data.content, createdAt: data.created_at } : null
}

export interface ValuePoint {
  date: string
  value: number
}

/**
 * Reconstructs the portfolio value curve over the last 6 months from each
 * position's price history. A position contributes only from its purchase
 * date; gaps in a series carry forward the last known close.
 */
export async function getPortfolioValueHistory(): Promise<ValuePoint[]> {
  const { user, supabase } = await requireUser()

  const { data, error } = await supabase
    .from("positions")
    .select("symbol, quantity, opened_at")
    .eq("user_id", user.id)

  if (error) {
    throw new Error(`Failed to load positions: ${error.message}`)
  }

  const positions = data ?? []
  if (positions.length === 0) return []

  const histories = await Promise.all(
    positions.map((position) =>
      getPriceHistory(position.symbol, "6mo").catch(() => null)
    )
  )

  // Union of every date that appears in any series, chronologically.
  const dateSet = new Set<string>()
  for (const history of histories) {
    for (const point of history?.points ?? []) {
      dateSet.add(point.date)
    }
  }
  const dates = [...dateSet].sort()

  const closeByDate = histories.map(
    (history) =>
      new Map((history?.points ?? []).map((point) => [point.date, point.close]))
  )
  const lastClose: (number | null)[] = positions.map(() => null)

  const result: ValuePoint[] = []
  for (const date of dates) {
    let value = 0
    let contributing = 0

    positions.forEach((position, index) => {
      const close = closeByDate[index].get(date)
      if (close !== undefined) {
        lastClose[index] = close
      }
      if (position.opened_at <= date && lastClose[index] !== null) {
        value += Number(position.quantity) * (lastClose[index] as number)
        contributing += 1
      }
    })

    if (contributing > 0) {
      result.push({ date, value })
    }
  }

  return result
}
