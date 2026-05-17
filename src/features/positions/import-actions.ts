"use server"

import { revalidatePath } from "next/cache"

import { requireUser } from "@/features/auth"
import {
  parsePositionsCsv,
  positionKey,
  type CsvImportError,
} from "@/features/positions/import"

type AuthedClient = Awaited<ReturnType<typeof requireUser>>["supabase"]

export interface CsvPreviewRow {
  line: number
  symbol: string
  quantity: number
  averagePrice: number
  currency: string
}

export interface CsvPreviewResult {
  error?: string
  /** Rows that will be created. */
  valid?: CsvPreviewRow[]
  /** Rows skipped: the position already exists or repeats within the file. */
  duplicates?: CsvPreviewRow[]
  /** Lines that could not be parsed or validated. */
  errors?: CsvImportError[]
}

export interface CsvImportActionResult {
  error?: string
  imported?: number
  skipped?: number
}

/** Loads the duplicate-detection keys of the user's existing positions. */
async function loadExistingKeys(
  supabase: AuthedClient,
  userId: string
): Promise<Set<string>> {
  const { data } = await supabase
    .from("positions")
    .select("symbol, quantity, average_price")
    .eq("user_id", userId)

  return new Set(
    (data ?? []).map((position) =>
      positionKey(
        position.symbol,
        Number(position.quantity),
        Number(position.average_price)
      )
    )
  )
}

/**
 * Parses an uploaded CSV and reports what an import would do, without writing
 * anything: the rows to create, the duplicates skipped and the parse errors.
 */
export async function previewPositionsCsv(
  text: string
): Promise<CsvPreviewResult> {
  const { user, supabase } = await requireUser()
  const { rows, errors } = parsePositionsCsv(text)
  const existing = await loadExistingKeys(supabase, user.id)

  const seen = new Set<string>()
  const valid: CsvPreviewRow[] = []
  const duplicates: CsvPreviewRow[] = []

  for (const row of rows) {
    const preview: CsvPreviewRow = {
      line: row.line,
      symbol: row.data.symbol,
      quantity: row.data.quantity,
      averagePrice: row.data.averagePrice,
      currency: row.data.currency,
    }
    const key = positionKey(
      row.data.symbol,
      row.data.quantity,
      row.data.averagePrice
    )
    if (existing.has(key) || seen.has(key)) {
      duplicates.push(preview)
    } else {
      seen.add(key)
      valid.push(preview)
    }
  }

  return { valid, duplicates, errors }
}

/**
 * Imports the positions from a CSV, skipping any row whose position already
 * exists or repeats earlier in the file.
 */
export async function importPositionsCsv(
  text: string
): Promise<CsvImportActionResult> {
  const { user, supabase } = await requireUser()
  const { rows } = parsePositionsCsv(text)
  const existing = await loadExistingKeys(supabase, user.id)
  const today = new Date().toISOString().slice(0, 10)

  const seen = new Set<string>()
  const payload = []
  let skipped = 0

  for (const { data } of rows) {
    const key = positionKey(data.symbol, data.quantity, data.averagePrice)
    if (existing.has(key) || seen.has(key)) {
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
