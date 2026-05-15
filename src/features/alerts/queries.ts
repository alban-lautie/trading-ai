import "server-only"

import { requireUser } from "@/features/auth"
import type { Alert } from "@/lib/types"

/** Returns every alert owned by the current user, newest first. */
export async function getAlerts(): Promise<Alert[]> {
  const { user, supabase } = await requireUser()

  const { data, error } = await supabase
    .from("alerts")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(`Failed to load alerts: ${error.message}`)
  }

  return data ?? []
}
