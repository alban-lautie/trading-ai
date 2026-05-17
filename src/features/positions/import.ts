import type { z } from "zod"

import { positionSchema } from "@/features/positions/schema"
import { parseCsv } from "@/lib/csv"

/**
 * CSV import of positions.
 *
 * Parsing and validation are pure functions so both the preview and the
 * import server action share the exact same logic.
 */

/** A position row validated from a CSV file, ready to insert. */
export type CsvPositionData = z.output<typeof positionSchema>

export interface CsvImportError {
  /** 1-based line number in the file. */
  line: number
  message: string
}

export interface CsvParsedRow {
  line: number
  data: CsvPositionData
}

export interface CsvParseResult {
  rows: CsvParsedRow[]
  errors: CsvImportError[]
}

/** Columns the importer reads; `symbol`, `quantity`, `average_price` required. */
export const CSV_COLUMNS = [
  "symbol",
  "quantity",
  "average_price",
  "currency",
  "name",
  "opened_at",
] as const

const REQUIRED_COLUMNS = ["symbol", "quantity", "average_price"]
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/** Stable key identifying a position lot, for duplicate detection. */
export function positionKey(
  symbol: string,
  quantity: number,
  averagePrice: number
): string {
  return `${symbol.trim().toUpperCase()}|${quantity}|${averagePrice}`
}

/** Parses and validates a CSV file into position rows and per-line errors. */
export function parsePositionsCsv(text: string): CsvParseResult {
  const grid = parseCsv(text)
  if (grid.length === 0) {
    return {
      rows: [],
      errors: [{ line: 1, message: "Fichier vide ou illisible." }],
    }
  }

  const header = grid[0].map((cell) => cell.trim().toLowerCase())
  const missingColumns = REQUIRED_COLUMNS.filter(
    (column) => !header.includes(column)
  )
  if (missingColumns.length > 0) {
    return {
      rows: [],
      errors: [
        {
          line: 1,
          message: `Colonne(s) obligatoire(s) manquante(s) : ${missingColumns.join(", ")}.`,
        },
      ],
    }
  }

  const rows: CsvParsedRow[] = []
  const errors: CsvImportError[] = []

  for (let i = 1; i < grid.length; i += 1) {
    const line = i + 1
    const cells = grid[i]
    if (cells.every((cell) => cell.trim() === "")) continue

    const record: Record<string, string> = {}
    header.forEach((column, index) => {
      record[column] = (cells[index] ?? "").trim()
    })

    const missing = REQUIRED_COLUMNS.filter((column) => record[column] === "")
    if (missing.length > 0) {
      errors.push({
        line,
        message: `Valeur manquante : ${missing.join(", ")}.`,
      })
      continue
    }

    if (record.opened_at && !DATE_PATTERN.test(record.opened_at)) {
      errors.push({
        line,
        message: "Date d'achat invalide (format attendu AAAA-MM-JJ).",
      })
      continue
    }

    const parsed = positionSchema.safeParse({
      symbol: record.symbol,
      quantity: record.quantity,
      averagePrice: record.average_price,
      currency: record.currency || undefined,
      name: record.name || undefined,
      openedAt: record.opened_at || undefined,
    })
    if (!parsed.success) {
      errors.push({
        line,
        message: parsed.error.issues[0]?.message ?? "Ligne invalide.",
      })
      continue
    }

    rows.push({ line, data: parsed.data })
  }

  return { rows, errors }
}
