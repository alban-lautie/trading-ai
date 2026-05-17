"use client"

import { useMemo } from "react"

import { CsvImportRow, IMPORT_GRID } from "@/components/positions/csv-import-row"
import {
  analyzeImportRows,
  IMPORT_FIELDS,
  type ImportRowValues,
} from "@/features/positions/import"

interface EditableRow {
  id: string
  values: ImportRowValues
}

interface CsvImportReviewProps {
  rows: EditableRow[]
  existingKeys: Set<string>
  onChange: (rows: EditableRow[]) => void
}

/** Editable review table of the rows parsed from the CSV file. */
export function CsvImportReview({
  rows,
  existingKeys,
  onChange,
}: CsvImportReviewProps) {
  const analyzed = useMemo(
    () => analyzeImportRows(rows, existingKeys),
    [rows, existingKeys]
  )

  const valid = analyzed.filter(
    (row) => !row.error && !row.isDuplicate
  ).length
  const duplicates = analyzed.filter((row) => row.isDuplicate).length
  const errors = analyzed.filter((row) => row.error).length

  function handleRowChange(id: string, values: ImportRowValues) {
    onChange(rows.map((row) => (row.id === id ? { id, values } : row)))
  }

  function handleDelete(id: string) {
    onChange(rows.filter((row) => row.id !== id))
  }

  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Toutes les lignes ont été retirées.
      </p>
    )
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <span className="font-medium text-emerald-600">
          {valid} à importer
        </span>
        {duplicates > 0 ? (
          <span className="text-muted-foreground">
            {duplicates} doublon(s) ignoré(s)
          </span>
        ) : null}
        {errors > 0 ? (
          <span className="text-destructive">{errors} ligne(s) en erreur</span>
        ) : null}
      </div>

      <div className={`${IMPORT_GRID} px-2 text-xs font-medium text-muted-foreground`}>
        {IMPORT_FIELDS.map((def) => (
          <span key={def.field}>{def.label}</span>
        ))}
        <span />
      </div>

      <div className="max-h-[55vh] space-y-1.5 overflow-y-auto">
        {analyzed.map((row) => (
          <CsvImportRow
            key={row.id}
            row={row}
            onChange={handleRowChange}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  )
}
