"use server"

import { revalidatePath } from "next/cache"

import { requireUser } from "@/features/auth"
import { alertSchema } from "@/features/alerts/schema"
import type { ActionResult } from "@/features/positions/actions"
import type { AlertType } from "@/lib/types"

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

// take_profit, the numbered sell tiers (take_profit_1…), stop_loss, reinforce.
const PROPOSAL_KIND_PATTERN = /^(take_profit(_[1-9])?|stop_loss|reinforce)$/
const PROPOSAL_ALERT_TYPES: AlertType[] = ["price_above", "price_below"]

export interface SetProposalAlertInput {
  positionId: string
  /** Proposal this alert is armed from (take_profit_1, stop_loss, …). */
  kind: string
  alertType: string
  threshold: number
  /** Share of the position to sell, for take-profit tiers. */
  percent?: number | null
  enabled: boolean
}

/**
 * Arms or disarms the alert attached to a position-action proposal. Enabling
 * creates a fresh alert tagged with the proposal kind; disabling removes it.
 */
export async function setProposalAlert(
  input: SetProposalAlertInput
): Promise<ActionResult> {
  if (!PROPOSAL_KIND_PATTERN.test(input.kind)) {
    return { error: "Type de proposition invalide." }
  }
  if (!PROPOSAL_ALERT_TYPES.includes(input.alertType as AlertType)) {
    return { error: "Condition d'alerte invalide." }
  }
  if (!Number.isFinite(input.threshold) || input.threshold <= 0) {
    return { error: "Seuil invalide." }
  }

  const { user, supabase } = await requireUser()

  const { data: position, error: positionError } = await supabase
    .from("positions")
    .select("symbol")
    .eq("id", input.positionId)
    .eq("user_id", user.id)
    .maybeSingle()

  if (positionError) {
    return { error: positionError.message }
  }
  if (!position) {
    return { error: "Action introuvable." }
  }

  // Clear any alert previously armed from this proposal.
  const { error: deleteError } = await supabase
    .from("alerts")
    .delete()
    .eq("position_id", input.positionId)
    .eq("proposal_kind", input.kind)

  if (deleteError) {
    return { error: deleteError.message }
  }

  if (input.enabled) {
    const { error } = await supabase.from("alerts").insert({
      user_id: user.id,
      position_id: input.positionId,
      symbol: position.symbol,
      type: input.alertType as AlertType,
      threshold: Math.round(input.threshold * 100) / 100,
      proposal_kind: input.kind,
      tranche_percent:
        input.percent == null
          ? null
          : Math.round(input.percent * 100) / 100,
      is_active: true,
    })

    if (error) {
      return { error: error.message }
    }
  }

  revalidatePath(`/positions/${input.positionId}`)
  revalidatePath("/alerts")
  return { success: true }
}
