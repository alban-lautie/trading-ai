/**
 * Minimal CSV parser.
 *
 * Handles quoted fields, escaped quotes (`""`), `\r\n` / `\r` line endings and
 * a leading UTF-8 BOM. The delimiter is auto-detected from the first line so
 * both comma and semicolon files (common in French Excel exports) are read.
 */

function detectDelimiter(firstLine: string): "," | ";" {
  const semicolons = (firstLine.match(/;/g) ?? []).length
  const commas = (firstLine.match(/,/g) ?? []).length
  return semicolons > commas ? ";" : ","
}

/** Parses CSV text into a grid of rows. Empty input yields an empty grid. */
export function parseCsv(text: string): string[][] {
  const normalized = text
    .replace(/^﻿/, "")
    .replace(/\r\n?/g, "\n")
  if (normalized.trim() === "") return []

  const newline = normalized.indexOf("\n")
  const firstLine = newline === -1 ? normalized : normalized.slice(0, newline)
  const delimiter = detectDelimiter(firstLine)

  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let inQuotes = false

  for (let i = 0; i < normalized.length; i += 1) {
    const char = normalized[i]

    if (inQuotes) {
      if (char === '"') {
        if (normalized[i + 1] === '"') {
          field += '"'
          i += 1
        } else {
          inQuotes = false
        }
      } else {
        field += char
      }
      continue
    }

    if (char === '"') {
      inQuotes = true
    } else if (char === delimiter) {
      row.push(field)
      field = ""
    } else if (char === "\n") {
      row.push(field)
      rows.push(row)
      row = []
      field = ""
    } else {
      field += char
    }
  }

  if (field !== "" || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows
}
