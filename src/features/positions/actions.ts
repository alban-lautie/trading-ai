"use server"

import { revalidatePath } from "next/cache"

import { requireUser } from "@/features/auth"
import { positionSchema } from "@/features/positions/schema"

export interface ActionResult {
  error?: string
  success?: boolean
}

function parseForm(formData: FormData) {
  return positionSchema.safeParse({
    symbol: formData.get("symbol"),
    name: formData.get("name") ?? undefined,
    quantity: formData.get("quantity"),
    averagePrice: formData.get("averagePrice"),
    currency: formData.get("currency") || "USD",
    openedAt: formData.get("openedAt") ?? undefined,
    objective: formData.get("objective") ?? undefined,
    horizon: formData.get("horizon") ?? undefined,
    riskTolerance: formData.get("riskTolerance") ?? undefined,
    tradingStyle: formData.get("tradingStyle") ?? undefined,
    targetGainPercent: formData.get("targetGainPercent") ?? undefined,
    notes: formData.get("notes") ?? undefined,
  })
}

function revalidatePortfolio() {
  revalidatePath("/dashboard")
  revalidatePath("/positions")
}

/** Creates a new position for the current user. */
export async function createPosition(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const parsed = parseForm(formData)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const { user, supabase } = await requireUser()
  const values = parsed.data

  const { error } = await supabase.from("positions").insert({
    user_id: user.id,
    symbol: values.symbol,
    name: values.name || null,
    quantity: values.quantity,
    average_price: values.averagePrice,
    currency: values.currency,
    opened_at: values.openedAt || undefined,
    objective: values.objective,
    horizon: values.horizon,
    risk_tolerance: values.riskTolerance,
    trading_style: values.tradingStyle,
    target_gain_percent: values.targetGainPercent ?? null,
    notes: values.notes || null,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePortfolio()
  return { success: true }
}

/** Updates an existing position owned by the current user. */
export async function updatePosition(
  positionId: string,
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const parsed = parseForm(formData)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const { supabase } = await requireUser()
  const values = parsed.data

  const { error } = await supabase
    .from("positions")
    .update({
      symbol: values.symbol,
      name: values.name || null,
      quantity: values.quantity,
      average_price: values.averagePrice,
      currency: values.currency,
      opened_at: values.openedAt || undefined,
      objective: values.objective,
      horizon: values.horizon,
      risk_tolerance: values.riskTolerance,
      trading_style: values.tradingStyle,
      target_gain_percent: values.targetGainPercent ?? null,
      notes: values.notes || null,
    })
    .eq("id", positionId)

  if (error) {
    return { error: error.message }
  }

  revalidatePortfolio()
  return { success: true }
}

/**
 * Pauses or resumes monitoring of a position: when disabled, alert evaluation,
 * AI sell recommendations and inclusion in the daily AI summary are all
 * skipped. The position itself stays visible and counts in the portfolio
 * totals.
 */
export async function setPositionMonitoring(
  positionId: string,
  enabled: boolean
): Promise<ActionResult> {
  const { supabase } = await requireUser()

  const { error } = await supabase
    .from("positions")
    .update({ monitoring_enabled: enabled })
    .eq("id", positionId)

  if (error) {
    return { error: error.message }
  }

  revalidatePortfolio()
  revalidatePath(`/positions/${positionId}`)
  return { success: true }
}

/** Deletes a position owned by the current user. */
export async function deletePosition(positionId: string): Promise<ActionResult> {
  const { supabase } = await requireUser()

  const { error } = await supabase
    .from("positions")
    .delete()
    .eq("id", positionId)

  if (error) {
    return { error: error.message }
  }

  revalidatePortfolio()
  return { success: true }
}
