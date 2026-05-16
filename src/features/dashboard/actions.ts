"use server"

import { revalidatePath } from "next/cache"

import { requireUser } from "@/features/auth"
import { getPortfolio } from "@/features/positions/queries"
import { buildPositionProposals } from "@/features/positions/proposals"
import { composeDailySummary } from "@/lib/ai/claude"

export interface DailySummaryResult {
  error?: string
  content?: string
}

/**
 * Generates the daily AI portfolio summary and caches it for the day.
 * Re-running on the same day overwrites the cached summary.
 */
export async function generateDailySummary(): Promise<DailySummaryResult> {
  const { user, supabase } = await requireUser()

  const { rows, summary } = await getPortfolio()
  if (rows.length === 0) {
    return { error: "Ajoutez des positions pour générer un résumé." }
  }

  const positions = rows.map((row) => {
    const proposals = buildPositionProposals(row)
    const takeProfit =
      proposals.find((p) => p.kind === "take_profit")?.targetPrice ?? 0
    const stopLoss =
      proposals.find((p) => p.kind === "stop_loss")?.targetPrice ?? 0
    const weightPercent =
      summary.marketValue > 0 && row.marketValue !== null
        ? (row.marketValue / summary.marketValue) * 100
        : 0

    return {
      symbol: row.position.symbol,
      name: row.position.name,
      weightPercent,
      pnlPercent: row.unrealizedPnlPercent,
      dayChangePercent: row.quote?.changePercent ?? null,
      currentPrice: row.quote?.price ?? null,
      takeProfit,
      stopLoss,
      currency: row.position.currency,
    }
  })

  let content: string
  try {
    content = await composeDailySummary({
      totalValue: summary.marketValue,
      totalPnlPercent: summary.unrealizedPnlPercent,
      positions,
    })
  } catch (cause) {
    return {
      error:
        cause instanceof Error
          ? `Génération du résumé échouée : ${cause.message}`
          : "Génération du résumé échouée.",
    }
  }

  const today = new Date().toISOString().slice(0, 10)
  const { error } = await supabase.from("daily_summaries").upsert(
    { user_id: user.id, summary_date: today, content },
    { onConflict: "user_id,summary_date" }
  )

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/dashboard")
  return { content }
}
