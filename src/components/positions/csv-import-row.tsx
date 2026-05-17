"use client"

import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  IMPORT_FIELDS,
  type AnalyzedRow,
  type ImportField,
  type ImportRowValues,
} from "@/features/positions/import"

/** Grid template shared by the review header and every editable row. */
export const IMPORT_GRID =
  "grid grid-cols-[1fr_1fr_1fr_0.8fr_1.6fr_1.3fr_auto] gap-2"

interface CsvImportRowProps {
  row: AnalyzedRow
  onChange: (id: string, values: ImportRowValues) => void
  onDelete: (id: string) => void
}

/** One editable row of the CSV import review. */
export function CsvImportRow({ row, onChange, onDelete }: CsvImportRowProps) {
  function handleCell(field: ImportField, value: string) {
    onChange(row.id, { ...row.values, [field]: value })
  }

  const tone = row.error
    ? "border-destructive/50 bg-destructive/5"
    : row.isDuplicate
      ? "opacity-60"
      : "border-transparent"

  return (
    <div className={`rounded-md border p-2 ${tone}`}>
      <div className={IMPORT_GRID}>
        {IMPORT_FIELDS.map((def) => (
          <Input
            key={def.field}
            className="h-8"
            value={row.values[def.field]}
            placeholder={def.label}
            onChange={(event) => handleCell(def.field, event.target.value)}
          />
        ))}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => onDelete(row.id)}
          aria-label="Supprimer la ligne"
        >
          <X className="size-4" />
        </Button>
      </div>
      {row.error ? (
        <p className="text-destructive mt-1 text-xs">{row.error}</p>
      ) : row.isDuplicate ? (
        <p className="text-muted-foreground mt-1 text-xs">
          Doublon — position déjà enregistrée, sera ignorée.
        </p>
      ) : null}
    </div>
  )
}
