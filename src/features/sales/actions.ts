"use server"

import { revalidatePath } from "next/cache"

import { requireUser } from "@/features/auth"
import type { ActionResult } from "@/features/positions/actions"
import { recordSaleSchema } from "@/features/sales/schema"

/**
 * Records a partial or full sale on a position. The position's remaining
 * quantity is decremented by the same amount; when it reaches 0 the position
 * is filtered out of the active portfolio view by `getPortfolio()`.
 *
 * Concurrency note: this is a two-step write (insert sale, then update the
 * position). For a single-user app the race is negligible; we additionally
 * guard against over-selling by checking the live quantity before insert.
 */
export async function recordSale(values: unknown): Promise<ActionResult> {
  const parsed = recordSaleSchema.safeParse(values)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const { user, supabase } = await requireUser()
  const { positionId, quantity, sellPrice, soldAt, notes } = parsed.data

  const { data: position, error: positionError } = await supabase
    .from("positions")
    .select("id, quantity, average_price, currency")
    .eq("id", positionId)
    .eq("user_id", user.id)
    .maybeSingle()

  if (positionError) {
    return { error: positionError.message }
  }
  if (!position) {
    return { error: "Position introuvable." }
  }

  const remaining = Number(position.quantity)
  if (quantity > remaining + 1e-8) {
    return {
      error: `Quantité supérieure à la position détenue (${remaining}).`,
    }
  }

  const { error: insertError } = await supabase.from("position_sales").insert({
    user_id: user.id,
    position_id: positionId,
    quantity,
    sell_price: sellPrice,
    average_buy_price: Number(position.average_price),
    currency: position.currency,
    sold_at: soldAt,
    notes,
  })

  if (insertError) {
    return { error: insertError.message }
  }

  const newQuantity = Math.max(0, remaining - quantity)
  const { error: updateError } = await supabase
    .from("positions")
    .update({ quantity: newQuantity })
    .eq("id", positionId)

  if (updateError) {
    // Best-effort rollback: remove the sale we just inserted.
    await supabase
      .from("position_sales")
      .delete()
      .eq("user_id", user.id)
      .eq("position_id", positionId)
      .eq("sold_at", soldAt)
      .eq("quantity", quantity)
      .eq("sell_price", sellPrice)
    return { error: updateError.message }
  }

  revalidatePath("/dashboard")
  revalidatePath("/positions")
  revalidatePath(`/positions/${positionId}`)
  return { success: true }
}

/**
 * Cancels a sale: deletes the row and restores the quantity on the parent
 * position. Use only to fix a saisie mistake.
 */
export async function deleteSale(saleId: string): Promise<ActionResult> {
  const { user, supabase } = await requireUser()

  const { data: sale, error: fetchError } = await supabase
    .from("position_sales")
    .select("position_id, quantity")
    .eq("id", saleId)
    .eq("user_id", user.id)
    .maybeSingle()

  if (fetchError) {
    return { error: fetchError.message }
  }
  if (!sale) {
    return { error: "Vente introuvable." }
  }

  const { data: position, error: positionError } = await supabase
    .from("positions")
    .select("quantity")
    .eq("id", sale.position_id)
    .maybeSingle()

  if (positionError) {
    return { error: positionError.message }
  }

  const { error: deleteError } = await supabase
    .from("position_sales")
    .delete()
    .eq("id", saleId)

  if (deleteError) {
    return { error: deleteError.message }
  }

  if (position) {
    await supabase
      .from("positions")
      .update({
        quantity: Number(position.quantity) + Number(sale.quantity),
      })
      .eq("id", sale.position_id)
  }

  revalidatePath("/dashboard")
  revalidatePath("/positions")
  revalidatePath(`/positions/${sale.position_id}`)
  return { success: true }
}
