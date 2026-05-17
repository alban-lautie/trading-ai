"use client"

import { useMemo, useRef, useState, useTransition } from "react"
import { toast } from "sonner"

import { CsvColumnMapping } from "@/components/positions/csv-column-mapping"
import { CsvImportReview } from "@/components/positions/csv-import-review"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { importPositions } from "@/features/positions/import-actions"
import {
  analyzeImportRows,
  guessColumnMapping,
  IMPORT_FIELDS,
  type ColumnMapping,
  type ImportRowValues,
} from "@/features/positions/import"
import { parseCsv } from "@/lib/csv"

interface EditableRow {
  id: string
  values: ImportRowValues
}

interface CsvImportDialogProps {
  trigger: React.ReactNode
  /** Duplicate-detection keys of the user's existing positions. */
  existingKeys: string[]
}

/** Two-step dialog to import positions from a broker CSV export. */
export function CsvImportDialog({ trigger, existingKeys }: CsvImportDialogProps) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<"map" | "review">("map")
  const [headers, setHeaders] = useState<string[]>([])
  const [dataRows, setDataRows] = useState<string[][]>([])
  const [mapping, setMapping] = useState<ColumnMapping | null>(null)
  const [rows, setRows] = useState<EditableRow[]>([])
  const [isImporting, startImport] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  const keySet = useMemo(() => new Set(existingKeys), [existingKeys])

  function reset() {
    setStep("map")
    setHeaders([])
    setDataRows([])
    setMapping(null)
    setRows([])
    if (inputRef.current) inputRef.current.value = ""
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) reset()
  }

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    const grid = parseCsv(await file.text())
    if (grid.length < 2) {
      toast.error("Le fichier doit contenir un en-tête et au moins une ligne.")
      reset()
      return
    }

    const fileHeaders = grid[0].map((cell) => cell.trim())
    const body = grid
      .slice(1)
      .filter((cells) => cells.some((cell) => cell.trim() !== ""))
    setHeaders(fileHeaders)
    setDataRows(body)
    setMapping(guessColumnMapping(fileHeaders))
    setStep("map")
  }

  function handleContinue() {
    if (!mapping) return
    const built: EditableRow[] = dataRows.map((cells) => {
      const values = {} as ImportRowValues
      for (const def of IMPORT_FIELDS) {
        const index = mapping[def.field]
        values[def.field] =
          index === null ? "" : (cells[index] ?? "").trim()
      }
      return { id: crypto.randomUUID(), values }
    })
    setRows(built)
    setStep("review")
  }

  function handleImport() {
    const importable = analyzeImportRows(rows, keySet)
      .filter((row) => !row.error && !row.isDuplicate)
      .map((row) => row.values)

    if (importable.length === 0) {
      toast.error("Aucune position valide à importer.")
      return
    }

    startImport(async () => {
      const result = await importPositions(importable)
      if (result.error) {
        toast.error(result.error)
        return
      }
      const skipped = result.skipped
        ? `, ${result.skipped} doublon(s) ignoré(s)`
        : ""
      toast.success(`${result.imported} position(s) importée(s)${skipped}`)
      handleOpenChange(false)
    })
  }

  const hasFile = headers.length > 0
  const requiredMapped =
    mapping !== null &&
    IMPORT_FIELDS.filter((def) => def.required).every(
      (def) => mapping[def.field] !== null
    )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className={step === "review" ? "sm:max-w-4xl" : undefined}>
        <DialogHeader>
          <DialogTitle>Importer des positions</DialogTitle>
          <DialogDescription>
            {step === "map"
              ? "Choisissez le fichier CSV, puis associez ses colonnes."
              : "Corrigez les lignes en erreur ou supprimez-les avant l'import."}
          </DialogDescription>
        </DialogHeader>

        {step === "map" ? (
          <div className="grid gap-4">
            <Input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFile}
            />
            {hasFile && mapping ? (
              <CsvColumnMapping
                headers={headers}
                mapping={mapping}
                onChange={setMapping}
              />
            ) : null}
          </div>
        ) : (
          <CsvImportReview
            rows={rows}
            existingKeys={keySet}
            onChange={setRows}
          />
        )}

        <DialogFooter>
          {step === "map" ? (
            <Button
              onClick={handleContinue}
              disabled={!hasFile || !requiredMapped}
            >
              Continuer
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep("map")}>
                Retour
              </Button>
              <Button onClick={handleImport} disabled={isImporting}>
                {isImporting ? "Import en cours…" : "Importer"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
