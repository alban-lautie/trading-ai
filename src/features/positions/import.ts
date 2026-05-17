import type { z } from "zod"

import { positionSchema } from "@/features/positions/schema"

/**
 * CSV import of positions.
 *
 * Brokers all export different column layouts, so the importer maps each app
 * field to a CSV column. Parsing and validation are pure functions shared by
 * the import dialog (live preview / editing) and the import server action.
 */

/** A position validated from an import row, ready to insert. */
export type CsvPositionData = z.output<typeof positionSchema>

/** Application field a CSV column can be mapped to. */
export type ImportField =
  | "symbol"
  | "quantity"
  | "averagePrice"
  | "currency"
  | "name"
  | "openedAt"

interface ImportFieldDef {
  field: ImportField
  label: string
  required: boolean
  /** Accent-free, lowercased header aliases used to auto-detect the column. */
  aliases: string[]
}

/** App fields, in display order; the first three are required. */
export const IMPORT_FIELDS: readonly ImportFieldDef[] = [
  {
    field: "symbol",
    label: "Symbole",
    required: true,
    aliases: ["symbol", "ticker", "symbole", "valeur", "code", "instrument", "mnemo"],
  },
  {
    field: "quantity",
    label: "Quantité",
    required: true,
    aliases: ["quantity", "qty", "quantite", "qte", "shares", "nombre", "parts", "volume", "nb"],
  },
  {
    field: "averagePrice",
    label: "Prix d'achat moyen",
    required: true,
    aliases: [
      "average_price",
      "averageprice",
      "price",
      "prix",
      "cost",
      "cout",
      "pru",
      "prix de revient",
      "prix d'achat",
      "prix unitaire",
      "cours d'achat",
      "purchase price",
      "avg cost",
      "cost basis",
    ],
  },
  {
    field: "currency",
    label: "Devise",
    required: false,
    aliases: ["currency", "devise", "ccy", "monnaie"],
  },
  {
    field: "name",
    label: "Nom",
    required: false,
    aliases: ["name", "nom", "libelle", "description", "label", "company", "designation"],
  },
  {
    field: "openedAt",
    label: "Date d'achat",
    required: false,
    aliases: ["opened_at", "date", "date d'achat", "purchase date", "trade date", "buy date", "date achat"],
  },
]

/** A CSV column index per app field, or `null` when unmapped. */
export type ColumnMapping = Record<ImportField, number | null>

/** Raw, editable string values of one import row, keyed by app field. */
export type ImportRowValues = Record<ImportField, string>

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
}

/** Guesses, for each app field, the CSV column index that matches it. */
export function guessColumnMapping(headers: string[]): ColumnMapping {
  const normalized = headers.map(normalizeHeader)
  const mapping = {} as ColumnMapping

  for (const def of IMPORT_FIELDS) {
    let index = normalized.findIndex((header) => def.aliases.includes(header))
    if (index === -1) {
      index = normalized.findIndex(
        (header) =>
          header !== "" && def.aliases.some((alias) => header.includes(alias))
      )
    }
    mapping[def.field] = index === -1 ? null : index
  }

  return mapping
}

/** Normalizes a number written with spaces or a decimal comma. */
function normalizeNumber(value: string): string {
  const cleaned = value.replace(/\s/g, "")
  if (cleaned.includes(",") && cleaned.includes(".")) {
    return cleaned.replace(/,/g, "")
  }
  return cleaned.replace(",", ".")
}

export interface RowValidation {
  data: CsvPositionData | null
  error: string | null
}

/** Validates one row's raw values against the position schema. */
export function validateImportRow(values: ImportRowValues): RowValidation {
  const symbol = values.symbol.trim()
  const quantity = values.quantity.trim()
  const averagePrice = values.averagePrice.trim()
  const openedAt = values.openedAt.trim()

  const missing: string[] = []
  if (!symbol) missing.push("symbole")
  if (!quantity) missing.push("quantité")
  if (!averagePrice) missing.push("prix d'achat")
  if (missing.length > 0) {
    return { data: null, error: `Valeur manquante : ${missing.join(", ")}.` }
  }

  if (openedAt && !DATE_PATTERN.test(openedAt)) {
    return { data: null, error: "Date d'achat invalide (format AAAA-MM-JJ)." }
  }

  const parsed = positionSchema.safeParse({
    symbol,
    quantity: normalizeNumber(quantity),
    averagePrice: normalizeNumber(averagePrice),
    currency: values.currency.trim() || undefined,
    name: values.name.trim() || undefined,
    openedAt: openedAt || undefined,
  })
  if (!parsed.success) {
    return {
      data: null,
      error: parsed.error.issues[0]?.message ?? "Ligne invalide.",
    }
  }

  return { data: parsed.data, error: null }
}

/** Stable key identifying a position lot, for duplicate detection. */
export function positionKey(
  symbol: string,
  quantity: number,
  averagePrice: number
): string {
  return `${symbol.trim().toUpperCase()}|${quantity}|${averagePrice}`
}

export interface AnalyzedRow {
  id: string
  values: ImportRowValues
  /** Validation error, or `null` when the row is valid. */
  error: string | null
  /** True when the position already exists or repeats earlier in the file. */
  isDuplicate: boolean
}

/**
 * Validates every row and flags the duplicates, against both the existing
 * positions and the earlier rows of the same file.
 */
export function analyzeImportRows(
  rows: ReadonlyArray<{ id: string; values: ImportRowValues }>,
  existingKeys: ReadonlySet<string>
): AnalyzedRow[] {
  const seen = new Set<string>()

  return rows.map((row) => {
    const { data, error } = validateImportRow(row.values)
    let isDuplicate = false

    if (data) {
      const key = positionKey(data.symbol, data.quantity, data.averagePrice)
      isDuplicate = existingKeys.has(key) || seen.has(key)
      if (!isDuplicate) seen.add(key)
    }

    return { id: row.id, values: row.values, error, isDuplicate }
  })
}
