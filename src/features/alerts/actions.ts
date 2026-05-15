"use server"

import { revalidatePath } from "next/cache"

import { requireUser } from "@/features/auth"
import { alertSchema } from "@/features/alerts/schema"
import type { ActionResult } from "@/features/positions/actions"

/** Creates a price/variation alert for the current user. */
export async function createAlert(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const parsed = alertSchema.safeParse({
    symbol: formData.get("symbol"),
    positionId: formData.get("positionId") ?? undefined,
    type: formData.get("type"),
    threshold: formData.get("threshold"),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const { user, supabase } = await requireUser()
  const values = parsed.data

  const { error } = await supabase.from("alerts").insert({
    user_id: user.id,
    symbol: values.symbol,
    position_id: values.positionId || null,
    type: values.type,
    threshold: values.threshold,
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
