import "server-only"

import { requireUser } from "@/features/auth"
import type { NotificationSettings } from "@/lib/types"

/**
 * Returns the current user's notification settings, or `null` when none have
 * been created yet (the user has never started linking Telegram).
 */
export async function getNotificationSettings(): Promise<NotificationSettings | null> {
  const { user, supabase } = await requireUser()

  const { data, error } = await supabase
    .from("notification_settings")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to load notification settings: ${error.message}`)
  }

  return data
}
