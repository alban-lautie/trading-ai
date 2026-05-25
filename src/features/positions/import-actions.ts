"use server"

import { revalidatePath } from "next/cache"

import { requireUser } from "@/features/auth"
import {
  positionKey,
  validateImportRow,
  type ImportRowValues,
} from "@/features/positions/import"
import type { PositionInsert } from "@/lib/types"

export interface ImportPositionsResult {
  error?: string
  imported?: number
  skipped?: number
}

/**
 * Imports the given position rows. Each row is re-validated server-side, and
 * rows whose position already exists or repeats earlier in the batch are
 * skipped.
 */
export async function importPositions(
  rows: ImportRowValues[]
): Promise<ImportPositionsResult> {
  if (rows.length === 0) {
    return { error: "Aucune position à importer." }
  }

  const { user, supabase } = await requireUser()

  const { data: existing } = await supabase
    .from("positions")
    .select("symbol, quantity, average_price")
    .eq("user_id", user.id)
  const existingKeys = new Set(
    (existing ?? []).map((position) =>
      positionKey(
        position.symbol,
        Number(position.quantity),
        Number(position.average_price)
      )
    )
  )

  const today = new Date().toISOString().slice(0, 10)
  const seen = new Set<string>()
  const payload: PositionInsert[] = []
  let skipped = 0

  for (const row of rows) {
    const { data } = validateImportRow(row)
    if (!data) {
      skipped += 1
      continue
    }
    const key = positionKey(data.symbol, data.quantity, data.averagePrice)
    if (existingKeys.has(key) || seen.has(key)) {
      skipped += 1
      continue
    }
    seen.add(key)
    payload.push({
      user_id: user.id,
      symbol: data.symbol,
      name: data.name || null,
      quantity: data.quantity,
      average_price: data.averagePrice,
      currency: data.currency,
      opened_at: data.openedAt || today,
      objective: data.objective,
      horizon: data.horizon,
      risk_tolerance: data.riskTolerance,
      trading_style: data.tradingStyle,
      target_gain_percent: data.targetGainPercent ?? null,
      notes: data.notes || null,
    })
  }

  if (payload.length === 0) {
    return { imported: 0, skipped }
  }

  const { error } = await supabase.from("positions").insert(payload)
  if (error) {
    return { error: error.message }
  }

  revalidatePath("/dashboard")
  revalidatePath("/positions")
  return { imported: payload.length, skipped }
}
