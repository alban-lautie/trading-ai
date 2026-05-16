import "server-only"

import { requireUser } from "@/features/auth"
import { getQuotesWithFallback } from "@/features/quotes/queries"
import {
  computePositionMetrics,
  summarizePortfolio,
  type PortfolioSummary,
  type PositionWithMetrics,
} from "@/lib/portfolio"
import type { Alert, Position } from "@/lib/types"

export interface PortfolioData {
  rows: PositionWithMetrics[]
  summary: PortfolioSummary
  /** Set when live quotes could not be retrieved at all. */
  quotesError: string | null
}

/** Fetches the current user's positions enriched with live quotes. */
export async function getPortfolio(): Promise<PortfolioData> {
  const { user, supabase } = await requireUser()

  const { data, error } = await supabase
    .from("positions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(`Failed to load positions: ${error.message}`)
  }

  const positions: Position[] = data ?? []
  const { quotes, error: quotesError } = await getQuotesWithFallback(
    positions.map((position) => position.symbol)
  )

  const rows = positions.map((position) =>
    computePositionMetrics(
      position,
      quotes.get(position.symbol.toUpperCase()) ?? null
    )
  )

  return {
    rows,
    summary: summarizePortfolio(rows),
    quotesError,
  }
}

/** Returns the current user's positions without live quotes, ordered by symbol. */
export async function listPositions(): Promise<Position[]> {
  const { user, supabase } = await requireUser()

  const { data, error } = await supabase
    .from("positions")
    .select("*")
    .eq("user_id", user.id)
    .order("symbol", { ascending: true })

  if (error) {
    throw new Error(`Failed to load positions: ${error.message}`)
  }

  return data ?? []
}

export interface PositionDetail {
  metrics: PositionWithMetrics
  alerts: Alert[]
}

/**
 * Fetches a single position owned by the current user, enriched with its live
 * quote and the alerts attached to it. Returns `null` when the position does
 * not exist or does not belong to the user.
 */
export async function getPositionDetail(
  id: string
): Promise<PositionDetail | null> {
  const { user, supabase } = await requireUser()

  const { data: position, error } = await supabase
    .from("positions")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to load position: ${error.message}`)
  }
  if (!position) {
    return null
  }

  const { quotes } = await getQuotesWithFallback([position.symbol])
  const metrics = computePositionMetrics(
    position,
    quotes.get(position.symbol.toUpperCase()) ?? null
  )

  const { data: alerts, error: alertsError } = await supabase
    .from("alerts")
    .select("*")
    .eq("position_id", id)
    .order("created_at", { ascending: false })

  if (alertsError) {
    throw new Error(`Failed to load alerts: ${alertsError.message}`)
  }

  return { metrics, alerts: alerts ?? [] }
}
