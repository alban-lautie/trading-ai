"use server"

import { revalidatePath } from "next/cache"

import { requireUser } from "@/features/auth"
import type { ActionResult } from "@/features/positions/actions"
import { getQuotesWithFallback } from "@/features/quotes/queries"
import { watchlistSchema } from "@/features/watchlist/schema"

function parseForm(formData: FormData) {
  return watchlistSchema.safeParse({
    symbol: formData.get("symbol"),
    name: formData.get("name") ?? undefined,
    currency: formData.get("currency") || "USD",
    tradingStyle: formData.get("tradingStyle") ?? undefined,
    targetGainPercent: formData.get("targetGainPercent") ?? undefined,
    notes: formData.get("notes") ?? undefined,
  })
}

/** Rounds a value to two decimals. */
function round2(value: number): number {
  return Math.round(value * 100) / 100
}

/** Adds a stock to the current user's watchlist. */
export async function createWatchlistItem(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const parsed = parseForm(formData)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const { user, supabase } = await requireUser()
  const values = parsed.data

  const { error } = await supabase.from("watchlist").insert({
    user_id: user.id,
    symbol: values.symbol,
    name: values.name || null,
    currency: values.currency,
    trading_style: values.tradingStyle,
    target_gain_percent: values.targetGainPercent ?? null,
    notes: values.notes || null,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/watchlist")
  return { success: true }
}

/** Updates a watched stock owned by the current user. */
export async function updateWatchlistItem(
  itemId: string,
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
    .from("watchlist")
    .update({
      symbol: values.symbol,
      name: values.name || null,
      currency: values.currency,
      trading_style: values.tradingStyle,
      target_gain_percent: values.targetGainPercent ?? null,
      notes: values.notes || null,
    })
    .eq("id", itemId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/watchlist")
  return { success: true }
}

/** Removes a watched stock owned by the current user. */
export async function deleteWatchlistItem(
  itemId: string
): Promise<ActionResult> {
  const { supabase } = await requireUser()

  const { error } = await supabase.from("watchlist").delete().eq("id", itemId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/watchlist")
  return { success: true }
}

/**
 * Arms or disarms the Telegram alert that fires when the quote reaches the
 * recommended entry price of a watched stock.
 */
export async function setEntryAlert(
  itemId: string,
  enabled: boolean
): Promise<ActionResult> {
  const { user, supabase } = await requireUser()

  const { data: item, error: itemError } = await supabase
    .from("watchlist")
    .select("id, symbol, recommended_entry_price")
    .eq("id", itemId)
    .eq("user_id", user.id)
    .maybeSingle()

  if (itemError) {
    return { error: itemError.message }
  }
  if (!item) {
    return { error: "Action introuvable." }
  }

  // Clear any alert previously armed for this watched stock.
  const { error: deleteError } = await supabase
    .from("alerts")
    .delete()
    .eq("watchlist_id", itemId)

  if (deleteError) {
    return { error: deleteError.message }
  }

  if (enabled) {
    if (item.recommended_entry_price === null) {
      return { error: "Aucun prix d'entrée recommandé pour le moment." }
    }
    const threshold = round2(Number(item.recommended_entry_price))
    const { quotes } = await getQuotesWithFallback([item.symbol])
    const currentPrice = quotes.get(item.symbol.toUpperCase())?.price ?? null
    const direction: "price_above" | "price_below" =
      currentPrice !== null && threshold > currentPrice
        ? "price_above"
        : "price_below"

    const { error } = await supabase.from("alerts").insert({
      user_id: user.id,
      watchlist_id: itemId,
      symbol: item.symbol,
      type: direction,
      threshold,
      is_active: true,
    })

    if (error) {
      return { error: error.message }
    }
  }

  revalidatePath("/watchlist")
  return { success: true }
}
