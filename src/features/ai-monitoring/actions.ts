"use server"

import { revalidatePath } from "next/cache"

import { requireUser } from "@/features/auth"
import { aiConfigSchema } from "@/features/ai-monitoring/schema"
import { getPortfolio } from "@/features/positions/queries"
import type { ActionResult } from "@/features/positions/actions"
import { generatePortfolioAnalysis } from "@/lib/ai/claude"
import { sendTelegramMessage } from "@/lib/telegram/client"

/** Persists the user's AI monitoring configuration. */
export async function updateAiConfig(
  values: unknown
): Promise<ActionResult> {
  const parsed = aiConfigSchema.safeParse(values)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const { user, supabase } = await requireUser()
  const config = parsed.data

  const { error } = await supabase.from("ai_monitoring_config").upsert(
    {
      user_id: user.id,
      is_enabled: config.isEnabled,
      frequency: config.frequency,
      tone: config.tone,
      focus_areas: config.focusAreas,
      delivery: config.delivery,
    },
    { onConflict: "user_id" }
  )

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/ai")
  return { success: true }
}

/**
 * Runs an on-demand AI analysis of the portfolio, stores the report, and
 * pushes it to the user's Telegram when the delivery setting includes
 * Telegram. Telegram delivery is best-effort: a missing chat link or a
 * delivery failure does not roll back the saved report.
 */
export async function generateReportNow(): Promise<ActionResult> {
  const { user, supabase } = await requireUser()

  const { data: configRow } = await supabase
    .from("ai_monitoring_config")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle()

  const config = configRow ?? {
    user_id: user.id,
    is_enabled: false,
    frequency: "weekly" as const,
    tone: "neutral",
    focus_areas: ["risk", "diversification", "opportunities"],
    delivery: "telegram" as const,
    id: "",
    last_run_at: null,
    created_at: "",
    updated_at: "",
  }

  const { rows, summary } = await getPortfolio()

  let analysis: string
  try {
    analysis = await generatePortfolioAnalysis({ config, summary, positions: rows })
  } catch (cause) {
    return {
      error:
        cause instanceof Error
          ? `AI analysis failed: ${cause.message}`
          : "AI analysis failed.",
    }
  }

  const { error: insertError } = await supabase
    .from("ai_reports")
    .insert({ user_id: user.id, content: analysis })

  if (insertError) {
    return { error: insertError.message }
  }

  await supabase
    .from("ai_monitoring_config")
    .update({ last_run_at: new Date().toISOString() })
    .eq("user_id", user.id)

  if (config.delivery !== "in_app") {
    const { data: notif } = await supabase
      .from("notification_settings")
      .select("telegram_chat_id")
      .eq("user_id", user.id)
      .maybeSingle()
    const chatId = notif?.telegram_chat_id
    if (chatId) {
      try {
        await sendTelegramMessage(
          chatId,
          `🧠 *Trading AI* — Analyse de portefeuille\n\n${analysis}`
        )
      } catch {
        // The report is saved; Telegram delivery is best-effort.
      }
    }
  }

  revalidatePath("/ai")
  return { success: true }
}
