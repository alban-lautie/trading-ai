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
