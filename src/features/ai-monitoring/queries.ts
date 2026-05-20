import "server-only"

import { requireUser } from "@/features/auth"
import type { AiMonitoringConfig, AiReport } from "@/lib/types"

/** Default AI monitoring configuration used before the user saves one. */
export function defaultAiConfig(userId: string): AiMonitoringConfig {
  const now = new Date().toISOString()
  return {
    id: "",
    user_id: userId,
    is_enabled: false,
    frequency: "weekly",
    tone: "neutral",
    focus_areas: ["risk", "diversification", "opportunities"],
    delivery: "telegram",
    last_run_at: null,
    created_at: now,
    updated_at: now,
  }
}

/** Returns the user's AI monitoring config, or a default when none is saved. */
export async function getAiConfig(): Promise<AiMonitoringConfig> {
  const { user, supabase } = await requireUser()

  const { data, error } = await supabase
    .from("ai_monitoring_config")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to load AI config: ${error.message}`)
  }

  return data ?? defaultAiConfig(user.id)
}

/** Returns the user's generated AI reports, newest first. */
export async function getAiReports(): Promise<AiReport[]> {
  const { user, supabase } = await requireUser()

  const { data, error } = await supabase
    .from("ai_reports")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20)

  if (error) {
    throw new Error(`Failed to load AI reports: ${error.message}`)
  }

  return data ?? []
}
