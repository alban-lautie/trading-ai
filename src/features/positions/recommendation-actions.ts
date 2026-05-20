"use server"

import { revalidatePath } from "next/cache"

import { requireUser } from "@/features/auth"
import { getPortfolio } from "@/features/positions/queries"
import { runPositionRecommendation } from "@/features/positions/recommendations"

export interface RecommendationActionResult {
  error?: string
  success?: boolean
}

/**
 * Generates a fresh AI recommendation for one of the user's positions on
 * demand. The portfolio is loaded so the recommendation can weigh the
 * position against the rest of the holdings.
 */
export async function generateRecommendationNow(
  positionId: string
): Promise<RecommendationActionResult> {
  const { supabase } = await requireUser()
  const portfolio = await getPortfolio()

  const metrics = portfolio.rows.find((row) => row.position.id === positionId)
  if (!metrics) {
    return { error: "Position introuvable." }
  }
  if (!metrics.position.monitoring_enabled) {
    return {
      error:
        "La surveillance est en pause sur cette position. Réactivez-la pour générer une recommandation.",
    }
  }

  const result = await runPositionRecommendation(supabase, metrics, {
    portfolioTotalValue: portfolio.summary.marketValue,
    portfolioPnlPercent: portfolio.summary.unrealizedPnlPercent,
    positionCount: portfolio.rows.length,
  })
  if (!result) {
    return { error: "La génération de la recommandation a échoué." }
  }

  revalidatePath(`/positions/${positionId}`)
  return { success: true }
}

/**
 * Generates a fresh AI recommendation for every position of the current
 * user's portfolio. Succeeds as long as at least one recommendation could
 * be generated.
 */
export async function generateAllRecommendations(): Promise<RecommendationActionResult> {
  const { supabase } = await requireUser()
  const portfolio = await getPortfolio()

  if (portfolio.rows.length === 0) {
    return { error: "Aucune position à analyser." }
  }

  const context = {
    portfolioTotalValue: portfolio.summary.marketValue,
    portfolioPnlPercent: portfolio.summary.unrealizedPnlPercent,
    positionCount: portfolio.rows.length,
  }

  let generated = 0
  for (const row of portfolio.rows) {
    if (!row.position.monitoring_enabled) continue
    const result = await runPositionRecommendation(supabase, row, context)
    if (result) {
      generated += 1
    }
  }

  if (generated === 0) {
    return { error: "La génération des recommandations a échoué." }
  }

  revalidatePath("/dashboard")
  revalidatePath("/positions")
  return { success: true }
}
