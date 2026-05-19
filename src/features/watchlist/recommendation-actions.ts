"use server"

import { revalidatePath } from "next/cache"

import { requireUser } from "@/features/auth"
import { getQuotesWithFallback } from "@/features/quotes/queries"
import { runEntryRecommendation } from "@/features/watchlist/recommendations"

export interface RecommendationActionResult {
  error?: string
  success?: boolean
}

/**
 * Generates a fresh AI entry-point recommendation for one watched stock on
 * demand, and arms the matching entry-price alert.
 */
export async function generateEntryRecommendationNow(
  itemId: string
): Promise<RecommendationActionResult> {
  const { user, supabase } = await requireUser()

  const { data: item, error } = await supabase
    .from("watchlist")
    .select("*")
    .eq("id", itemId)
    .eq("user_id", user.id)
    .maybeSingle()

  if (error) {
    return { error: error.message }
  }
  if (!item) {
    return { error: "Action introuvable." }
  }

  const { quotes } = await getQuotesWithFallback([item.symbol])
  const quote = quotes.get(item.symbol.toUpperCase()) ?? null

  const result = await runEntryRecommendation(supabase, item, quote)
  if (!result) {
    return { error: "La génération de la recommandation a échoué." }
  }

  revalidatePath("/watchlist")
  return { success: true }
}
