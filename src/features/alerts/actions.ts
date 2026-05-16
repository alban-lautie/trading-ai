"use server"

import { revalidatePath } from "next/cache"

import { requireUser } from "@/features/auth"
import { alertSchema } from "@/features/alerts/schema"
import type { ActionResult } from "@/features/positions/actions"

/**
 * Creates an alert for the current user. The alert is tied to one of the
 * user's positions; its symbol is resolved from that position.
 */
export async function createAlert(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const parsed = alertSchema.safeParse({
    positionId: formData.get("positionId"),
    type: formData.get("type"),
    threshold: formData.get("threshold"),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const { user, supabase } = await requireUser()
  const { positionId, type, threshold } = parsed.data

  const { data: position, error: positionError } = await supabase
    .from("positions")
    .select("symbol")
    .eq("id", positionId)
    .maybeSingle()

  if (positionError) {
    return { error: positionError.message }
  }
  if (!position) {
    return { error: "Action introuvable." }
  }

  const { error } = await supabase.from("alerts").insert({
    user_id: user.id,
    position_id: positionId,
    symbol: position.symbol,
    type,
    threshold,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/alerts")
  return { success: true }
}

/** Enables or disables an existing alert. */
export async function toggleAlert(
  alertId: string,
  isActive: boolean
): Promise<ActionResult> {
  const { supabase } = await requireUser()

  const { error } = await supabase
    .from("alerts")
    .update({ is_active: isActive, triggered_at: null })
    .eq("id", alertId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/alerts")
  return { success: true }
}

/** Deletes an alert owned by the current user. */
export async function deleteAlert(alertId: string): Promise<ActionResult> {
  const { supabase } = await requireUser()

  const { error } = await supabase.from("alerts").delete().eq("id", alertId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/alerts")
  return { success: true }
}
