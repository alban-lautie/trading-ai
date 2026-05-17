"use client"

import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  IMPORT_FIELDS,
  type ColumnMapping,
  type ImportField,
} from "@/features/positions/import"

/** Sentinel select value for an unmapped field. */
const NONE = "none"

interface CsvColumnMappingProps {
  headers: string[]
  mapping: ColumnMapping
  onChange: (mapping: ColumnMapping) => void
}

/** Maps each app field to a column of the uploaded CSV file. */
export function CsvColumnMapping({
  headers,
  mapping,
  onChange,
}: CsvColumnMappingProps) {
  function handleSelect(field: ImportField, value: string) {
    onChange({
      ...mapping,
      [field]: value === NONE ? null : Number(value),
    })
  }

  return (
    <div className="grid gap-3">
      <p className="text-muted-foreground text-sm">
        Associez chaque information à une colonne du fichier. Les champs
        marqués d&apos;un astérisque sont obligatoires.
      </p>
      {IMPORT_FIELDS.map((def) => (
        <div
          key={def.field}
          className="grid grid-cols-[1fr_1.4fr] items-center gap-3"
        >
          <Label>
            {def.label}
            {def.required ? <span className="text-destructive"> *</span> : null}
          </Label>
          <Select
            value={
              mapping[def.field] === null
                ? NONE
                : String(mapping[def.field])
            }
            onValueChange={(value) => handleSelect(def.field, value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choisir une colonne" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>— Aucune —</SelectItem>
              {headers.map((header, index) => (
                <SelectItem key={`${index}-${header}`} value={String(index)}>
                  {header || `Colonne ${index + 1}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}
    </div>
  )
}
